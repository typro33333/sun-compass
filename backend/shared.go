package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"golang.org/x/sync/singleflight"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"time"
)

// Each identical input has a shared context until the last caller disconnects.
type sharedJob struct {
	group   singleflight.Group
	ctx     context.Context
	cancel  context.CancelFunc
	callers int
}

func shareCalculation(handler http.HandlerFunc) http.HandlerFunc {
	var mu sync.Mutex
	jobs := map[[32]byte]*sharedJob{}
	return func(w http.ResponseWriter, r *http.Request) {
		data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 524288))
		if err != nil {
			http.Error(w, "Invalid request size", 413)
			return
		}
		key := sha256.Sum256(data)
		mu.Lock()
		job := jobs[key]
		if job == nil {
			ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
			job = &sharedJob{ctx: ctx, cancel: cancel}
			jobs[key] = job
		}
		job.callers++
		result := job.group.DoChan("", func() (any, error) {
			req := r.Clone(job.ctx)
			req.Body = io.NopCloser(bytes.NewReader(data))
			out := httptest.NewRecorder()
			handler(out, req)
			return out, nil
		})
		mu.Unlock()
		defer func() {
			mu.Lock()
			defer mu.Unlock()
			job.callers--
			if job.callers == 0 {
				delete(jobs, key)
				job.cancel()
			}
		}()
		select {
		case <-r.Context().Done():
			return
		case v := <-result:
			out := v.Val.(*httptest.ResponseRecorder)
			w.Header().Set("Content-Type", out.Header().Get("Content-Type"))
			w.WriteHeader(out.Code)
			w.Write(out.Body.Bytes())
		}
	}
}
