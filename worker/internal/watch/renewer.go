// Package watch provides a generic renewal ticker: the Gmail users.watch
// call expires and must be re-issued roughly daily.
package watch

import (
	"context"
	"log"
	"time"
)

// Renewer invokes Call once immediately and then on every Interval until the
// context is cancelled. Call is generic on purpose — the caller supplies the
// Gmail watch (or any other periodic job).
type Renewer struct {
	Call     func(ctx context.Context) error
	Interval time.Duration
}

// Run blocks until ctx is done. Errors from Call are logged, not fatal.
func (r Renewer) Run(ctx context.Context) {
	r.call(ctx)
	ticker := time.NewTicker(r.Interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.call(ctx)
		}
	}
}

func (r Renewer) call(ctx context.Context) {
	if r.Call == nil {
		return
	}
	if err := r.Call(ctx); err != nil {
		log.Printf("watch: renewal call failed: %v", err)
	}
}
