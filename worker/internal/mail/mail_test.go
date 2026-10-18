package mail

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/freddyp3/cashflow-tracker/worker/internal/errs"
)

const multipartEML = `From: "eBay" <order@ebay.com>
Subject: Your item sold: Test Widget!
Date: Wed, 14 Oct 2026 18:02:11 +0000
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="B1"

--B1
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

Order #: EB-1
Item price: $10.00
--B1
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: base64

PGh0bWw+PGJvZHk+PHA+SWdub3JlZCBodG1sPC9wPjwvYm9keT48L2h0bWw+
--B1--
`

const htmlOnlyEML = `From: "Depop" <no-reply@depop.com>
Subject: You've sold Test Hat
MIME-Version: 1.0
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: base64

PGh0bWw+PGJvZHk+PHA+T3JkZXIgIzogRFAtMTwvcD48cD5Tb2xkIGZvcjogJDI1PC9wPjwvYm9keT48L2h0bWw+
`

const plainEML = `From: sales@grailed.com
Subject: Congrats, you sold Tee
Date: Mon, 12 Oct 2026 14:32:07 +0000
Content-Type: text/plain; charset="UTF-8"

Order #: GRD-1
Sold price: $30.00
`

func TestDecodeMultipartPrefersPlainAndHonoursEncodings(t *testing.T) {
	m, err := DecodeEML("m1", []byte(multipartEML))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if m.From != `"eBay" <order@ebay.com>` {
		t.Errorf("From = %q", m.From)
	}
	if m.Subject != "Your item sold: Test Widget!" {
		t.Errorf("Subject = %q", m.Subject)
	}
	if m.Date.Format("2006-01-02") != "2026-10-14" {
		t.Errorf("Date = %v", m.Date)
	}
	if !strings.Contains(m.Body, "Order #: EB-1") || !strings.Contains(m.Body, "Item price: $10.00") {
		t.Errorf("Body = %q", m.Body)
	}
	if strings.Contains(m.Body, "Ignored html") {
		t.Errorf("html part should not be used when plain exists: %q", m.Body)
	}
}

func TestDecodeHTMLOnlyFallsBackToHTMLToText(t *testing.T) {
	m, err := DecodeEML("m2", []byte(htmlOnlyEML))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !strings.Contains(m.Body, "Order #: DP-1") || !strings.Contains(m.Body, "Sold for: $25") {
		t.Errorf("Body = %q", m.Body)
	}
	if strings.Contains(m.Body, "<p>") {
		t.Errorf("html tags leaked into body: %q", m.Body)
	}
}

func TestDecodePlain(t *testing.T) {
	m, err := DecodeEML("m3", []byte(plainEML))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if m.ID != "m3" || m.From != "sales@grailed.com" {
		t.Errorf("headers: %+v", m)
	}
	if !strings.Contains(m.Body, "Sold price: $30.00") {
		t.Errorf("Body = %q", m.Body)
	}
}

func TestUnavailableIsTransient(t *testing.T) {
	src := Unavailable{Reason: "no token"}
	if _, err := src.NewMessagesSince(context.Background(), "1"); !errors.Is(err, errs.ErrTransient) {
		t.Errorf("expected ErrTransient, got %v", err)
	}
}
