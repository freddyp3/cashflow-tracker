// Package ingest is the worker's core pipeline: a Gmail push notification is
// expanded into the new messages since the last history ID, each message is
// parsed by its platform parser, and every sale is upserted into the Spring
// API by external ref — so reprocessing (even concurrently) is idempotent.
//
// Errors are classified by errs.ErrTransient (nack, retried, eventually
// dead-lettered after MaxAttempts) and errs.ErrPermanent (dead-lettered at
// once). On a real Pub/Sub subscription with a dead-letter policy the nack is
// enough; on the emulator (no DeliveryAttempt) the processor simulates the
// dead-letter by counting attempts and publishing to the DLQ topic itself.
package ingest

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"

	"cloud.google.com/go/pubsub"
	"github.com/shopspring/decimal"

	"github.com/freddyp3/cashflow-tracker/worker/internal/errs"
	"github.com/freddyp3/cashflow-tracker/worker/internal/mail"
	"github.com/freddyp3/cashflow-tracker/worker/internal/parsers"
	"github.com/freddyp3/cashflow-tracker/worker/internal/tracker"
)

// Tracker is the subset of tracker.Client the processor needs (an interface
// so unit tests can use a fake).
type Tracker interface {
	ToCAD(ctx context.Context, amount decimal.Decimal, currency string) (decimal.Decimal, error)
	MatchProduct(ctx context.Context, title string, cutoff float64) (*tracker.ProductMatch, error)
	UpsertExternal(ctx context.Context, platform, ref string, req tracker.OrderRequest) error
}

// DLQPublisher is the subset of pubsub.Topic used for simulated dead-lettering.
type DLQPublisher interface {
	Publish(ctx context.Context, msg *pubsub.Message) *pubsub.PublishResult
}

// notification is the Gmail push payload (Pub/Sub already base64-decodes it).
type notification struct {
	EmailAddress string `json:"emailAddress"`
	HistoryID    string `json:"historyId"`
}

const matchCutoff = 0.45

// Processor converts one Pub/Sub notification into order upserts.
type Processor struct {
	Mail        mail.MailSource
	Tracker     Tracker
	DLQ         DLQPublisher // may be nil when no DLQ topic is configured
	HistoryFile string
	MaxAttempts int

	mu       sync.Mutex
	attempts map[string]int
}

// NewProcessor builds a Processor.
func NewProcessor(m mail.MailSource, t Tracker, dlq DLQPublisher, historyFile string, maxAttempts int) *Processor {
	return &Processor{
		Mail: m, Tracker: t, DLQ: dlq,
		HistoryFile: historyFile, MaxAttempts: maxAttempts,
		attempts: map[string]int{},
	}
}

// Handle processes one notification's data payload. It returns nil only when
// every fetched message was upserted or skipped.
func (p *Processor) Handle(ctx context.Context, data []byte) error {
	var n notification
	if err := json.Unmarshal(data, &n); err != nil {
		return fmt.Errorf("invalid notification payload: %w", errs.ErrPermanent)
	}

	msgs, err := p.Mail.NewMessagesSince(ctx, p.lastHistoryID())
	if err != nil {
		return err
	}

	for _, msg := range msgs {
		parser := parsers.ForSender(msg.From)
		if parser == nil {
			log.Printf("ingest: skipping message %s from %q (no parser)", msg.ID, msg.From)
			continue
		}
		sale := parser(msg.Subject, msg.Body)
		ref, req, err := p.buildOrder(ctx, sale, msg)
		if err != nil {
			return err
		}
		if err := p.Tracker.UpsertExternal(ctx, sale.Platform, ref, req); err != nil {
			return err
		}
	}

	if n.HistoryID != "" {
		if err := os.WriteFile(p.HistoryFile, []byte(n.HistoryID), 0o600); err != nil {
			return fmt.Errorf("persist history id: %w", errs.ErrTransient)
		}
	}
	return nil
}

// OnMessage is the pubsub Receive callback: ack/nack plus simulated
// dead-lettering when Pub/Sub reports no DeliveryAttempt.
func (p *Processor) OnMessage(ctx context.Context, msg *pubsub.Message) {
	err := p.Handle(ctx, msg.Data)
	if err == nil {
		msg.Ack()
		return
	}
	log.Printf("ingest: message %s failed: %v", msg.ID, err)
	if msg.DeliveryAttempt != nil {
		msg.Nack() // real Pub/Sub applies its dead-letter policy natively
		return
	}
	permanent := errors.Is(err, errs.ErrPermanent)
	attempts := p.recordAttempt(msg.ID)
	if permanent || attempts >= p.MaxAttempts {
		if p.DLQ != nil {
			attrs := map[string]string{"reason": err.Error()}
			for k, v := range msg.Attributes {
				attrs[k] = v
			}
			res := p.DLQ.Publish(ctx, &pubsub.Message{Data: msg.Data, Attributes: attrs})
			if _, perr := res.Get(ctx); perr != nil {
				log.Printf("ingest: DLQ publish failed for %s: %v", msg.ID, perr)
				msg.Nack()
				return
			}
		}
		msg.Ack()
		return
	}
	msg.Nack()
}

// Attempts reports how many times a message ID has been retried under the
// simulated dead-letter path (emulator; zero under real Pub/Sub).
func (p *Processor) Attempts(msgID string) int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.attempts[msgID]
}

func (p *Processor) recordAttempt(msgID string) int {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.attempts[msgID]++
	return p.attempts[msgID]
}

func (p *Processor) lastHistoryID() string {
	data, err := os.ReadFile(p.HistoryFile)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

// buildOrder turns a ParsedSale into an OrderRequest plus the external ref.
func (p *Processor) buildOrder(ctx context.Context, sale *parsers.ParsedSale, msg mail.Message) (string, tracker.OrderRequest, error) {
	if sale.Price == nil {
		sale.Warnings = append(sale.Warnings, "price not found in email")
	}
	if sale.ItemTitle == nil || *sale.ItemTitle == "" {
		sale.Warnings = append(sale.Warnings, "item title not found in email")
	}

	price := decimal.Zero
	if sale.Price != nil {
		price = *sale.Price
	}
	revenue, err := p.Tracker.ToCAD(ctx, price, sale.Currency)
	if err != nil {
		return "", tracker.OrderRequest{}, err
	}
	ship := decimal.Zero
	if sale.Shipping != nil {
		ship = *sale.Shipping
	}
	shipping, err := p.Tracker.ToCAD(ctx, ship, sale.Currency)
	if err != nil {
		return "", tracker.OrderRequest{}, err
	}

	var items []tracker.OrderItemRequest
	productMatched := false
	if sale.ItemTitle != nil && *sale.ItemTitle != "" {
		m, err := p.Tracker.MatchProduct(ctx, *sale.ItemTitle, matchCutoff)
		if err != nil {
			return "", tracker.OrderRequest{}, err
		}
		if m != nil {
			productMatched = true
			items = append(items, tracker.OrderItemRequest{
				ProductID: m.ProductID,
				ItemPaid:  revenue,
				ItemSize:  sale.Size,
				Note: fmt.Sprintf("Matched '%s' -> '%s' (%.0f%% confidence)",
					*sale.ItemTitle, m.ProductName, m.Score*100),
			})
		} else {
			sale.Warnings = append(sale.Warnings,
				fmt.Sprintf("no catalog product matched '%s'", *sale.ItemTitle))
		}
	}

	ref := "gmail:" + msg.ID
	if sale.OrderRef != nil && *sale.OrderRef != "" {
		ref = *sale.OrderRef
	}

	return ref, tracker.OrderRequest{
		Platform:         sale.Platform,
		Revenue:          revenue,
		Shipping:         shipping,
		CustomerName:     derefOr(sale.BuyerName, "TBD"),
		ShippingLocation: derefOr(sale.Location, "TBD"),
		Draft:            !(sale.Price != nil && productMatched),
		OrderDate:        msg.Date.UTC().Format("2006-01-02"),
		Note:             buildNote(sale, msg.ID),
		Items:            items,
	}, nil
}

func derefOr(s *string, def string) string {
	if s == nil || *s == "" {
		return def
	}
	return *s
}

func buildNote(sale *parsers.ParsedSale, msgID string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Auto-imported from Gmail (%s, msg %s).", sale.Platform, msgID)
	if sale.OrderRef != nil && *sale.OrderRef != "" {
		fmt.Fprintf(&b, " Order ref: %s.", *sale.OrderRef)
	}
	if len(sale.Warnings) > 0 {
		fmt.Fprintf(&b, " Review needed: %s.", strings.Join(sale.Warnings, "; "))
	}
	return b.String()
}
