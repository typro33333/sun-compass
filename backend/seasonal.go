package main

import (
	"encoding/json"
	"math"
	"net/http"
	"time"
)

func seasonal(w http.ResponseWriter, r *http.Request) {
	var input struct {
		energyInput
		History struct {
			Year   int
			Months [][][2]float64
		}
	}
	if json.NewDecoder(r.Body).Decode(&input) != nil || input.Planning == nil || len(input.History.Months) != 12 || input.History.Year < 1940 || input.History.Year > 2100 {
		http.Error(w, "Invalid radiation history", 422)
		return
	}
	var avoided float64
	for m, hours := range input.History.Months {
		if len(hours) != 24 {
			http.Error(w, "Invalid monthly profile", 422)
			return
		}
		day := time.Date(input.History.Year, time.Month(m+1), 15, 0, 0, 0, 0, time.UTC)
		in := input.energyInput
		in.Start = day.Unix() - int64(math.Round(in.Location.Offset*3600))
		in.End = in.Start + 86400
		in.Hourly = hourlyWeather{}
		for ts := (in.Start/3600 + 1) * 3600; ts < in.End+3600; ts += 3600 {
			p := hours[time.Unix(ts, 0).UTC().Hour()]
			in.Hourly.Time = append(in.Hourly.Time, ts)
			in.Hourly.GTI = append(in.Hourly.GTI, &p[0])
			in.Hourly.DNI = append(in.Hourly.DNI, &p[1])
		}
		production, _, err := forecastEnergy(r.Context(), &in)
		if err != nil {
			http.Error(w, err.Error(), 422)
			return
		}
		plan, err := simulatePlanning(production.Hours, in.Start, *in.Planning)
		if err != nil {
			http.Error(w, err.Error(), 422)
			return
		}
		days := time.Date(day.Year(), day.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
		avoided += math.Max(0, in.Planning.DayKwh+in.Planning.NightKwh-plan.Grid) * float64(days)
	}
	s := input.Planning
	savings := avoided*s.Price - s.AnnualCost
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"year": input.History.Year, "annualSavings": savings, "roi": (savings*s.Years - s.Capital) / s.Capital * 100})
}
