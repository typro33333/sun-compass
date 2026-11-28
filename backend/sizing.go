package main

import (
	"encoding/json"
	"math"
	"net/http"
)

type sizingInput struct {
	Day, Night, Watts, YieldPerKwp, Peak float64
	Coverage                             *float64
}

func sizing(w http.ResponseWriter, r *http.Request) {
	var v sizingInput
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		http.Error(w, "Invalid sizing input", 400)
		return
	}
	coverage := 100.0
	if v.Coverage != nil {
		coverage = *v.Coverage
	}
	if v.Day < 0 || v.Night < 0 || v.Day+v.Night <= 0 || v.Day > 10000 || v.Night > 10000 || v.Watts < 100 || v.Watts > 1000 || v.YieldPerKwp < 0.1 || v.YieldPerKwp > 10 || v.Peak < 0 || v.Peak > 10000 || coverage < 0 || coverage > 100 {
		http.Error(w, "Invalid sizing input", 400)
		return
	}
	stored := v.Night * coverage / 100
	required := v.Day + stored/.9
	panels := math.Ceil(required / (v.YieldPerKwp * v.Watts / 1000))
	pv := panels * v.Watts / 1000
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"panels": panels, "pvKwp": pv, "inverterKw": math.Ceil(math.Max(pv/1.2, v.Peak)), "batteryKwh": math.Ceil(stored / (.9 * .95)), "production": pv * v.YieldPerKwp, "storedLoad": stored, "requiredEnergy": required, "gridNight": v.Night - stored, "dayOnlyPanels": math.Ceil(v.Day / (v.YieldPerKwp * v.Watts / 1000)), "peakKnown": v.Peak > 0})
}
