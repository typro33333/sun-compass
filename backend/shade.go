package main

import (
	"context"
	"encoding/json"
	"golang.org/x/sync/errgroup"
	"math"
	"net/http"
	"runtime"
)

// Panel vertices use world coordinates. Convex occluder planes use house-local
// coordinates, matching the scene geometry sent by the arrangement editor.
type ExposureScene struct {
	House   float64         `json:"house"`
	Bearing float64         `json:"bearing"`
	Tilt    float64         `json:"tilt"`
	Panels  [][4][3]float64 `json:"panels"`
	Volumes [][][4]float64  `json:"volumes"`
}
type PanelExposure struct {
	Cells       []bool  `json:"cells"`
	LitFraction float64 `json:"litFraction"`
}
type ExposureResult struct {
	Incidence float64         `json:"incidence"`
	Panels    []PanelExposure `json:"panels"`
}

func (s ExposureScene) Validate() bool {
	if len(s.Panels) < 1 || len(s.Panels) > 30 || len(s.Volumes) > 256 || math.Abs(s.House) > 360 || math.Abs(s.Bearing) > 360 || s.Tilt < 0 || s.Tilt > 90 {
		return false
	}
	for _, p := range s.Panels {
		for _, v := range p {
			for _, n := range v {
				if math.Abs(n) > 1e4 {
					return false
				}
			}
		}
	}
	for _, v := range s.Volumes {
		if len(v) < 4 || len(v) > 48 {
			return false
		}
		for _, p := range v {
			for _, n := range p {
				if math.Abs(n) > 1e5 {
					return false
				}
			}
		}
	}
	return true
}
func sunVector(bearing, alt float64) [3]float64 {
	a, h := bearing*radians, alt*radians
	return [3]float64{math.Sin(a) * math.Cos(h), math.Sin(h), -math.Cos(a) * math.Cos(h)}
}
func houseLocal(v [3]float64, c, s float64) [3]float64 {
	return [3]float64{c*v[0] - s*v[2], v[1], s*v[0] + c*v[2]}
}

type rayPlane struct {
	p     [4]float64
	slope float64
}

func obstructed(origin [3]float64, volumes [][]rayPlane) bool {
	for _, v := range volumes {
		near, far := .0001, math.Inf(1)
		for _, plane := range v {
			p, k := plane.p, plane.slope
			distance := p[3] - p[0]*origin[0] - p[1]*origin[1] - p[2]*origin[2]
			if math.Abs(k) < 1e-10 {
				if distance < 0 {
					far = -1
					break
				}
			} else if k > 0 {
				far = math.Min(far, distance/k)
			} else {
				near = math.Max(near, distance/k)
			}
			if far < near {
				break
			}
		}
		if far >= near {
			return true
		}
	}
	return false
}

// A ray from any cell can never enter a volume if the whole panel
// starts outside one half-space and the ray moves farther outside it.
func mayShade(origin, u, v [3]float64, volume []rayPlane) bool {
	for _, plane := range volume {
		if plane.slope < 0 {
			continue
		}
		p := plane.p
		minimum := p[0]*origin[0] + p[1]*origin[1] + p[2]*origin[2] +
			math.Min(0, p[0]*u[0]+p[1]*u[1]+p[2]*u[2]) +
			math.Min(0, p[0]*v[0]+p[1]*v[1]+p[2]*v[2])
		if minimum > p[3]+1e-9 {
			return false
		}
	}
	return true
}
func (s ExposureScene) Exposure(sun SunPosition, grid int) ExposureResult {
	out, _ := s.expose(context.Background(), sun, grid, false)
	return out
}
func (s ExposureScene) expose(ctx context.Context, sun SunPosition, grid int, parallel bool) (ExposureResult, error) {
	ray, normal := sunVector(sun.Azimuth, sun.Altitude), sunVector(s.Bearing, 90-s.Tilt)
	out := ExposureResult{Panels: make([]PanelExposure, len(s.Panels))}
	if sun.Altitude > 0 {
		out.Incidence = math.Max(0, normal[0]*ray[0]+normal[1]*ray[1]+normal[2]*ray[2])
	}
	sin, cos := math.Sincos(-s.House * radians)
	ray = houseLocal(ray, cos, sin)
	var shadow [][]rayPlane
	if out.Incidence > 1e-12 {
		for _, v := range s.Volumes {
			planes := make([]rayPlane, len(v))
			for j, p := range v {
				planes[j] = rayPlane{p, p[0]*ray[0] + p[1]*ray[1] + p[2]*ray[2]}
			}
			shadow = append(shadow, planes)
		}
	}
	panel := func(i int) {
		face := s.Panels[i]
		cells := make([]bool, grid*grid)
		count := 0
		if out.Incidence > 1e-12 {
			origin := houseLocal(face[0], cos, sin)
			u := houseLocal(face[1], cos, sin)
			v := houseLocal(face[3], cos, sin)
			for k := range origin {
				u[k] -= origin[k]
				v[k] -= origin[k]
			}
			possible := make([][]rayPlane, 0, len(shadow))
			for _, volume := range shadow {
				if mayShade(origin, u, v, volume) {
					possible = append(possible, volume)
				}
			}
			for j := range cells {
				a, b := (float64(j%grid)+.5)/float64(grid), (float64(j/grid)+.5)/float64(grid)
				var xyz [3]float64
				for k := range origin {
					xyz[k] = origin[k] + a*u[k] + b*v[k]
				}
				if !obstructed(xyz, possible) {
					cells[j] = true
					count++
				}
			}
		}
		out.Panels[i] = PanelExposure{cells, float64(count) / float64(len(cells))}
	}
	if parallel && out.Incidence > 1e-12 && len(shadow) > 0 && len(s.Panels) >= 8 {
		group, ctx := errgroup.WithContext(ctx)
		n := min(4, runtime.GOMAXPROCS(0), len(s.Panels))
		for worker := 0; worker < n; worker++ {
			group.Go(func() error {
				for i := worker; i < len(s.Panels); i += n {
					if err := ctx.Err(); err != nil {
						return err
					}
					panel(i)
				}
				return nil
			})
		}
		return out, group.Wait()
	}
	for i := range s.Panels {
		if err := ctx.Err(); err != nil {
			return out, err
		}
		panel(i)
	}
	return out, nil
}
func shade(w http.ResponseWriter, r *http.Request) {
	var q struct {
		Scene ExposureScene
		Sun   *SunPosition
	}
	if json.NewDecoder(http.MaxBytesReader(w, r.Body, 524288)).Decode(&q) != nil || !q.Scene.Validate() || q.Sun == nil || math.Abs(q.Sun.Altitude) > 90 || math.Abs(q.Sun.Azimuth) > 360 {
		http.Error(w, "Invalid shade geometry", 400)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	out, err := q.Scene.expose(r.Context(), *q.Sun, 6, true)
	if err != nil {
		return
	}
	json.NewEncoder(w).Encode(out)
}
