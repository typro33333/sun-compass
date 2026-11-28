package main

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"time"
)

type roofPosition struct {
	X        float64 `json:"x"`
	Z        float64 `json:"z"`
	Rotation int     `json:"rotation"`
}
type orientation struct {
	Bearing float64 `json:"bearing"`
	Tilt    float64 `json:"tilt"`
	Score   float64 `json:"score"`
}
type recommendationInput struct {
	Date           string
	Annual, Layout bool
	Location       energyLocation
	Config         struct{ Bearing, Tilt, House, Width, Length, X, Z, Floors, Roof float64 }
	Module         struct{ Width, Length float64 }
	Outline        [][2]float64
	Positions      []roofPosition
	Volumes        [][][4]float64
}
type sunshineSample struct {
	world   [3]float64
	weight  float64
	volumes [][]rayPlane
}

func (q recommendationInput) samples(day time.Time) []sunshineSample {
	var out []sunshineSample
	c := q.Config
	sn, cs := math.Sincos(-c.House * radians)
	months := 1
	if q.Annual {
		months = 12
	}
	for m := 0; m < months; m++ {
		weight := 1.
		if q.Annual {
			day = time.Date(day.Year(), time.Month(m+1), 15, 0, 0, 0, 0, time.UTC)
			weight = float64(time.Date(day.Year(), day.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day())
		}
		for minute := 15; minute < 1440; minute += 30 {
			sun := solarPosition(day.Add(time.Duration((float64(minute)-60*q.Location.Offset)*float64(time.Minute))), q.Location.Lat, q.Location.Lon)
			if sun.Altitude <= 0 {
				continue
			}
			world := sunVector(sun.Azimuth, sun.Altitude)
			ray := houseLocal(world, cs, sn)
			s := sunshineSample{world: world, weight: weight * world[1]}
			for _, volume := range q.Volumes {
				pv := make([]rayPlane, len(volume))
				for i, p := range volume {
					pv[i] = rayPlane{p, p[0]*ray[0] + p[1]*ray[1] + p[2]*ray[2]}
				}
				s.volumes = append(s.volumes, pv)
			}
			out = append(out, s)
		}
	}
	return out
}
func (q recommendationInput) dimensions(p roofPosition) (float64, float64) {
	if p.Rotation%180 == 90 {
		return q.Module.Length, q.Module.Width
	}
	return q.Module.Width, q.Module.Length
}

// All panel rectangles share the same two axes, including landscape orientations.
func (q recommendationInput) fits(ps []roofPosition, bearing float64) bool {
	sn, cs := math.Sincos((bearing - q.Config.House) * radians)
	for i, p := range ps {
		w, d := q.dimensions(p)
		for _, u := range []float64{-w / 2, w / 2} {
			for _, v := range []float64{-d / 2, d / 2} {
				x, z := p.X+q.Config.X+cs*u-sn*v, p.Z-q.Config.Z+sn*u+cs*v
				for j, a := range q.Outline {
					b := q.Outline[(j+1)%4]
					if (b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]) < -1e-8 {
						return false
					}
				}
			}
		}
		for _, other := range ps[:i] {
			ow, od := q.dimensions(other)
			dx, dz := p.X-other.X, p.Z-other.Z
			if math.Abs(cs*dx+sn*dz) < (w+ow)/2-1e-8 && math.Abs(-sn*dx+cs*dz) < (d+od)/2-1e-8 {
				return false
			}
		}
	}
	return true
}
func (q recommendationInput) score(ctx context.Context, samples []sunshineSample, ps []roofPosition, b, t float64, grid int, clear bool) float64 {
	normal := sunVector(b, 90-t)
	sn, cs := math.Sincos((b - q.Config.House) * radians)
	st, ct := math.Sincos(t * radians)
	height := (q.Config.Floors+1)*3.2 + q.Config.Roof*3 + .35
	points := make([][3]float64, 0, len(ps)*grid*grid)
	type planeAxes struct{ origin, u, v [3]float64 }
	axes := make([]planeAxes, 0, len(ps))
	for _, p := range ps {
		w, d := q.dimensions(p)
		axes = append(axes, planeAxes{[3]float64{p.X + q.Config.X - cs*w/2 + sn*ct*d/2, height, p.Z - q.Config.Z - sn*w/2 - cs*ct*d/2}, [3]float64{cs * w, 0, sn * w}, [3]float64{-sn * ct * d, st * d, cs * ct * d}})
		for i := 0; i < grid*grid; i++ {
			u, v := ((float64(i%grid)+.5)/float64(grid)-.5)*w, ((float64(i/grid)+.5)/float64(grid)-.5)*d
			points = append(points, [3]float64{p.X + q.Config.X + cs*u - sn*ct*v, height + (v+d/2)*st, p.Z - q.Config.Z + sn*u + cs*ct*v})
		}
	}
	var total float64
	var possible [][]rayPlane
	for _, s := range samples {
		if ctx.Err() != nil {
			return 0
		}
		dot := normal[0]*s.world[0] + normal[1]*s.world[1] + normal[2]*s.world[2]
		if dot <= 0 {
			continue
		}
		lit := len(points)
		if !clear {
			for i, panel := range axes {
				possible = possible[:0]
				for _, volume := range s.volumes {
					if mayShade(panel.origin, panel.u, panel.v, volume) {
						possible = append(possible, volume)
					}
				}
				if len(possible) == 0 {
					continue
				}
				for _, p := range points[i*grid*grid : (i+1)*grid*grid] {
					if obstructed(p, possible) {
						lit--
					}
				}
			}
		}
		total += dot * s.weight * float64(lit) / float64(len(points))
	}
	return total
}
func recommend(w http.ResponseWriter, r *http.Request) {
	var q recommendationInput
	if json.NewDecoder(http.MaxBytesReader(w, r.Body, 524288)).Decode(&q) != nil {
		http.Error(w, "Invalid scene", 400)
		return
	}
	day, err := time.Parse("2006-01-02", q.Date)
	c := q.Config
	scene := ExposureScene{House: c.House, Bearing: c.Bearing, Tilt: c.Tilt, Volumes: q.Volumes, Panels: make([][4][3]float64, len(q.Positions))}
	if err != nil || !scene.Validate() || !q.Location.valid() || len(q.Outline) != 4 || c.Width <= 0 || c.Width > 60 || c.Length <= 0 || c.Length > 60 || q.Module.Width <= 0 || q.Module.Length <= 0 || !q.fits(q.Positions, c.Bearing) {
		http.Error(w, "Invalid recommendation geometry", 400)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 75*time.Second)
	defer cancel()
	samples := q.samples(day)
	ps := q.Positions
	baseline := q.score(ctx, samples, ps, c.Bearing, c.Tilt, 6, false)
	best := orientation{c.Bearing, c.Tilt, baseline}
	candidates := []orientation{}
	seen := map[[2]float64]bool{}
	add := func(b, t float64) {
		b = wrapAngle(b)
		t = math.Max(0, math.Min(t, 90))
		k := [2]float64{b, t}
		if seen[k] || ctx.Err() != nil {
			return
		}
		seen[k] = true
		if q.fits(ps, b) {
			candidates = append(candidates, orientation{b, t, q.score(ctx, samples, ps, b, t, 2, false)})
		}
	}
	rank := func() {
		sort.SliceStable(candidates, func(i, j int) bool { return candidates[i].Score > candidates[j].Score })
	}
	add(c.Bearing, c.Tilt)
	for b := 0.; b < 360; b += 15 {
		for t := 0.; t <= 90; t += 10 {
			add(b, t)
		}
	}
	rank()
	seeds := append([]orientation{best}, candidates[:min(3, len(candidates))]...)
	for _, a := range seeds {
		for b := -10.; b <= 10; b += 5 {
			for t := -5.; t <= 5; t += 5 {
				add(a.Bearing+b, a.Tilt+t)
			}
		}
	}
	rank()
	for _, a := range candidates[:min(8, len(candidates))] {
		if score := q.score(ctx, samples, ps, a.Bearing, a.Tilt, 6, false); score > best.Score+1e-9 {
			a.Score = score
			best = a
		}
	}
	if q.Layout {
		// Compare translated groups, then improve individual positions around the best group.
		try := func(next []roofPosition) {
			if q.fits(next, best.Bearing) {
				v := q.score(ctx, samples, next, best.Bearing, best.Tilt, 6, false)
				if v > best.Score+1e-9 {
					best.Score = v
					ps = next
				}
			}
		}
		for ix := -2; ix <= 2; ix++ {
			for iz := -2; iz <= 2; iz++ {
				next := append([]roofPosition(nil), q.Positions...)
				for j := range next {
					next[j].X += float64(ix) * c.Width / 5
					next[j].Z += float64(iz) * c.Length / 5
				}
				try(next)
			}
		}
		// Compare dispersed layouts across the whole roof. Rank single-panel sites
		// cheaply, then verify complete layouts at full resolution before accepting.
		type site struct {
			position roofPosition
			score    float64
		}
		sites := []site{}
		spacing := math.Max(.5, math.Max(c.Width, c.Length)/24)
		for x := -c.Width / 2; x <= c.Width/2; x += spacing {
			if ctx.Err() != nil {
				break
			}
			for z := -c.Length / 2; z <= c.Length/2; z += spacing {
				pos := roofPosition{X: x - c.X, Z: z + c.Z}
				if q.fits([]roofPosition{pos}, best.Bearing) {
					sites = append(sites, site{pos, q.score(ctx, samples, []roofPosition{pos}, best.Bearing, best.Tilt, 2, false)})
				}
			}
		}
		sort.SliceStable(sites, func(i, j int) bool {
			if sites[i].score != sites[j].score {
				return sites[i].score > sites[j].score
			}
			return math.Hypot(sites[i].position.X, sites[i].position.Z) < math.Hypot(sites[j].position.X, sites[j].position.Z)
		})
		for _, seed := range sites[:min(8, len(sites))] {
			proposed := []roofPosition{seed.position}
			for _, site := range sites {
				if len(proposed) == len(ps) {
					break
				}
				next := append(proposed, site.position)
				if q.fits(next, best.Bearing) {
					proposed = next
				}
			}
			if len(proposed) == len(ps) {
				try(proposed)
			}
		}
		for i := range ps {
			origin := ps[i]
			single := q.score(ctx, samples, []roofPosition{origin}, best.Bearing, best.Tilt, 6, false)
			for _, step := range []float64{2, .5} {
				origin = ps[i]
				for dx := -1; dx <= 1; dx++ {
					for dz := -1; dz <= 1; dz++ {
						p := origin
						p.X += float64(dx) * step
						p.Z += float64(dz) * step
						next := append([]roofPosition(nil), ps...)
						next[i] = p
						if !q.fits(next, best.Bearing) {
							continue
						}
						v := q.score(ctx, samples, []roofPosition{p}, best.Bearing, best.Tilt, 6, false)
						if v > single+1e-9 {
							best.Score += (v - single) / float64(len(ps))
							single = v
							ps = next
						}
					}
				}
			}
		}
	}
	if ctx.Err() != nil {
		http.Error(w, "Recommendation timed out", 503)
		return
	}
	moved := 0
	for i, p := range ps {
		if math.Hypot(p.X-q.Positions[i].X, p.Z-q.Positions[i].Z) > .05 {
			moved++
		}
	}
	loss := func(score, clear float64) float64 {
		if clear == 0 {
			return 0
		}
		return 1 - score/clear
	}
	before := loss(baseline, q.score(ctx, samples, q.Positions, c.Bearing, c.Tilt, 1, true))
	after := loss(best.Score, q.score(ctx, samples, ps, best.Bearing, best.Tilt, 1, true))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"bearing": best.Bearing, "tilt": best.Tilt, "score": best.Score, "baseline": baseline, "positions": ps, "explanation": map[string]any{"beforeShade": before, "afterShade": after, "samples": len(samples), "neighbors": len(q.Volumes) > 1, "moved": moved}})
}
