// Package mail fetches sale emails behind the MailSource interface: a real
// Gmail API implementation, an Unavailable stand-in used when no token file
// exists, and .eml decoding helpers shared by both.
package mail

import (
	"context"
	"time"
)

// Message is a decoded email reduced to the fields the pipeline needs.
type Message struct {
	ID      string
	From    string
	Subject string
	Date    time.Time
	Body    string
}

// MailSource lists the messages newer than a stored cursor — a Gmail
// history ID for GmailSource, or the .eml file name for DirSource.
type MailSource interface {
	NewMessagesSince(ctx context.Context, lastHistoryID string) ([]Message, error)
}
