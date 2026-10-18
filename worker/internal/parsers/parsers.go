// Package parsers turns marketplace sale-confirmation emails into ParsedSale
// values. Ported from automation/gmail_ingest/parsers.py: same regexes (RE2
// syntax, (?i) for Python's re.IGNORECASE), same money/currency table and the
// same sender-domain dispatch.
//
// Every field is extracted defensively: a missing field stays nil and the
// order is still created as a draft — a parser never silently drops an email.
// Prices are assumed USD unless a currency symbol says otherwise.
package parsers

import (
	"regexp"
	"strings"

	"github.com/shopspring/decimal"
)

// ParsedSale is the defensive extraction result for one sale email.
type ParsedSale struct {
	Platform  string
	ItemTitle *string
	BuyerName *string
	Location  *string
	Size      *string
	OrderRef  *string
	Price     *decimal.Decimal
	Shipping  *decimal.Decimal
	Currency  string // default USD
	Warnings  []string
}

// Parser converts a message subject and plain-text body into a ParsedSale.
type Parser func(subject, body string) *ParsedSale

// moneyRe is the Python MONEY_RE ported to RE2: optional 3-letter currency
// code, optional symbol, and an amount of up to 6 digits with a 2-dp fraction.
const moneyRe = `(?P<cur>[A-Z]{3}\s*)?(?P<sym>[$£€]|C\$|CA\$|US\$)?\s*(?P<amt>\d{1,6}(?:[.,]\d{2})?)`

var symbolCurrency = map[string]string{
	"£":   "GBP",
	"€":   "EUR",
	"C$":  "CAD",
	"CA$": "CAD",
	"US$": "USD",
	"$":   "USD",
}

func must(pattern string) *regexp.Regexp {
	return regexp.MustCompile(pattern)
}

// money extracts amount/currency from a match of a pattern containing moneyRe.
func money(re *regexp.Regexp, m []string) (*decimal.Decimal, string) {
	if m == nil {
		return nil, ""
	}
	amount, err := decimal.NewFromString(
		strings.Replace(m[re.SubexpIndex("amt")], ",", ".", 1))
	if err != nil {
		return nil, ""
	}
	currency := ""
	if cur := m[re.SubexpIndex("cur")]; cur != "" {
		currency = strings.ToUpper(strings.TrimSpace(cur))
	} else if sym := m[re.SubexpIndex("sym")]; sym != "" {
		currency = symbolCurrency[sym]
	}
	return &amount, currency
}

func searchMoney(re *regexp.Regexp, text string) (*decimal.Decimal, string) {
	return money(re, re.FindStringSubmatch(text))
}

// first returns the trimmed nth capture group, or nil when the pattern does
// not match or the group captured an empty string (mirrors Python, where ""
// is falsy in the `or` fallback chains).
func first(re *regexp.Regexp, text string, group int) *string {
	m := re.FindStringSubmatch(text)
	if m == nil || group >= len(m) {
		return nil
	}
	s := strings.TrimSpace(m[group])
	if s == "" {
		return nil
	}
	return &s
}

// ---------------------------------------------------------------------------
// Grailed — "Congrats, you sold <item>" / "You made a sale"
// ---------------------------------------------------------------------------

var (
	grailedTitleRe    = must(`(?i)(?:congrats[^\n]*sold|you sold)\s*[:\-]?\s*(.+?)[!\n]`)
	grailedItemRe     = must(`(?i)item\s*[:\-]\s*(.+)`)
	grailedSoldRe     = must(`(?i)sold\s+(?:price|for)\s*[:\-]?\s*` + moneyRe)
	grailedPriceRe    = must(`(?i)(?:earnings|total|price)\s*[:\-]?\s*` + moneyRe)
	grailedShipRe     = must(`(?i)shipping\s*[:\-]?\s*` + moneyRe)
	grailedBuyerRe    = must(`(?i)(?:buyer|sold to)\s*[:\-]?\s*([^\n]+)`)
	grailedSizeRe     = must(`(?i)\bsize\s*[:\-]?\s*([A-Za-z0-9./ ]{1,12})\b`)
	grailedLocationRe = must(`(?i)(?:ships? to|shipping address|destination)\s*[:\-]?\s*([^\n]+)`)
	grailedRefRe      = must(`(?i)order\s*(?:#|number|id)\s*[:\-]?\s*([A-Za-z0-9\-]+)`)
)

// ParseGrailed parses a Grailed sale-confirmation email.
func ParseGrailed(subject, body string) *ParsedSale {
	sale := &ParsedSale{Platform: "Grailed", Currency: "USD"}

	sale.ItemTitle = first(grailedTitleRe, subject+"\n"+body, 1)
	if sale.ItemTitle == nil {
		sale.ItemTitle = first(grailedItemRe, body, 1)
	}

	price, cur := searchMoney(grailedSoldRe, body)
	if price == nil {
		price, cur = searchMoney(grailedPriceRe, body)
	}
	sale.Price = price
	if cur != "" {
		sale.Currency = cur
	}

	sale.Shipping, _ = searchMoney(grailedShipRe, body)
	sale.BuyerName = first(grailedBuyerRe, body, 1)
	sale.Size = first(grailedSizeRe, body, 1)
	sale.Location = first(grailedLocationRe, body, 1)
	sale.OrderRef = first(grailedRefRe, body, 1)
	return sale
}

// ---------------------------------------------------------------------------
// Depop — "You've made a sale!" / receipt emails
// ---------------------------------------------------------------------------

var (
	depopTitleRe    = must(`(?i)you(?:'ve| have)? sold\s*[:\-]?\s*(.+?)[!\n]`)
	depopItemRe     = must(`(?i)item\s*[:\-]\s*(.+)`)
	depopPriceRe    = must(`(?i)(?:item price|sold for|price)\s*[:\-]?\s*` + moneyRe)
	depopTotalRe    = must(`(?i)total\s*[:\-]?\s*` + moneyRe)
	depopShipRe     = must(`(?i)(?:shipping|postage)\s*[:\-]?\s*` + moneyRe)
	depopBuyerRe    = must(`(?i)(?:buyer|sold to|@)\s*[:\-]?\s*([A-Za-z0-9_.\- ]+)`)
	depopSizeRe     = must(`(?i)\bsize\s*[:\-]?\s*([A-Za-z0-9./ ]{1,12})\b`)
	depopLocationRe = must(`(?i)(?:ships? to|deliver(?:y)? to|address)\s*[:\-]?\s*([^\n]+)`)
	depopRefRe      = must(`(?i)(?:receipt|order)\s*(?:#|number|id)?\s*[:\-]?\s*(\d[\dA-Za-z\-]+)`)
)

// ParseDepop parses a Depop sale-confirmation email.
func ParseDepop(subject, body string) *ParsedSale {
	sale := &ParsedSale{Platform: "Depop", Currency: "USD"}

	sale.ItemTitle = first(depopTitleRe, subject+"\n"+body, 1)
	if sale.ItemTitle == nil {
		sale.ItemTitle = first(depopItemRe, body, 1)
	}

	price, cur := searchMoney(depopPriceRe, body)
	if price == nil {
		price, cur = searchMoney(depopTotalRe, body)
	}
	sale.Price = price
	if cur != "" {
		sale.Currency = cur
	}

	sale.Shipping, _ = searchMoney(depopShipRe, body)
	sale.BuyerName = first(depopBuyerRe, body, 1)
	sale.Size = first(depopSizeRe, body, 1)
	sale.Location = first(depopLocationRe, body, 1)
	sale.OrderRef = first(depopRefRe, body, 1)
	return sale
}

// ---------------------------------------------------------------------------
// eBay — "Your item sold!" emails
// ---------------------------------------------------------------------------

var (
	ebayTitleRe    = must(`(?i)(?:your item sold|sold)\s*[:!\-]?\s*(.+?)[!\n]`)
	ebayItemRe     = must(`(?i)item\s*[:\-]\s*(.+)`)
	ebayPriceRe    = must(`(?i)(?:sold (?:price|for)|item price|price)\s*[:\-]?\s*` + moneyRe)
	ebayTotalRe    = must(`(?i)(?:order )?total\s*[:\-]?\s*` + moneyRe)
	ebayShipRe     = must(`(?i)(?:shipping|postage|delivery)\s*[:\-]?\s*` + moneyRe)
	ebayBuyerRe    = must(`(?i)buyer\s*(?:username)?\s*[:\-]?\s*([A-Za-z0-9_.\- ]+)`)
	ebaySizeRe     = must(`(?i)\bsize\s*[:\-]?\s*([A-Za-z0-9./ ]{1,12})\b`)
	ebayLocationRe = must(`(?i)(?:ship(?:s|ping)? to|deliver to)\s*[:\-]?\s*([^\n]+)`)
	ebayRefRe      = must(`(?i)order\s*(?:#|number|id)\s*[:\-]?\s*([\dA-Za-z\-]+)`)
)

// ParseEbay parses an eBay "your item sold" email.
func ParseEbay(subject, body string) *ParsedSale {
	sale := &ParsedSale{Platform: "eBay", Currency: "USD"}

	sale.ItemTitle = first(ebayTitleRe, subject+"\n"+body, 1)
	if sale.ItemTitle == nil {
		sale.ItemTitle = first(ebayItemRe, body, 1)
	}

	price, cur := searchMoney(ebayPriceRe, body)
	if price == nil {
		price, cur = searchMoney(ebayTotalRe, body)
	}
	sale.Price = price
	if cur != "" {
		sale.Currency = cur
	}

	sale.Shipping, _ = searchMoney(ebayShipRe, body)
	sale.BuyerName = first(ebayBuyerRe, body, 1)
	sale.Size = first(ebaySizeRe, body, 1)
	sale.Location = first(ebayLocationRe, body, 1)
	sale.OrderRef = first(ebayRefRe, body, 1)
	return sale
}

// ---------------------------------------------------------------------------
// Dispatch by sender
// ---------------------------------------------------------------------------

var parsers = map[string]Parser{
	"grailed.com": ParseGrailed,
	"depop.com":   ParseDepop,
	"ebay.com":    ParseEbay,
	"ebay.ca":     ParseEbay,
}

// ForSender returns the parser for the email's From header, or nil when the
// sender is not a recognised marketplace (non-sale mail shares the mailbox).
func ForSender(fromHeader string) Parser {
	sender := strings.ToLower(fromHeader)
	for domain, parser := range parsers {
		if strings.Contains(sender, domain) {
			return parser
		}
	}
	return nil
}
