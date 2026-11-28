package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

type observedContext struct {
	context.Context
	entered chan struct{}
}

func (o observedContext) Done() <-chan struct{} {
	select {
	case o.entered <- struct{}{}:
	default:
	}
	return o.Context.Done()
}
func TestSharedCancellation(t *testing.T) {
	started := make(chan struct{}, 2)
	exited := make(chan struct{}, 2)
	var calls atomic.Int32
	h := shareCalculation(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		started <- struct{}{}
		<-r.Context().Done()
		exited <- struct{}{}
	})
	ctx, cancel := context.WithCancel(context.Background())
	run := func(ctx context.Context) {
		h(httptest.NewRecorder(), httptest.NewRequest("POST", "/test", strings.NewReader("{}")).WithContext(ctx))
	}
	go run(ctx)
	<-started
	second, stop := context.WithCancel(context.Background())
	defer stop()
	observed := observedContext{second, make(chan struct{}, 1)}
	go run(observed)
	// Wait until both consumers enter their select on Done before canceling one.
	<-observed.entered
	cancel()
	select {
	case <-exited:
		t.Fatal("aborted active consumer")
	case <-time.After(10 * time.Millisecond):
	}
	stop()
	select {
	case <-exited:
	case <-time.After(time.Second):
		t.Fatal("abandoned job still running")
	}
	if calls.Load() != 1 {
		t.Fatal(calls.Load())
	}
}
