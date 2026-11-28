package main

import (
	"bytes"
	"context"
	"encoding/json"
	"math"
	"net/http/httptest"
	"os"
	"reflect"
	"testing"
)

type forecastFixture struct {
	Annual  []annualTotal
	Input   energyInput
	Result  energyResult
	Reserve weatherReserve
}

func fixture(t *testing.T) forecastFixture {
	t.Helper()
	bytes, err := os.ReadFile("testdata/energy-parity.json")
	if err != nil {
		t.Fatal(err)
	}
	var f forecastFixture
	if err = json.Unmarshal(bytes, &f); err != nil {
		t.Fatal(err)
	}
	return f
}

// The fixture was sampled from the previous JavaScript model at 07:15–15:45
// local time, with a pitched neighboring roof, three panels and two MPPTs.
func TestDailyEnergyMigration(t *testing.T) {
	f := fixture(t)
	result, reserve, err := forecastEnergy(context.Background(), &f.Input)
	if err != nil {
		t.Fatal(err)
	}
	close := func(a, b float64) {
		t.Helper()
		if math.Abs(a-b) > 1e-8 {
			t.Fatalf("%.10f != %.10f", a, b)
		}
	}
	close(result.Raw, f.Result.Raw)
	close(result.AC, f.Result.AC)
	close(result.DC, f.Result.DC)
	close(result.Inverter, f.Result.Inverter)
	close(result.Shade, f.Result.Shade)
	close(result.MPPT, f.Result.MPPT)
	close(result.Clipping, f.Result.Clipping)
	close(result.Irradiation, f.Result.Irradiation)
	if result.Shade <= 0 || result.MPPT <= 0 || result.Clipping <= 0 {
		t.Fatal("fixture must exercise all limits")
	}
	for name, loss := range result.Loss {
		close(loss, f.Result.Loss[name])
	}
	if len(result.Hours) != len(f.Result.Hours) {
		t.Fatal("partial hour coverage")
	}
	for i, h := range result.Hours {
		want := f.Result.Hours[i]
		close(h.AC, want.AC)
		close(h.Duration, want.Duration)
		close(h.Clipping, want.Clipping)
		for j, p := range h.Panels {
			q := want.Panels[j]
			close(p.AC, q.AC)
			close(p.DC, q.DC)
			close(p.Shade, q.Shade)
			close(p.Lit, q.Lit)
		}
	}
	close(reserve.Kwh, f.Reserve.Kwh)
	close(reserve.Cloud, f.Reserve.Cloud)
	close(reserve.Percent, f.Reserve.Percent)
	f.Input.Hourly.DNI[2] = nil
	if _, _, err = forecastEnergy(context.Background(), &f.Input); err == nil {
		t.Fatal("missing DNI should fail")
	}
}
func TestAnnualEnergyEndpoint(t *testing.T) {
	f := fixture(t)
	in := annualInput{Year: 2026, AnnualPoa: 1600, Watts: 600, Location: f.Input.Location, System: f.Input.System, Scene: f.Input.Scene, Layouts: [][][4][3]float64{f.Input.Scene.Panels[:1], f.Input.Scene.Panels[1:2]}}
	data, _ := json.Marshal(in)
	req := httptest.NewRequest("POST", "/annual", bytes.NewReader(data))
	w := httptest.NewRecorder()
	annualEnergy(w, req)
	var totals []annualTotal
	if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &totals) != nil || len(totals) != 2 {
		t.Fatal(w.Code, w.Body.String())
	}
	for i, v := range totals {
		if math.Abs(v.AC-f.Annual[i].AC) > 1e-7 || math.Abs(v.Shade-f.Annual[i].Shade) > 1e-7 {
			t.Fatalf("annual migration mismatch: %+v != %+v", v, f.Annual[i])
		}
		if math.Abs(v.Raw-960) > 1e-8 || v.AC <= 0 || v.AC > v.DC || v.ShadeFraction <= 0 {
			t.Fatalf("invalid annual energy: %+v", v)
		}
	}
	if reflect.DeepEqual(totals[0], totals[1]) {
		t.Fatal("distinct shading expected")
	}
}
func TestStorageAndROI(t *testing.T) {
	hours := make([]energyHour, 24)
	for i := range hours {
		hours[i] = energyHour{Time: int64((i + 1) * 3600), Duration: 1}
		if i >= 6 && i < 18 {
			hours[i].AC = 2
		}
	}
	s := planningScenario{DayKwh: 12, NightKwh: 12, Capacity: 5, Power: 2, Price: 3000, Capital: 50000000, AnnualCost: 1000000, Years: 10}
	plan, err := simulatePlanning(hours, 0, s)
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs(plan.Discharged-4.75) > 1e-9 || math.Abs(plan.Charged-5/.95) > 1e-9 || math.Abs(plan.Grid-7.25) > 1e-9 {
		t.Fatalf("%+v", plan)
	}
	s.Capacity = 0
	none, err := simulatePlanning(hours, 0, s)
	if err != nil || none.Discharged != 0 || none.Grid != 12 {
		t.Fatal(none, err)
	}
}

func TestEnergyHTTPContract(t *testing.T) {
	f := fixture(t)
	body, _ := json.Marshal(f.Input)
	w := httptest.NewRecorder()
	energy(w, httptest.NewRequest("POST", "/energy", bytes.NewReader(body)))
	var payload struct {
		Result   energyResult
		Reserve  *weatherReserve
		Planning *planningResult
	}
	if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &payload) != nil || payload.Reserve == nil || payload.Planning != nil || math.Abs(payload.Result.AC-f.Result.AC) > 1e-8 {
		t.Fatal(w.Code, w.Body.String())
	}
	f.Input.Hourly.GTI[0] = nil
	body, _ = json.Marshal(f.Input)
	w = httptest.NewRecorder()
	energy(w, httptest.NewRequest("POST", "/energy", bytes.NewReader(body)))
	if w.Code != 422 {
		t.Fatal("missing hourly reading:", w.Code)
	}
}

func TestCanceledAnnualEnergy(t *testing.T) {
	f := fixture(t)
	in := annualInput{Year: 2026, AnnualPoa: 1600, Watts: 600, Location: f.Input.Location, System: f.Input.System, Scene: f.Input.Scene, Layouts: [][][4][3]float64{f.Input.Scene.Panels}}
	body, _ := json.Marshal(in)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	w := httptest.NewRecorder()
	annualEnergy(w, httptest.NewRequest("POST", "/annual", bytes.NewReader(body)).WithContext(ctx))
	if w.Code != 408 {
		t.Fatal("canceled annual work:", w.Code)
	}
}
