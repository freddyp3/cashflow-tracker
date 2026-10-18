package parsers_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/shopspring/decimal"

	"github.com/freddyp3/cashflow-tracker/worker/internal/mail"
	"github.com/freddyp3/cashflow-tracker/worker/internal/parsers"
)

func strEq(got *string, want string) bool {
	return got != nil && *got == want
}

func decEq(got *decimal.Decimal, want string) bool {
	if got == nil {
		return false
	}
	expected, err := decimal.NewFromString(want)
	return err == nil && got.Equal(expected)
}

type expectedSale struct {
	platform string
	title    string
	price    string // "" = nil expected
	currency string
	shipping string
	buyer    string
	size     string
	location string
	orderRef string
}

func checkSale(t *testing.T, name string, sale *parsers.ParsedSale, want expectedSale) {
	t.Helper()
	if sale.Platform != want.platform {
		t.Errorf("%s: platform = %q, want %q", name, sale.Platform, want.platform)
	}
	if !strEq(sale.ItemTitle, want.title) {
		t.Errorf("%s: title = %v, want %q", name, sale.ItemTitle, want.title)
	}
	if want.price == "" {
		if sale.Price != nil {
			t.Errorf("%s: price = %v, want nil", name, sale.Price)
		}
	} else if !decEq(sale.Price, want.price) {
		t.Errorf("%s: price = %v, want %s", name, sale.Price, want.price)
	}
	if sale.Currency != want.currency {
		t.Errorf("%s: currency = %q, want %q", name, sale.Currency, want.currency)
	}
	if !decEq(sale.Shipping, want.shipping) {
		t.Errorf("%s: shipping = %v, want %s", name, sale.Shipping, want.shipping)
	}
	if !strEq(sale.BuyerName, want.buyer) {
		t.Errorf("%s: buyer = %v, want %q", name, sale.BuyerName, want.buyer)
	}
	if !strEq(sale.Size, want.size) {
		t.Errorf("%s: size = %v, want %q", name, sale.Size, want.size)
	}
	if !strEq(sale.Location, want.location) {
		t.Errorf("%s: location = %v, want %q", name, sale.Location, want.location)
	}
	if !strEq(sale.OrderRef, want.orderRef) {
		t.Errorf("%s: order ref = %v, want %q", name, sale.OrderRef, want.orderRef)
	}
}

func TestFixtures(t *testing.T) {
	cases := []struct {
		file string
		want expectedSale
	}{
		{"grailed_plain.eml", expectedSale{
			platform: "Grailed", title: "Vintage Canvas Field Jacket",
			price: "185.00", currency: "USD", shipping: "12.50",
			buyer: "marta.k", size: "M", location: "Portland, OR, USA",
			orderRef: "GRD-884213",
		}},
		{"grailed_html.eml", expectedSale{
			platform: "Grailed", title: "Leather Biker Jacket",
			price: "220.00", currency: "USD", shipping: "14.00",
			buyer: "jon_doe", size: "L", location: "Calgary, AB, CAN",
			orderRef: "GRD-771455",
		}},
		{"depop_plain.eml", expectedSale{
			platform: "Depop", title: "Corduroy Bucket Hat",
			price: "62.00", currency: "USD", shipping: "6.99",
			buyer: "sunnydays", size: "L", location: "Leeds, United Kingdom",
			orderRef: "4471DP",
		}},
		{"depop_html.eml", expectedSale{
			platform: "Depop", title: "Vintage Denim Skirt",
			price: "40.00", currency: "GBP", shipping: "3.50",
			buyer: "thr1ft_queen", size: "8", location: "Glasgow, United Kingdom",
			orderRef: "8820DP",
		}},
		{"ebay_plain.eml", expectedSale{
			platform: "eBay", title: "Vintage Wool Cardigan",
			price: "95.00", currency: "USD", shipping: "9.00",
			buyer: "chris_p", size: "10", location: "Austin, TX, USA",
			orderRef: "15-08492-77120",
		}},
		{"ebay_html.eml", expectedSale{
			platform: "eBay", title: "Retro Windbreaker",
			price: "58.00", currency: "CAD", shipping: "11.25",
			buyer: "maple_leaf88", size: "XL", location: "Winnipeg, MB, CAN",
			orderRef: "26-11455-00231",
		}},
	}
	for _, tc := range cases {
		t.Run(tc.file, func(t *testing.T) {
			raw, err := os.ReadFile(filepath.Join("testdata", tc.file))
			if err != nil {
				t.Fatalf("read fixture: %v", err)
			}
			msg, err := mail.DecodeEML("test-"+tc.file, raw)
			if err != nil {
				t.Fatalf("decode fixture: %v", err)
			}
			parser := parsers.ForSender(msg.From)
			if parser == nil {
				t.Fatalf("no parser for From %q", msg.From)
			}
			checkSale(t, tc.file, parser(msg.Subject, msg.Body), tc.want)
		})
	}
}

// TestSmoke ports the three Python smoke cases verbatim.
func TestSmoke(t *testing.T) {
	grailed := parsers.ParseGrailed("Congrats, you sold Penguin Shirt!",
		"Sold price: $45.00\nOrder #: ABC123")
	if grailed.Platform != "Grailed" || !decEq(grailed.Price, "45.00") {
		t.Errorf("grailed smoke: %+v", grailed)
	}

	depop := parsers.ParseDepop("You've made a sale!",
		"Item price: $45.00\nOrder #: 12345")
	if depop.Platform != "Depop" || !decEq(depop.Price, "45.00") {
		t.Errorf("depop smoke: %+v", depop)
	}

	ebay := parsers.ParseEbay("Your item sold!",
		"Sold price: $45.00\nOrder #: ABC123")
	if ebay.Platform != "eBay" || !decEq(ebay.Price, "45.00") {
		t.Errorf("ebay smoke: %+v", ebay)
	}
}

// TestNoPriceFixture produces a sale with nil price (draft path upstream).
func TestNoPriceFixture(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("testdata", "grailed_noprice.eml"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	msg, err := mail.DecodeEML("test-noprice", raw)
	if err != nil {
		t.Fatalf("decode fixture: %v", err)
	}
	sale := parsers.ForSender(msg.From)(msg.Subject, msg.Body)
	checkSale(t, "grailed_noprice.eml", sale, expectedSale{
		platform: "Grailed", title: "Canvas Tote Bag",
		price: "", currency: "USD", shipping: "8.00",
		buyer: "theo_r", size: "One Size", location: "Reno, NV, USA",
		orderRef: "GRD-900112",
	})
}

func TestForSender(t *testing.T) {
	cases := []struct {
		from     string
		platform string // "" = nil expected
	}{
		{"sales@grailed.com", "Grailed"},
		{"Grailed <sales@grailed.com>", "Grailed"},
		{"no-reply@depop.com", "Depop"},
		{"order@ebay.com", "eBay"},
		{"order@ebay.ca", "eBay"},
		{"news@example.com", ""},
		{"seller@example.test", ""},
	}
	for _, tc := range cases {
		parser := parsers.ForSender(tc.from)
		if tc.platform == "" {
			if parser != nil {
				t.Errorf("ForSender(%q): expected nil", tc.from)
			}
			continue
		}
		if parser == nil {
			t.Errorf("ForSender(%q): expected %s parser, got nil", tc.from, tc.platform)
			continue
		}
		if got := parser("subj", "body").Platform; got != tc.platform {
			t.Errorf("ForSender(%q) platform = %q, want %q", tc.from, got, tc.platform)
		}
	}
}

func TestHTMLToTextStripsScriptAndStyle(t *testing.T) {
	doc := `<html><head><style>body { color: red }</style><script>alert(1)</script></head>` +
		`<body><p>Hello</p><p>World</p><script>tracker()</script></body></html>`
	text := parsers.HTMLToText(doc)
	for _, bad := range []string{"alert", "tracker", "color", "<p>"} {
		if strings.Contains(text, bad) {
			t.Errorf("HTMLToText kept %q in %q", bad, text)
		}
	}
	if !strings.Contains(text, "Hello") || !strings.Contains(text, "World") {
		t.Errorf("HTMLToText lost content: %q", text)
	}
}
