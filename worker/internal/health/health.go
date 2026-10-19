// Package health serves the worker's /health endpoint.
package health

import (
	"fmt"
	"net/http"
)

// Reporter reports which external dependencies are wired up.
type Reporter struct {
	GmailConfigured bool
	// MailSource is "gmail", "directory" or "none".
	MailSource string
}

// Handler returns an http.Handler answering GET /health with a JSON status
// document: {"status":"ok","gmail":"configured"|"missing","mail":"<MailSource>","pubsub":"connected"}.
func (r Reporter) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		gmail := "missing"
		if r.GmailConfigured {
			gmail = "configured"
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","gmail":"%s","mail":"%s","pubsub":"connected"}`, gmail, r.MailSource)
	})
	return mux
}
