package main

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"time"
)

type annualInput struct {
	Year             int
	AnnualPoa, Watts float64
	Location         energyLocation
	System           energySystem
	Scene            ExposureScene
	Layouts          [][][4][3]float64
}
type annualTotal struct {
	AC            float64 `json:"acKwh"`
	DC            float64 `json:"dcKwh"`
	Shade         float64 `json:"shadeLossKwh"`
	Raw           float64 `json:"rawDcKwh"`
	ShadeFraction float64 `json:"shadeFraction"`
}

func annualEnergy(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	var in annualInput
	if json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20)).Decode(&in) != nil || in.Year < 1900 || in.Year > 2100 || in.AnnualPoa <= 0 || in.AnnualPoa > 4000 || !in.Location.valid() || len(in.Layouts) < 1 || len(in.Layouts) > 30 {
		http.Error(w, "Invalid annual scenario", 422)
		return
	}
	// Bound request cost across layouts as well as per individual scene.
	budget := 0
	for _, panels := range in.Layouts {
		in.Scene.Panels = panels
		budget += len(panels)
		if !in.Scene.Validate() || in.System.validate(in.Watts, len(panels)) != nil || budget > 60 {
			http.Error(w, "Invalid annual layout", 422)
			return
		}
	}
	type step struct {
		sun              SunPosition
		gti, dni, weight float64
	}
	var steps []step
	var norm float64
	lat, lon := in.Location.Lat, in.Location.Lon
	rad := math.Pi / 180
	for month := time.January; month <= time.December; month++ {
		weight := float64(time.Date(in.Year, month+1, 0, 0, 0, 0, 0, time.UTC).Day())
		start := time.Date(in.Year, month, 15, 0, 0, 0, 0, time.UTC).Add(-time.Duration(in.Location.Offset*3600) * time.Second)
		for hour := 0; hour < 24; hour++ {
			begin := start.Add(time.Duration(hour) * time.Hour)
			sun := solarPosition(begin.Add(30*time.Minute), lat, lon)
			height := math.Max(0, math.Sin(sun.Altitude*rad))
			// Synthetic direct/diffuse weights before projection onto panel plane.
			incidence := math.Max(0, math.Sin(sun.Altitude*rad)*math.Cos(in.Scene.Tilt*rad)+math.Cos(sun.Altitude*rad)*math.Sin(in.Scene.Tilt*rad)*math.Cos((sun.Azimuth-in.Scene.Bearing)*rad))
			dni := height * .8
			gti := dni*incidence + height*.2
			norm += gti * weight
			if gti <= 0 {
				continue
			}
			for j := 0; j < 4; j++ {
				steps = append(steps, step{solarPosition(begin.Add(time.Duration(450+900*j)*time.Second), lat, lon), gti, dni, weight * .25})
			}
		}
	}
	if norm <= 0 {
		http.Error(w, "No annual radiation", 422)
		return
	}
	scale := in.AnnualPoa * 1000 / norm
	totals := make([]annualTotal, len(in.Layouts))
	// Occluders and the sun are common to every candidate. A single exposure
	// pass per time step prepares each volume only once for the entire batch.
	scene := in.Scene
	scene.Panels = make([][4][3]float64, 0, budget)
	accumulated := make([]energyResult, len(in.Layouts))
	rows := make([]energyHour, len(in.Layouts))
	for i, layout := range in.Layouts {
		scene.Panels = append(scene.Panels, layout...)
		accumulated[i].Loss = map[string]float64{}
		rows[i] = energyHour{Duration: 1, Panels: make([]energyPanel, len(layout))}
	}
	params := energyInput{Watts: in.Watts, System: in.System}
	for _, s := range steps {
		if ctx.Err() != nil {
			http.Error(w, "Annual calculation canceled", http.StatusRequestTimeout)
			return
		}
		all := scene.Exposure(s.sun, 6)
		start := 0
		for i, layout := range in.Layouts {
			end := start + len(layout)
			exposure := ExposureResult{Incidence: all.Incidence, Panels: all.Panels[start:end]}
			integrateStep(&params, &accumulated[i], &rows[i], s.gti*scale, s.dni*scale, s.weight, exposure)
			start = end
		}
	}
	for i, total := range accumulated {
		totals[i] = annualTotal{AC: total.AC, DC: total.DC, Shade: total.Shade, Raw: total.Raw}
		if total.Raw > 0 {
			totals[i].ShadeFraction = total.Shade / total.Raw
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(totals)
}
