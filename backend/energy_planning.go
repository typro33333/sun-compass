package main

import (
	"errors"
	"math"
)

// Capacity is usable battery-side kWh. Input and output efficiencies are
// each 95%. One representative day repeats without export compensation.
type planningScenario struct {
	DayKwh, NightKwh, Capacity, Power, Price, Capital, AnnualCost, Years float64
}
type planningResult struct {
	Charged    float64 `json:"charged"`
	Discharged float64 `json:"discharged"`
	Grid       float64 `json:"grid"`
	Exported   float64 `json:"exported"`
}

func simulatePlanning(hours []energyHour, start int64, s planningScenario) (planningResult, error) {
	var daily planningResult
	if s.DayKwh < 0 || s.DayKwh > 10000 || s.NightKwh < 0 || s.NightKwh > 10000 || s.DayKwh+s.NightKwh <= 0 || s.DayKwh+s.NightKwh > 20000 || s.Capacity < 0 || s.Capacity > 10000 || s.Power < 0 || s.Power > 1000 || (s.Capacity > 0 && s.Power <= 0) || s.Price < 1 || s.Price > 1e6 || s.Capital < 1 || s.Capital > 1e13 || s.AnnualCost < 0 || s.AnnualCost > 1e12 || s.Years < 1 || s.Years > 50 || math.Trunc(s.Years) != s.Years {
		return daily, errors.New("Thông số kịch bản không hợp lệ.")
	}
	run := func(soc float64) (planningResult, float64) {
		var day planningResult
		for _, h := range hours {
			// Weather hours can cross the 06:00/18:00 boundaries in fractional zones.
			lo := float64(max(start, h.Time-3600)-start) / 3600
			hi := lo + h.Duration
			daylight := math.Max(0, math.Min(18, hi)-math.Max(6, lo))
			load := (daylight*s.DayKwh + (h.Duration-daylight)*s.NightKwh) / 12
			if surplus := h.AC - load; surplus >= 0 {
				charge := min(surplus, s.Power*h.Duration, (s.Capacity-soc)/.95)
				soc = min(s.Capacity, soc+.95*charge)
				day.Charged += charge
				day.Exported += surplus - charge
			} else {
				delivery := min(-surplus, s.Power*h.Duration, soc*.95)
				soc = max(0, soc-delivery/.95)
				day.Discharged += delivery
				day.Grid += -surplus - delivery
			}
		}
		return day, soc
	}
	// The daily SOC transform is clamp(soc+net, floor, ceiling).
	// Its stationary point is reached from the appropriate capacity boundary.
	_, fromEmpty := run(0)
	_, fromFull := run(s.Capacity)
	_, next := run(fromEmpty)
	initial := fromEmpty
	if next > fromEmpty+1e-9 {
		initial = fromFull
	}
	daily, _ = run(initial)
	return daily, nil
}
