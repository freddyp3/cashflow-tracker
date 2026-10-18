package ingest

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"cloud.google.com/go/pubsub"
	"google.golang.org/api/iterator"

	"github.com/freddyp3/cashflow-tracker/worker/internal/errs"
	"github.com/freddyp3/cashflow-tracker/worker/internal/mail"
	"github.com/freddyp3/cashflow-tracker/worker/internal/tracker"
)

// The tests in this file need a live Pub/Sub emulator; they are skipped when
// PUBSUB_EMULATOR_HOST is unset (e.g. `go test ./...` outside docker compose).

func emulatorClient(t *testing.T) (*pubsub.Client, context.Context) {
	t.Helper()
	if os.Getenv("PUBSUB_EMULATOR_HOST") == "" {
		t.Skip("PUBSUB_EMULATOR_HOST not set; skipping emulator test")
	}
	ctx := context.Background()
	project := os.Getenv("PUBSUB_PROJECT_ID")
	if project == "" {
		project = "cashflow-local"
	}
	var client *pubsub.Client
	var err error
	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		client, err = pubsub.NewClient(ctx, project)
		if err == nil {
			it := client.Topics(ctx)
			if _, terr := it.Next(); terr == nil || terr == iterator.Done {
				return client, ctx
			}
		}
		time.Sleep(500 * time.Millisecond)
	}
	t.Fatalf("emulator not reachable within 30s: %v", err)
	return nil, nil
}

func uniqueName(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}

func createTopic(t *testing.T, ctx context.Context, client *pubsub.Client, name string) *pubsub.Topic {
	t.Helper()
	topic, err := client.CreateTopic(ctx, name)
	if err != nil {
		t.Fatalf("create topic %s: %v", name, err)
	}
	t.Cleanup(func() { topic.Delete(context.Background()) })
	return topic
}

func createSubscription(t *testing.T, ctx context.Context, client *pubsub.Client, name string, topic *pubsub.Topic) *pubsub.Subscription {
	t.Helper()
	sub, err := client.CreateSubscription(ctx, name, pubsub.SubscriptionConfig{Topic: topic})
	if err != nil {
		t.Fatalf("create subscription %s: %v", name, err)
	}
	t.Cleanup(func() { sub.Delete(context.Background()) })
	return sub
}

// TestEmulatorDuplicateNotificationsYieldOneOrder publishes the same Gmail
// push twice: both deliveries run the parser + upsert, but the Spring upsert
// keyed on (platform, external_ref) yields exactly one order.
func TestEmulatorDuplicateNotificationsYieldOneOrder(t *testing.T) {
	client, ctx := emulatorClient(t)
	defer client.Close()

	raw, err := os.ReadFile(filepath.Join("..", "parsers", "testdata", "grailed_plain.eml"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	msg, err := mail.DecodeEML("m-grailed-1", raw)
	if err != nil {
		t.Fatalf("decode fixture: %v", err)
	}
	mailSrc := fakeMail{msgs: []mail.Message{msg}}

	var mu sync.Mutex
	orders := map[string]int{}
	upsertCalls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasPrefix(r.URL.Path, "/api/currency/rates"):
			json.NewEncoder(w).Encode(map[string]any{"rate": 1.35})
		case r.URL.Path == "/api/products":
			json.NewEncoder(w).Encode([]tracker.Product{{ProductID: 1, ProductName: "Vintage Canvas Field Jacket"}})
		case strings.HasPrefix(r.URL.Path, "/api/orders/external/"):
			key := strings.TrimPrefix(r.URL.Path, "/api/orders/external/")
			mu.Lock()
			upsertCalls++
			orders[key]++
			first := orders[key] == 1
			mu.Unlock()
			if first {
				w.WriteHeader(http.StatusCreated)
			} else {
				w.WriteHeader(http.StatusOK)
			}
			w.Write([]byte(`{}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer srv.Close()

	suffix := uniqueName("t")
	topic := createTopic(t, ctx, client, suffix)
	sub := createSubscription(t, ctx, client, suffix+"-sub", topic)
	dlq := createTopic(t, ctx, client, suffix+"-dlq")

	processor := NewProcessor(mailSrc, tracker.NewClient(srv.URL), dlq,
		filepath.Join(t.TempDir(), "history_id"), 3)

	payload := []byte(`{"emailAddress":"seller@example.test","historyId":"12345"}`)
	for i := 0; i < 2; i++ {
		if _, err := topic.Publish(ctx, &pubsub.Message{Data: payload}).Get(ctx); err != nil {
			t.Fatalf("publish: %v", err)
		}
	}

	receiveCtx, cancelReceive := context.WithCancel(ctx)
	defer cancelReceive()
	sub.ReceiveSettings.MaxOutstandingMessages = 4
	go sub.Receive(receiveCtx, processor.OnMessage)

	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		mu.Lock()
		n := upsertCalls
		mu.Unlock()
		if n >= 2 {
			break
		}
		time.Sleep(200 * time.Millisecond)
	}
	cancelReceive()
	time.Sleep(200 * time.Millisecond) // let in-flight deliveries settle

	mu.Lock()
	defer mu.Unlock()
	t.Logf("orders=%d upserts=%d", len(orders), upsertCalls)
	if len(orders) != 1 {
		t.Fatalf("orders = %d keys (%v), want exactly 1", len(orders), orders)
	}
	if upsertCalls < 2 {
		t.Fatalf("upsert calls = %d, want >= 2", upsertCalls)
	}
}

// TestEmulatorPoisonMessageIsDeadLettered drives the simulated dead-letter
// path: a permanently failing MailSource is nacked until MaxAttempts, then
// the processor publishes the original message (plus a reason attribute) to
// the DLQ topic itself.
func TestEmulatorPoisonMessageIsDeadLettered(t *testing.T) {
	client, ctx := emulatorClient(t)
	defer client.Close()

	mailSrc := fakeMail{err: errs.ErrTransient}
	srv := httptest.NewServer(http.NotFoundHandler())
	defer srv.Close()

	suffix := uniqueName("t")
	topic := createTopic(t, ctx, client, suffix)
	sub := createSubscription(t, ctx, client, suffix+"-sub", topic)
	dlq := createTopic(t, ctx, client, suffix+"-dlq")
	dlqSub := createSubscription(t, ctx, client, suffix+"-dlq-sub", dlq)

	processor := NewProcessor(mailSrc, tracker.NewClient(srv.URL), dlq,
		filepath.Join(t.TempDir(), "history_id"), 3)

	pubID, err := topic.Publish(ctx, &pubsub.Message{
		Data:       []byte(`{"emailAddress":"seller@example.test","historyId":"99999"}`),
		Attributes: map[string]string{"origin": "emulator-test"},
	}).Get(ctx)
	if err != nil {
		t.Fatalf("publish: %v", err)
	}

	receiveCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	go sub.Receive(receiveCtx, processor.OnMessage)

	dlqReceived := make(chan *pubsub.Message, 1)
	go dlqSub.Receive(receiveCtx, func(_ context.Context, m *pubsub.Message) {
		select {
		case dlqReceived <- m:
		default:
		}
		m.Ack()
	})

	select {
	case m := <-dlqReceived:
		if m.Attributes["reason"] == "" {
			t.Error("DLQ message missing 'reason' attribute")
		}
		if m.Attributes["origin"] != "emulator-test" {
			t.Errorf("origin attribute = %q, want emulator-test", m.Attributes["origin"])
		}
		t.Logf("dlq received after %d attempts", processor.Attempts(pubID))
	case <-time.After(30 * time.Second):
		t.Fatal("no DLQ message within 30s")
	}
	cancel()
}
