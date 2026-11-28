package main

import (
	"encoding/json"
	"math"
	"os"
	"testing"
	"time"
)

func TestSolarNOAA(t *testing.T) {
	data, err := os.ReadFile("../tests/fixtures/noaa.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixture struct {
		Rows []struct {
			Day              string
			Lat, Lon, Offset float64
			Rise, Set        *float64
			Positions        []struct {
				Minute            int
				Azimuth, Altitude float64
			}
		}
	}
	if err := json.Unmarshal(data, &fixture); err != nil {
		t.Fatal(err)
	}
	if len(fixture.Rows) == 0 {
		t.Fatal("empty reference")
	}
	for _, r := range fixture.Rows {
		day, err := time.Parse("2006-01-02", r.Day)
		if err != nil {
			t.Fatal(err)
		}
		samples := ephemeris(day.Add(-time.Duration(r.Offset*float64(time.Hour))), r.Lat, r.Lon)
		for _, ref := range r.Positions {
			p := samples.Positions[ref.Minute]
			if math.Abs(p[0]-ref.Altitude) > .01 || math.Abs(wrapAngle(p[1]-ref.Azimuth+180)-180) > .01 {
				t.Fatalf("%s at %d: %v", r.Day, ref.Minute, p)
			}
		}
		for _, pair := range [][2]*float64{{r.Rise, samples.Events.Rise}, {r.Set, samples.Events.Set}} {
			if (pair[0] == nil) != (pair[1] == nil) || pair[0] != nil && math.Abs(*pair[0]-*pair[1]) > 2 {
				t.Fatalf("rise/set %s", r.Day)
			}
		}
	}
}
func TestPanelShadowCells(t *testing.T) {
	box := [][4]float64{{1, 0, 0, 0}, {-1, 0, 0, 2}, {0, 1, 0, 4}, {0, -1, 0, -3}, {0, 0, 1, 2}, {0, 0, -1, 2}}
	s := ExposureScene{Panels: [][4][3]float64{{{-1, 2, -1}, {1, 2, -1}, {1, 2, 1}, {-1, 2, 1}}}, Volumes: [][][4]float64{box}}
	for _, row := range []struct{ house, alt, lit float64 }{{0, 90, .5}, {90, 90, .5}, {0, -1, 0}} {
		s.House = row.house
		p := s.Exposure(SunPosition{Altitude: row.alt}, 6).Panels[0]
		if len(p.Cells) != 36 || p.LitFraction != row.lit {
			t.Fatalf("mask at house %f, sun %f: %+v", row.house, row.alt, p)
		}
	}
}
