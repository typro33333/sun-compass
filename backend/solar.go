package main

import (
	"encoding/json"
	"math"
	"net/http"
	"time"
)

// NOAA/Meeus geometric position at an absolute instant. Refraction is only
// included in the rise/set horizon used by the daily ephemeris.
type SunPosition struct {
	Altitude float64 `json:"altitude"`
	Azimuth  float64 `json:"azimuth"`
}

const radians = math.Pi / 180

func wrapAngle(x float64) float64 { return x - 360*math.Floor(x/360) }
func solarPosition(instant time.Time, lat, lon float64) SunPosition {
	utc := instant.UTC()
	sec := float64(utc.Unix()) + float64(utc.Nanosecond())/1e9
	t := (sec/86400 + 2440587.5 - 2451545) / 36525
	l := wrapAngle(280.46646+t*(36000.76983+t*.0003032)) * radians
	m := (357.52911 + t*(35999.05029-.0001537*t)) * radians
	e := .016708634 - t*(.000042037+.0000001267*t)
	center := math.Sin(m)*(1.914602-t*(.004817+.000014*t)) + math.Sin(2*m)*(.019993-.000101*t) + .000289*math.Sin(3*m)
	omega := (125.04 - 1934.136*t) * radians
	ob := (23 + (26+(21.448-t*(46.815+t*(.00059-t*.001813)))/60)/60 + .00256*math.Cos(omega)) * radians
	dec := math.Asin(math.Sin(ob) * math.Sin(l+(center-.00569-.00478*math.Sin(omega))*radians))
	y := math.Pow(math.Tan(ob/2), 2)
	eq := 4 / radians * (y*math.Sin(2*l) - 2*e*math.Sin(m) + 4*e*y*math.Sin(m)*math.Cos(2*l) - .5*y*y*math.Sin(4*l) - 1.25*e*e*math.Sin(2*m))
	minute := float64(utc.Hour()*60+utc.Minute()) + (float64(utc.Second())+float64(utc.Nanosecond())/1e9)/60
	h := (wrapAngle((minute+eq+4*lon)/4) - 180) * radians
	p := lat * radians
	alt := math.Sin(p)*math.Sin(dec) + math.Cos(p)*math.Cos(dec)*math.Cos(h)
	return SunPosition{math.Asin(math.Max(-1, math.Min(1, alt))) / radians, wrapAngle(math.Atan2(math.Sin(h), math.Cos(h)*math.Sin(p)-math.Tan(dec)*math.Cos(p))/radians + 180)}
}

type sunEvents struct {
	Rise     *float64 `json:"rise"`
	Set      *float64 `json:"set"`
	Daylight int      `json:"daylight"`
}
type solarDay struct {
	Positions [][2]float64 `json:"positions"`
	Events    sunEvents    `json:"events"`
}

func ephemeris(start time.Time, lat, lon float64) solarDay {
	day := solarDay{Positions: make([][2]float64, 1441)}
	var prev float64
	for i := range day.Positions {
		p := solarPosition(start.Add(time.Duration(i)*time.Minute), lat, lon)
		day.Positions[i] = [2]float64{math.Round(p.Altitude*1e6) / 1e6, math.Round(p.Azimuth*1e6) / 1e6}
		v := p.Altitude + .833
		if i > 0 {
			if v >= 0 {
				day.Events.Daylight++
			}
			if (prev < 0) != (v < 0) {
				at := float64(i-1) - prev/(v-prev)
				if v >= 0 {
					day.Events.Rise = &at
				} else {
					day.Events.Set = &at
				}
			}
		}
		prev = v
	}
	return day
}
func solar(w http.ResponseWriter, r *http.Request) {
	var q struct {
		Day              string
		Lat, Lon, Offset *float64
	}
	if json.NewDecoder(http.MaxBytesReader(w, r.Body, 2048)).Decode(&q) != nil || q.Lat == nil || q.Lon == nil || q.Offset == nil || math.Abs(*q.Lat) > 90 || math.Abs(*q.Lon) > 180 || *q.Offset < -12 || *q.Offset > 14 {
		http.Error(w, "Invalid solar coordinates", 400)
		return
	}
	day, err := time.Parse("2006-01-02", q.Day)
	if err != nil {
		http.Error(w, "Invalid solar date", 400)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ephemeris(day.Add(-time.Duration(*q.Offset*float64(time.Hour))), *q.Lat, *q.Lon))
}
