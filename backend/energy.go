package main

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"time"
)

type energyInverter struct {
	AcKw, MaxPvKw, Efficiency, MpptMinV, MpptMaxV, MpptMaxA, OperatingV float64
	MpptCount                                                           int
}
type energySystem struct {
	Losses   map[string]float64
	Inverter energyInverter
}

var lossOrder = []string{"temperature", "wiring", "soiling", "other"}

func (s energySystem) validate(watts float64, panels int) error {
	v := s.Inverter
	if watts < 100 || watts > 1000 || panels < 1 || panels > 30 {
		return errors.New("Bố trí pin không hợp lệ.")
	}
	for _, name := range lossOrder {
		loss, ok := s.Losses[name]
		if !ok || loss < 0 || loss >= 100 {
			return errors.New("Hao hụt không hợp lệ.")
		}
	}
	if v.MpptCount < 1 || v.MpptCount > 16 || v.Efficiency <= 0 || v.Efficiency > 100 || v.AcKw <= 0 || v.AcKw > 1000 || v.MaxPvKw <= 0 || v.MaxPvKw > 1000 || v.MpptMinV <= 0 || v.MpptMaxV <= v.MpptMinV || v.MpptMaxV > 1500 || v.OperatingV <= 0 || v.OperatingV > 1500 || v.MpptMaxA <= 0 || v.MpptMaxA > 1000 {
		return errors.New("Giới hạn MPPT/hiệu suất không hợp lệ.")
	}
	if float64(panels)*watts/1000 > v.MaxPvKw+1e-9 {
		return errors.New("Công suất PV DC vượt giới hạn tiếp nhận của inverter.")
	}
	return nil
}

type energyLocation struct{ Lat, Lon, Offset float64 }

func (l energyLocation) valid() bool {
	return math.Abs(l.Lat) <= 90 && math.Abs(l.Lon) <= 180 && l.Offset >= -12 && l.Offset <= 14
}

type hourlyWeather struct {
	Time    []int64    `json:"time"`
	GTI     []*float64 `json:"global_tilted_irradiance"`
	DNI     []*float64 `json:"direct_normal_irradiance"`
	Cloud   []*float64 `json:"cloud_cover"`
	Rain    []*float64 `json:"rain"`
	Showers []*float64 `json:"showers"`
}
type energyInput struct {
	Hourly     hourlyWeather
	Start, End int64
	Watts      float64
	System     energySystem
	Location   energyLocation
	Scene      ExposureScene
	Planning   *planningScenario
}
type energyPanel struct {
	ID    int     `json:"id"`
	MPPT  int     `json:"mppt"`
	DC    float64 `json:"dcKwh"`
	AC    float64 `json:"acKwh"`
	Shade float64 `json:"shadeLossKwh"`
	Lit   float64 `json:"litFraction"`
}
type energyHour struct {
	Time     int64         `json:"time"`
	Duration float64       `json:"durationHours"`
	AC       float64       `json:"kwh"`
	DC       float64       `json:"dcKwh"`
	Clipping float64       `json:"clippingKwh"`
	MPPT     float64       `json:"mpptLossKwh"`
	Panels   []energyPanel `json:"panels"`
}
type energyResult struct {
	AC          float64            `json:"kwh"`
	DC          float64            `json:"dcKwh"`
	Raw         float64            `json:"rawDcKwh"`
	Shade       float64            `json:"shadeLossKwh"`
	Loss        map[string]float64 `json:"lossKwh"`
	MPPT        float64            `json:"mpptLossKwh"`
	Inverter    float64            `json:"inverterLossKwh"`
	Clipping    float64            `json:"clippingKwh"`
	Irradiation float64            `json:"irradiation"`
	Hours       []energyHour       `json:"hours"`
}
type weatherReserve struct {
	Kwh     float64 `json:"kwh"`
	Percent float64 `json:"percent"`
	Cloud   float64 `json:"cloudCover"`
	Rain    bool    `json:"rain"`
}

func validReading(series []*float64, i int, limit float64) (float64, bool) {
	if i >= len(series) || series[i] == nil {
		return 0, false
	}
	v := *series[i]
	return v, v >= 0 && v <= limit
}

// integrateStep apportions MPPT clipping to each contributing panel. All power
// limits apply to kW before integration, even for fractional weather intervals.
func integrateStep(in *energyInput, out *energyResult, row *energyHour, gti, dni, dt float64, exposure ExposureResult) {
	inv := in.System.Inverter
	var tracker [16]float64
	var power [30]float64
	raw := in.Watts * gti / 1e6
	beam := in.Watts * math.Min(gti, math.Max(0, dni*exposure.Incidence)) / 1e6
	for p, cell := range exposure.Panels {
		shade := beam * (1 - cell.LitFraction)
		dc := raw - shade
		out.Raw += raw * dt
		out.Shade += shade * dt
		row.Panels[p].Shade += shade * dt
		for _, key := range lossOrder {
			loss := dc * in.System.Losses[key] / 100
			dc -= loss
			out.Loss[key] += loss * dt
		}
		out.DC += dc * dt
		row.DC += dc * dt
		row.Panels[p].DC += dc * dt
		row.Panels[p].Lit += cell.LitFraction * dt / row.Duration
		tracker[p%inv.MpptCount] += dc
		power[p] = dc
	}
	limit := 0.0
	if inv.OperatingV >= inv.MpptMinV && inv.OperatingV <= inv.MpptMaxV {
		limit = inv.OperatingV * inv.MpptMaxA / 1000
	}
	admitted := 0.0
	for i, total := range tracker[:inv.MpptCount] {
		accepted := math.Min(total, limit)
		admitted += accepted
		row.MPPT += (total - accepted) * dt
		out.MPPT += (total - accepted) * dt
		if total > 0 {
			tracker[i] = accepted / total
		}
	}
	before := admitted * inv.Efficiency / 100
	ac := math.Min(before, inv.AcKw)
	out.Inverter += (admitted - before) * dt
	out.Clipping += (before - ac) * dt
	row.Clipping += (before - ac) * dt
	out.AC += ac * dt
	row.AC += ac * dt
	if admitted > 0 {
		for i := range row.Panels {
			row.Panels[i].AC += ac * dt * power[i] * tracker[i%inv.MpptCount] / admitted
		}
	}
}
func forecastEnergy(ctx context.Context, in *energyInput) (energyResult, *weatherReserve, error) {
	out := energyResult{Loss: map[string]float64{"temperature": 0, "wiring": 0, "soiling": 0, "other": 0}}
	h := in.Hourly
	count := len(in.Scene.Panels)
	if !in.Location.valid() || !in.Scene.Validate() {
		return out, nil, errors.New("Thiếu hình học mô phỏng.")
	}
	if err := in.System.validate(in.Watts, count); err != nil {
		return out, nil, err
	}
	if len(h.Time) == 0 || len(h.Time) > 144 || in.End <= in.Start || in.End-in.Start > 86400 || in.Start < -2208988800 || in.End > 4165516800 {
		return out, nil, errors.New("Mốc thời gian không hợp lệ.")
	}
	var covered int64
	reserve := &weatherReserve{}
	weightedCloud, reduction := 0., 0.
	for i, t := range h.Time {
		if i > 0 && t-h.Time[i-1] != 3600 {
			return out, nil, errors.New("Mốc thời gian không hợp lệ.")
		}
		from, to := max(in.Start, t-3600), min(in.End, t)
		if to <= from {
			continue
		}
		gti, ok := validReading(h.GTI, i, 3500)
		if !ok {
			return out, nil, errors.New("Dữ liệu bức xạ hôm nay chưa đầy đủ.")
		}
		dni, ok := validReading(h.DNI, i, 3500)
		if !ok {
			return out, nil, errors.New("Thiếu bức xạ trực tiếp DNI theo giờ.")
		}
		row := energyHour{Time: t, Duration: float64(to-from) / 3600, Panels: make([]energyPanel, count)}
		for p := range row.Panels {
			row.Panels[p] = energyPanel{ID: p + 1, MPPT: p%in.System.Inverter.MpptCount + 1}
		}
		covered += to - from
		out.Irradiation += gti / 1000 * row.Duration
		for ts := from; ts < to; ts += 900 {
			if err := ctx.Err(); err != nil {
				return out, nil, err
			}
			seconds := min(int64(900), to-ts)
			instant := time.Unix(ts, seconds*int64(time.Second)/2).UTC()
			sun := solarPosition(instant, in.Location.Lat, in.Location.Lon)
			integrateStep(in, &out, &row, gti, dni, float64(seconds)/3600, in.Scene.Exposure(sun, 6))
		}
		out.Hours = append(out.Hours, row)
		if reserve != nil && row.AC > 0 {
			cloud, c := validReading(h.Cloud, i, 100)
			rain, r := validReading(h.Rain, i, 1000)
			showers, s := validReading(h.Showers, i, 1000)
			if !(c && r && s) {
				reserve = nil
				continue
			}
			reduction += row.AC * (math.Max(0, (cloud-50)/50)*.15 + math.Min((rain+showers)/2, 1)*.10)
			weightedCloud += row.AC * cloud
			reserve.Rain = reserve.Rain || rain+showers > 0
		}
	}
	if covered != in.End-in.Start {
		return out, nil, errors.New("Chưa có đủ dữ liệu cho cả ngày. Hãy thử cập nhật lại.")
	}
	if reserve != nil {
		reserve.Kwh = out.AC - reduction
		if out.AC > 0 {
			reserve.Percent = 100 * reduction / out.AC
			reserve.Cloud = weightedCloud / out.AC
		}
	}
	return out, reserve, nil
}
func energy(w http.ResponseWriter, r *http.Request) {
	var in energyInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20)).Decode(&in); err != nil {
		http.Error(w, "Invalid energy input", 400)
		return
	}
	out, reserve, err := forecastEnergy(r.Context(), &in)
	if err != nil {
		http.Error(w, err.Error(), 422)
		return
	}
	var plan any
	if in.Planning != nil {
		if in.End-in.Start != 86400 {
			http.Error(w, "Thông số kịch bản không hợp lệ.", 422)
			return
		}
		plan, err = simulatePlanning(out.Hours, in.Start, *in.Planning)
		if err != nil {
			http.Error(w, err.Error(), 422)
			return
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"result": out, "reserve": reserve, "planning": plan})
}
