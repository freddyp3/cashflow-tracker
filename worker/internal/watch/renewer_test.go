package watch

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestRenewerCallsImmediatelyThenTicks(t *testing.T) {
	var calls int32
	r := Renewer{
		Interval: 10 * time.Millisecond,
		Call: func(context.Context) error {
			atomic.AddInt32(&calls, 1)
			return nil
		},
	}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		r.Run(ctx)
		close(done)
	}()

	deadline := time.Now().Add(50 * time.Millisecond)
	for atomic.LoadInt32(&calls) < 3 && time.Now().Before(deadline) {
		time.Sleep(2 * time.Millisecond)
	}
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Run did not stop after cancel")
	}
	if n := atomic.LoadInt32(&calls); n < 3 {
		t.Fatalf("calls = %d, want >= 3 within 50ms", n)
	}
	// After cancel, no further calls must be made.
	before := atomic.LoadInt32(&calls)
	time.Sleep(30 * time.Millisecond)
	if got := atomic.LoadInt32(&calls); got != before {
		t.Fatalf("calls kept ticking after cancel: %d -> %d", before, got)
	}
}
