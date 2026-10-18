// Package errs defines the sentinel errors shared across the worker.
//
// ErrTransient marks failures worth retrying (nack the Pub/Sub message);
// ErrPermanent marks failures that must not be retried (dead-letter).
package errs

import "errors"

var (
	// ErrTransient wraps any error that may succeed on retry.
	ErrTransient = errors.New("transient")
	// ErrPermanent wraps any error that will never succeed on retry.
	ErrPermanent = errors.New("permanent")
)
