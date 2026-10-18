// Package tracker is the worker's client for the Spring Boot order-tracker
// API: FX rates (cached per currency), the product catalog (cached once per
// process), fuzzy product matching, and the external-ref order upsert.
package tracker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/shopspring/decimal"

	"github.com/freddyp3/cashflow-tracker/worker/internal/errs"
)

// Product is the subset of the Spring product entity the matcher needs.
type Product struct {
	ProductID   int    `json:"productId"`
	ProductName string `json:"productName"`
}

// ProductMatch is the best fuzzy match for a listing title.
type ProductMatch struct {
	ProductID   int
	ProductName string
	Score       float64
}

// OrderItemRequest mirrors the Spring OrderItemRequest DTO.
type OrderItemRequest struct {
	ProductID int             `json:"productId"`
	ItemPaid  decimal.Decimal `json:"itemPaid"`
	ItemSize  *string         `json:"itemSize"`
	Note      string          `json:"note"`
}

// OrderRequest mirrors the Spring OrderRequest DTO (subset the worker sends).
type OrderRequest struct {
	Platform         string             `json:"platform"`
	Revenue          decimal.Decimal    `json:"revenue"`
	Shipping         decimal.Decimal    `json:"shipping"`
	CustomerName     string             `json:"customerName"`
	ShippingLocation string             `json:"shippingLocation"`
	Draft            bool               `json:"draft"`
	OrderDate        string             `json:"orderDate"`
	Note             string             `json:"note"`
	Items            []OrderItemRequest `json:"items"`
}

// Client calls the Spring API and caches rates/products in memory.
type Client struct {
	baseURL string
	http    *http.Client

	mu        sync.Mutex
	rateCache map[string]decimal.Decimal
	products  []Product
}

// NewClient builds a Client for the given base URL (e.g. http://localhost:8080).
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL:   strings.TrimRight(baseURL, "/"),
		http:      &http.Client{Timeout: 15 * time.Second},
		rateCache: map[string]decimal.Decimal{},
	}
}

// RateToCAD returns the live FX rate to CAD for currency, cached per currency
// per process. CAD itself is 1 with no HTTP call.
func (c *Client) RateToCAD(ctx context.Context, currency string) (decimal.Decimal, error) {
	currency = strings.ToUpper(currency)
	if currency == "CAD" {
		return decimal.NewFromInt(1), nil
	}
	c.mu.Lock()
	if r, ok := c.rateCache[currency]; ok {
		c.mu.Unlock()
		return r, nil
	}
	c.mu.Unlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.baseURL+"/api/currency/rates?from="+url.QueryEscape(currency), nil)
	if err != nil {
		return decimal.Zero, err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return decimal.Zero, fmt.Errorf("rates: %w", errs.ErrTransient)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 500 {
		return decimal.Zero, fmt.Errorf("rates: status %d: %w", resp.StatusCode, errs.ErrTransient)
	}
	if resp.StatusCode >= 400 {
		return decimal.Zero, fmt.Errorf("rates: status %d: %w", resp.StatusCode, errs.ErrPermanent)
	}
	var body struct {
		Rate decimal.Decimal `json:"rate"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return decimal.Zero, fmt.Errorf("rates decode: %w", errs.ErrPermanent)
	}
	c.mu.Lock()
	c.rateCache[currency] = body.Rate
	c.mu.Unlock()
	return body.Rate, nil
}

// ToCAD converts amount from currency to CAD, rounded half-up to 2 dp.
func (c *Client) ToCAD(ctx context.Context, amount decimal.Decimal, currency string) (decimal.Decimal, error) {
	rate, err := c.RateToCAD(ctx, currency)
	if err != nil {
		return decimal.Zero, err
	}
	return amount.Mul(rate).Round(2), nil
}

// Products returns the catalog, fetched once per process.
func (c *Client) Products(ctx context.Context) ([]Product, error) {
	c.mu.Lock()
	if c.products != nil {
		defer c.mu.Unlock()
		return c.products, nil
	}
	c.mu.Unlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/products", nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("products: %w", errs.ErrTransient)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 500 {
		return nil, fmt.Errorf("products: status %d: %w", resp.StatusCode, errs.ErrTransient)
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("products: status %d: %w", resp.StatusCode, errs.ErrPermanent)
	}
	var products []Product
	if err := json.NewDecoder(resp.Body).Decode(&products); err != nil {
		return nil, fmt.Errorf("products decode: %w", errs.ErrPermanent)
	}
	c.mu.Lock()
	c.products = products
	c.mu.Unlock()
	return products, nil
}

// MatchProduct fuzzy-matches a listing title to a catalog product: direct
// substring containment scores 1.0, otherwise 2*LCS/(len+len) as an
// approximation of difflib's ratio; the best score >= cutoff wins.
func (c *Client) MatchProduct(ctx context.Context, listingTitle string, cutoff float64) (*ProductMatch, error) {
	products, err := c.Products(ctx)
	if err != nil {
		return nil, err
	}
	title := strings.ToLower(strings.TrimSpace(listingTitle))
	var best *ProductMatch
	for _, p := range products {
		name := p.ProductName
		nameL := strings.ToLower(name)
		var score float64
		if strings.Contains(title, nameL) {
			score = 1.0
		} else {
			score = similarity(nameL, title)
		}
		if score >= cutoff && (best == nil || score > best.Score) {
			best = &ProductMatch{ProductID: p.ProductID, ProductName: name, Score: score}
		}
	}
	return best, nil
}

// similarity approximates difflib.SequenceMatcher.ratio as 2*LCS/(len(a)+len(b)).
func similarity(a, b string) float64 {
	ar, br := []rune(a), []rune(b)
	if len(ar)+len(br) == 0 {
		return 1
	}
	return 2 * float64(lcs(ar, br)) / float64(len(ar)+len(br))
}

// lcs is the classic O(n*m) longest-common-subsequence length over runes.
func lcs(a, b []rune) int {
	prev := make([]int, len(b)+1)
	for _, ca := range a {
		cur := make([]int, len(b)+1)
		for j, cb := range b {
			if ca == cb {
				cur[j+1] = prev[j] + 1
			} else if cur[j] > prev[j+1] {
				cur[j+1] = cur[j]
			} else {
				cur[j+1] = prev[j+1]
			}
		}
		prev = cur
	}
	return prev[len(b)]
}

// UpsertExternal PUTs the order to /api/orders/external/{platform}/{ref}.
// 2xx is success; 4xx is permanent; 5xx and transport errors are transient.
func (c *Client) UpsertExternal(ctx context.Context, platform, ref string, req OrderRequest) error {
	payload, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("marshal order: %w", errs.ErrPermanent)
	}
	uri := c.baseURL + "/api/orders/external/" + url.PathEscape(platform) + "/" + url.PathEscape(ref)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPut, uri, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(httpReq)
	if err != nil {
		return fmt.Errorf("upsert %s/%s: %w", platform, ref, errs.ErrTransient)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
	switch {
	case resp.StatusCode >= 200 && resp.StatusCode < 300:
		return nil
	case resp.StatusCode >= 400 && resp.StatusCode < 500:
		return fmt.Errorf("upsert %s/%s: status %d: %w", platform, ref, resp.StatusCode, errs.ErrPermanent)
	default:
		return fmt.Errorf("upsert %s/%s: status %d: %w", platform, ref, resp.StatusCode, errs.ErrTransient)
	}
}
