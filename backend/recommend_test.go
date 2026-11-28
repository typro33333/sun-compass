package main

import (
	"bytes"
	"encoding/json"
	"math"
	"net/http/httptest"
	"testing"
)

func TestRecommendFitsAndImproves(t *testing.T) {
	var q recommendationInput
	q.Date = "2026-03-01"
	q.Config.Width = 8
	q.Config.Length = 10
	q.Config.Bearing = 0
	q.Config.Tilt = 60
	q.Module.Width = 1.134
	q.Module.Length = 2.384
	q.Location = energyLocation{10, 106, 7}
	q.Positions = []roofPosition{{X: 0, Z: 0}}
	q.Outline = [][2]float64{{-2, -5}, {4, -5}, {4, 5}, {-4, 5}}
	q.Volumes = [][][4]float64{{{1, 0, 0, -2}, {-1, 0, 0, 8}, {0, 1, 0, 14}, {0, -1, 0, 0}, {0, 0, 1, 5}, {0, 0, -1, 5}}}
	for _, annual := range []bool{false, true} {
		q.Annual = annual
		q.Layout = true
		data, _ := json.Marshal(q)
		w := httptest.NewRecorder()
		recommend(w, httptest.NewRequest("POST", "/recommend", bytes.NewReader(data)))
		var result struct {
			orientation
			Baseline  float64
			Positions []roofPosition
		}
		if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &result) != nil {
			t.Fatal(w.Body.String())
		}
		if !q.fits(result.Positions, result.Bearing) || len(result.Positions) != 1 || math.IsNaN(result.Score) || result.Score <= result.Baseline {
			t.Fatalf("bad result %+v", result)
		}
	}
}
