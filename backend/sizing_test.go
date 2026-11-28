package main

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSizing(t *testing.T) {
	for _, c := range []struct {
		input                     string
		panels, battery, inverter float64
	}{
		{`{"day":20,"night":30,"watts":600,"yieldPerKwp":4}`, 23, 36, 12},
		{`{"day":20,"night":30,"watts":600,"yieldPerKwp":4,"coverage":50,"peak":16.2}`, 16, 18, 17},
		{`{"day":20,"night":30,"watts":600,"yieldPerKwp":4,"coverage":0}`, 9, 0, 5},
		{`{"day":0,"night":0,"watts":600,"yieldPerKwp":4}`, 0, 0, 0},
	} {
		w := httptest.NewRecorder()
		sizing(w, httptest.NewRequest("POST", "/sizing", strings.NewReader(c.input)))
		if c.panels == 0 {
			if w.Code != 400 {
				t.Fatal(w.Code)
			}
			continue
		}
		var v map[string]any
		if json.Unmarshal(w.Body.Bytes(), &v) != nil || v["panels"] != c.panels || v["batteryKwh"] != c.battery || v["inverterKw"] != c.inverter {
			t.Fatal(w.Body.String())
		}
	}
}
