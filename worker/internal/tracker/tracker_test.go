package tracker

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/shopspring/decimal"

	"github.com/freddyp3/cashflow-tracker/worker/internal/errs"
)

func TestRateCachingOneCallPerCurrency(t *testing.T) {
	var rateCalls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&rateCalls, 1)
		json.NewEncoder(w).Encode(map[string]any{"rate": 1.4})
	}))
	defer srv.Close()

	c := NewClient(srv.URL)
	ctx := context.Background()

	got, err := c.ToCAD(ctx, decimal.NewFromInt(10), "USD")
	if err != nil {
		t.Fatalf("ToCAD: %v", err)
	}
	if !got.Equal(decimal.NewFromFloat(14.00)) {
		t.Errorf("ToCAD = %s, want 14.00", got)
	}
	if _, err := c.ToCAD(ctx, decimal.NewFromInt(10), "USD"); err != nil {
		t.Fatalf("ToCAD second: %v", err)
	}
	if got, err := c.ToCAD(ctx, decimal.NewFromInt(5), "CAD"); err != nil || !got.Equal(decimal.NewFromInt(5)) {
		t.Errorf("CAD ToCAD = %s, %v", got, err)
	}
	if atomic.LoadInt32(&rateCalls) != 1 {
		t.Errorf("rate calls = %d, want 1 (USD cached, CAD never fetched)", rateCalls)
	}
}

func TestMatchProduct(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode([]Product{
			{ProductID: 1, ProductName: "Penguin Shirt"},
			{ProductID: 2, ProductName: "Denim Jacket"},
		})
	}))
	defer srv.Close()

	c := NewClient(srv.URL)
	ctx := context.Background()

	m, err := c.MatchProduct(ctx, "vintage Penguin Shirt size L", 0.45)
	if err != nil {
		t.Fatalf("MatchProduct: %v", err)
	}
	if m == nil || m.ProductID != 1 || m.Score != 1.0 {
		t.Fatalf("substring match = %+v, want product 1 score 1.0", m)
	}

	m, err = c.MatchProduct(ctx, "penguin shrt", 0.45)
	if err != nil {
		t.Fatalf("MatchProduct fuzzy: %v", err)
	}
	if m == nil || m.ProductID != 1 {
		t.Fatalf("fuzzy match = %+v, want product 1", m)
	}

	m, err = c.MatchProduct(ctx, "kitchen sink garbage", 0.45)
	if err != nil {
		t.Fatalf("MatchProduct below: %v", err)
	}
	if m != nil {
		t.Fatalf("below cutoff should be nil, got %+v", m)
	}
}

type upsertCall struct {
	path   string
	method string
	body   OrderRequest
}

func upsertServer(t *testing.T, status int, calls *[]upsertCall) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req OrderRequest
		json.NewDecoder(r.Body).Decode(&req)
		*calls = append(*calls, upsertCall{path: r.URL.EscapedPath(), method: r.Method, body: req})
		w.WriteHeader(status)
		w.Write([]byte(`{}`))
	}))
}

func TestUpsertExternalStatusesAndEscaping(t *testing.T) {
	ctx := context.Background()
	req := OrderRequest{Platform: "eBay", Revenue: decimal.NewFromInt(10)}

	for _, status := range []int{200, 201} {
		var calls []upsertCall
		srv := upsertServer(t, status, &calls)
		c := NewClient(srv.URL)
		if err := c.UpsertExternal(ctx, "eBay", "EB 1001", req); err != nil {
			t.Errorf("status %d: %v", status, err)
		}
		if calls[0].method != http.MethodPut ||
			calls[0].path != "/api/orders/external/eBay/EB%201001" {
			t.Errorf("call = %s %s", calls[0].method, calls[0].path)
		}
		srv.Close()
	}

	var calls []upsertCall
	srv := upsertServer(t, http.StatusInternalServerError, &calls)
	c := NewClient(srv.URL)
	if err := c.UpsertExternal(ctx, "eBay", "EB-1", req); !errors.Is(err, errs.ErrTransient) {
		t.Errorf("500 should be ErrTransient, got %v", err)
	}
	srv.Close()

	srv = upsertServer(t, http.StatusBadRequest, &calls)
	c = NewClient(srv.URL)
	if err := c.UpsertExternal(ctx, "eBay", "EB-1", req); !errors.Is(err, errs.ErrPermanent) {
		t.Errorf("400 should be ErrPermanent, got %v", err)
	}
	srv.Close()

	// Transport error (unreachable host) must be transient.
	c = NewClient("http://127.0.0.1:1")
	err := c.UpsertExternal(ctx, "eBay", "EB-1", req)
	if !errors.Is(err, errs.ErrTransient) {
		t.Errorf("transport error should be ErrTransient, got %v", err)
	}
	if !strings.Contains(err.Error(), "EB-1") {
		t.Errorf("error should name the ref: %v", err)
	}
}
