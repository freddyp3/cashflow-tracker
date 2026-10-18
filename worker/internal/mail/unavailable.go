package mail

import (
	"context"
	"fmt"

	"github.com/freddyp3/cashflow-tracker/worker/internal/errs"
)

// Unavailable is the MailSource used when no Gmail token file exists: every
// call fails transiently so notifications are retried and eventually
// dead-lettered rather than silently dropped.
type Unavailable struct {
	Reason string
}

// NewMessagesSince always fails with ErrTransient.
func (u Unavailable) NewMessagesSince(context.Context, string) ([]Message, error) {
	return nil, fmt.Errorf("gmail unavailable (%s): %w", u.Reason, errs.ErrTransient)
}
