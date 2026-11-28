package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"reflect"
	"testing"
)

func TestSeasonalUsesSummerHistory(t *testing.T) {
	f := fixture(t)
	in := f.Input
	in.Planning = &planningScenario{DayKwh: 20, NightKwh: 30, Price: 3000, Capital: 50000000, Years: 10}
	months := make([][][2]float64, 12)
	for m := range months {
		months[m] = make([][2]float64, 24)
	}
	estimate := func() float64 {
		payload := struct {
			energyInput
			History any
		}{in, map[string]any{"year": 2024, "months": months}}
		b, _ := json.Marshal(payload)
		w := httptest.NewRecorder()
		seasonal(w, httptest.NewRequest("POST", "/seasonal", bytes.NewReader(b)))
		if w.Code != 200 {
			t.Fatal(w.Body.String())
		}
		var v struct{ ROI float64 }
		json.Unmarshal(w.Body.Bytes(), &v)
		return v.ROI
	}
	if v := estimate(); v != -100 {
		t.Fatal(v)
	}
	for m := 5; m < 9; m++ {
		for h := 1; h < 9; h++ {
			months[m][h] = [2]float64{600, 350}
		}
	}
	if v := estimate(); v <= -100 {
		t.Fatal(v)
	}
}
func TestShadeWorkersMatchSerial(t *testing.T) {
	s := fixture(t).Input.Scene
	for len(s.Panels) < 16 {
		s.Panels = append(s.Panels, s.Panels[0])
	}
	sun := SunPosition{Altitude: 25, Azimuth: 110}
	parallel, err := s.expose(context.Background(), sun, 6, true)
	if err != nil || !reflect.DeepEqual(parallel, s.Exposure(sun, 6)) {
		t.Fatal("parallel shading mismatch")
	}
}
