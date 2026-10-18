package ingest

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/freddyp3/cashflow-tracker/worker/internal/errs"
	"github.com/freddyp3/cashflow-tracker/worker/internal/mail"
	"github.com/freddyp3/cashflow-tracker/worker/internal/tracker"
)

type fakeMail struct {
	msgs []mail.Message
	err  error
}

func (f fakeMail) NewMessagesSince(context.Context, string) ([]mail.Message, error) {
	return f.msgs, f.err
}

type recordedUpsert struct {
	platform string
	ref      string
	req      tracker.OrderRequest
}

type fakeTracker struct {
	rate    decimal.Decimal
	match   *tracker.ProductMatch
	upserts []recordedUpsert
}

func (f *fakeTracker) ToCAD(_ context.Context, amount decimal.Decimal, _ string) (decimal.Decimal, error) {
	return amount.Mul(f.rate).Round(2), nil
}

func (f *fakeTracker) MatchProduct(context.Context, string, float64) (*tracker.ProductMatch, error) {
	return f.match, nil
}

func (f *fakeTracker) UpsertExternal(_ context.Context, platform, ref string, req tracker.OrderRequest) error {
	f.upserts = append(f.upserts, recordedUpsert{platform, ref, req})
	return nil
}

func newProcessor(t *testing.T, m mail.MailSource, tr *fakeTracker) (*Processor, string) {
	t.Helper()
	dir := t.TempDir()
	historyFile := filepath.Join(dir, "history_id")
	return NewProcessor(m, tr, nil, historyFile, 3), historyFile
}

func grailedMsg(id, subject, body string) mail.Message {
	return mail.Message{
		ID: id, From: "sales@grailed.com", Subject: subject, Body: body,
		Date: time.Date(2026, 10, 12, 14, 32, 0, 0, time.UTC),
	}
}

const notif = `{"emailAddress":"seller@example.test","historyId":"42"}`

func TestDraftWhenNoPrice(t *testing.T) {
	tr := &fakeTracker{rate: decimal.NewFromFloat(1.4),
		match: &tracker.ProductMatch{ProductID: 1, ProductName: "Canvas Tote Bag", Score: 1.0}}
	p, _ := newProcessor(t, fakeMail{msgs: []mail.Message{
		grailedMsg("m1", "You made a sale",
			"Order #: GRD-900112\nItem: Canvas Tote Bag\nBuyer: theo_r\nSize: One Size\nShips to: Reno, NV, USA"),
	}}, tr)

	if err := p.Handle(context.Background(), []byte(notif)); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(tr.upserts) != 1 {
		t.Fatalf("upserts = %d", len(tr.upserts))
	}
	u := tr.upserts[0]
	if u.platform != "Grailed" || u.ref != "GRD-900112" {
		t.Errorf("upsert target = %s/%s", u.platform, u.ref)
	}
	if !u.req.Draft {
		t.Error("expected draft when price missing")
	}
	wantNote := "Auto-imported from Gmail (Grailed, msg m1). Order ref: GRD-900112. " +
		"Review needed: price not found in email."
	if u.req.Note != wantNote {
		t.Errorf("note = %q, want %q", u.req.Note, wantNote)
	}
}

func TestDraftWhenNoProductMatch(t *testing.T) {
	tr := &fakeTracker{rate: decimal.NewFromFloat(1.4)}
	p, _ := newProcessor(t, fakeMail{msgs: []mail.Message{
		grailedMsg("m2", "Congrats, you sold Vintage Canvas Field Jacket",
			"Order #: GRD-884213\nBuyer: marta.k\nSold price: $185.00\nShipping: $12.50\nSize: M\nShips to: Portland, OR, USA"),
	}}, tr)

	if err := p.Handle(context.Background(), []byte(notif)); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	u := tr.upserts[0]
	if !u.req.Draft {
		t.Error("expected draft when no product matched")
	}
	if len(u.req.Items) != 0 {
		t.Errorf("items = %v, want none", u.req.Items)
	}
	wantNote := "Auto-imported from Gmail (Grailed, msg m2). Order ref: GRD-884213. " +
		"Review needed: no catalog product matched 'Vintage Canvas Field Jacket'."
	if u.req.Note != wantNote {
		t.Errorf("note = %q, want %q", u.req.Note, wantNote)
	}
	// $185.00 * 1.4 = 259.00; $12.50 * 1.4 = 17.50
	if !u.req.Revenue.Equal(decimal.NewFromFloat(259.00)) {
		t.Errorf("revenue = %s, want 259.00", u.req.Revenue)
	}
	if !u.req.Shipping.Equal(decimal.NewFromFloat(17.50)) {
		t.Errorf("shipping = %s, want 17.50", u.req.Shipping)
	}
}

func TestRealOrderWhenPriceAndProduct(t *testing.T) {
	tr := &fakeTracker{rate: decimal.NewFromFloat(1.4),
		match: &tracker.ProductMatch{ProductID: 7, ProductName: "Vintage Canvas Field Jacket", Score: 1.0}}
	p, historyFile := newProcessor(t, fakeMail{msgs: []mail.Message{
		grailedMsg("m3", "Congrats, you sold Vintage Canvas Field Jacket",
			"Order #: GRD-884213\nBuyer: marta.k\nSold price: $185.00\nShipping: $12.50\nSize: M\nShips to: Portland, OR, USA"),
	}}, tr)

	if err := p.Handle(context.Background(), []byte(notif)); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	u := tr.upserts[0]
	if u.req.Draft {
		t.Error("expected non-draft order when price and product are present")
	}
	if u.req.CustomerName != "marta.k" || u.req.ShippingLocation != "Portland, OR, USA" {
		t.Errorf("buyer/location = %q/%q", u.req.CustomerName, u.req.ShippingLocation)
	}
	if u.req.OrderDate != "2026-10-12" {
		t.Errorf("orderDate = %q", u.req.OrderDate)
	}
	if len(u.req.Items) != 1 {
		t.Fatalf("items = %v", u.req.Items)
	}
	item := u.req.Items[0]
	if item.ProductID != 7 || !item.ItemPaid.Equal(decimal.NewFromFloat(259.00)) {
		t.Errorf("item = %+v", item)
	}
	wantItemNote := "Matched 'Vintage Canvas Field Jacket' -> 'Vintage Canvas Field Jacket' (100% confidence)"
	if item.Note != wantItemNote {
		t.Errorf("item note = %q, want %q", item.Note, wantItemNote)
	}
	if item.ItemSize == nil || *item.ItemSize != "M" {
		t.Errorf("item size = %v", item.ItemSize)
	}
	wantNote := "Auto-imported from Gmail (Grailed, msg m3). Order ref: GRD-884213."
	if u.req.Note != wantNote {
		t.Errorf("note = %q, want %q", u.req.Note, wantNote)
	}
	data, err := os.ReadFile(historyFile)
	if err != nil || string(data) != "42" {
		t.Errorf("history file = %q, %v; want \"42\"", data, err)
	}
}

func TestSkipsUnknownSender(t *testing.T) {
	tr := &fakeTracker{rate: decimal.NewFromFloat(1.4)}
	p, _ := newProcessor(t, fakeMail{msgs: []mail.Message{
		{ID: "n1", From: "news@example.com", Subject: "Weekly digest", Body: "hello"},
		grailedMsg("m4", "Congrats, you sold Vintage Canvas Field Jacket",
			"Order #: GRD-884213\nSold price: $185.00"),
	}}, tr)

	if err := p.Handle(context.Background(), []byte(notif)); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(tr.upserts) != 1 {
		t.Fatalf("upserts = %d, want 1 (newsletter skipped)", len(tr.upserts))
	}
}

func TestGmailFallbackRef(t *testing.T) {
	tr := &fakeTracker{rate: decimal.NewFromFloat(1.4)}
	p, _ := newProcessor(t, fakeMail{msgs: []mail.Message{
		grailedMsg("m5", "Congrats, you sold Vintage Canvas Field Jacket",
			"Buyer: marta.k\nSold price: $185.00"),
	}}, tr)

	if err := p.Handle(context.Background(), []byte(notif)); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if tr.upserts[0].ref != "gmail:m5" {
		t.Errorf("ref = %q, want gmail:m5", tr.upserts[0].ref)
	}
}

func TestInvalidNotificationIsPermanent(t *testing.T) {
	tr := &fakeTracker{rate: decimal.NewFromFloat(1.4)}
	p, _ := newProcessor(t, fakeMail{}, tr)
	err := p.Handle(context.Background(), []byte("not json"))
	if !errors.Is(err, errs.ErrPermanent) {
		t.Errorf("expected ErrPermanent, got %v", err)
	}
}

func TestMailFailurePropagates(t *testing.T) {
	tr := &fakeTracker{rate: decimal.NewFromFloat(1.4)}
	p, _ := newProcessor(t, fakeMail{err: errs.ErrTransient}, tr)
	err := p.Handle(context.Background(), []byte(notif))
	if !errors.Is(err, errs.ErrTransient) {
		t.Errorf("expected ErrTransient, got %v", err)
	}
	if len(tr.upserts) != 0 {
		t.Errorf("no upserts expected, got %d", len(tr.upserts))
	}
}
