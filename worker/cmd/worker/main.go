// Command worker is the Gmail push -> Pub/Sub -> order upsert service.
//
// Wiring only: config -> Pub/Sub client (+ emulator resource bootstrap) ->
// mail source -> tracker -> ingest processor -> watch renewer + health
// server -> streaming pull until SIGINT/SIGTERM.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"cloud.google.com/go/pubsub"

	"github.com/freddyp3/cashflow-tracker/worker/internal/config"
	"github.com/freddyp3/cashflow-tracker/worker/internal/health"
	"github.com/freddyp3/cashflow-tracker/worker/internal/ingest"
	"github.com/freddyp3/cashflow-tracker/worker/internal/mail"
	"github.com/freddyp3/cashflow-tracker/worker/internal/tracker"
	"github.com/freddyp3/cashflow-tracker/worker/internal/watch"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lmsgprefix)
	log.SetPrefix("worker ")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	client, err := pubsub.NewClient(ctx, cfg.PubSubProjectID)
	if err != nil {
		log.Fatalf("pubsub client: %v", err)
	}
	defer client.Close()

	var topic *pubsub.Topic
	var sub *pubsub.Subscription
	var dlq *pubsub.Topic
	if cfg.PubSubEmulatorHost != "" {
		// The emulator starts empty; ensure the resources exist.
		topic = ensureTopic(ctx, client, cfg.PubSubTopic)
		sub = ensureSubscription(ctx, client, cfg.PubSubSubscription, topic)
		dlq = ensureTopic(ctx, client, cfg.PubSubDLQTopic)
	} else {
		topic = client.Topic(cfg.PubSubTopic)
		sub = client.Subscription(cfg.PubSubSubscription)
		dlq = client.Topic(cfg.PubSubDLQTopic)
	}

	mailSrc, gmail := mailSource(ctx, cfg)
	mailSourceName := "none"
	switch {
	case cfg.MailSourceDir != "":
		mailSourceName = "directory"
	case gmail != nil:
		mailSourceName = "gmail"
	}

	tr := tracker.NewClient(cfg.TrackerAPIURL)
	processor := ingest.NewProcessor(mailSrc, tr, dlq, cfg.GmailHistoryFile, cfg.MaxAttempts)

	go watch.Renewer{
		Interval: cfg.WatchRenewInterval,
		Call: func(ctx context.Context) error {
			if gmail == nil {
				log.Print("watch: gmail unavailable, skipping renewal")
				return nil
			}
			historyID, err := gmail.Watch(ctx, cfg.PubSubProjectID, cfg.PubSubTopic)
			if err != nil {
				return err
			}
			writeHistoryIDIfEmpty(cfg.GmailHistoryFile, historyID)
			return nil
		},
	}.Run(ctx)

	healthSrv := &http.Server{
		Addr:    cfg.HealthAddr,
		Handler: health.Reporter{GmailConfigured: gmail != nil, MailSource: mailSourceName}.Handler(),
	}
	go func() {
		log.Printf("health endpoint on %s", cfg.HealthAddr)
		if err := healthSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("health server: %v", err)
		}
	}()

	sub.ReceiveSettings.NumGoroutines = 1
	sub.ReceiveSettings.MaxOutstandingMessages = cfg.Concurrency
	log.Printf("receiving on %s with concurrency %d", sub.ID(), cfg.Concurrency)
	if err := sub.Receive(ctx, processor.OnMessage); err != nil && ctx.Err() == nil {
		log.Fatalf("receive: %v", err)
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	healthSrv.Shutdown(shutdownCtx)
	log.Print("shutdown complete")
}

// ensureTopic returns the named topic, creating it on the emulator if absent.
func ensureTopic(ctx context.Context, client *pubsub.Client, name string) *pubsub.Topic {
	topic := client.Topic(name)
	exists, err := topic.Exists(ctx)
	if err != nil {
		log.Fatalf("check topic %s: %v", name, err)
	}
	if !exists {
		topic, err = client.CreateTopic(ctx, name)
		if err != nil {
			log.Fatalf("create topic %s: %v", name, err)
		}
		log.Printf("created topic %s", name)
	}
	return topic
}

// ensureSubscription returns the named subscription on topic, creating it on
// the emulator if absent.
func ensureSubscription(ctx context.Context, client *pubsub.Client, name string, topic *pubsub.Topic) *pubsub.Subscription {
	sub := client.Subscription(name)
	exists, err := sub.Exists(ctx)
	if err != nil {
		log.Fatalf("check subscription %s: %v", name, err)
	}
	if !exists {
		sub, err = client.CreateSubscription(ctx, name, pubsub.SubscriptionConfig{Topic: topic})
		if err != nil {
			log.Fatalf("create subscription %s: %v", name, err)
		}
		log.Printf("created subscription %s", name)
	}
	return sub
}

// mailSource returns a real GmailSource when the token file loads, otherwise
// an Unavailable source plus nil (the caller reports "missing" and skips the
// Gmail watch).
func mailSource(ctx context.Context, cfg config.Config) (mail.MailSource, *mail.GmailSource) {
	if cfg.MailSourceDir != "" {
		log.Printf("mail source: directory %s (demo mode)", cfg.MailSourceDir)
		return mail.DirSource{Dir: cfg.MailSourceDir}, nil
	}
	gmail, err := mail.NewGmailSource(ctx, cfg.GmailTokenFile, cfg.GmailUser)
	if err != nil {
		log.Printf("gmail token not usable (%v); running without gmail", err)
		return mail.Unavailable{Reason: err.Error()}, nil
	}
	log.Print("gmail token loaded")
	return gmail, gmail
}

// writeHistoryIDIfEmpty seeds the history file with the watch's history ID —
// the bootstrap baseline — but never overwrites an existing cursor.
func writeHistoryIDIfEmpty(path string, historyID uint64) {
	if data, err := os.ReadFile(path); err == nil && len(strings.TrimSpace(string(data))) > 0 {
		return
	}
	if err := os.WriteFile(path, []byte(strconv.FormatUint(historyID, 10)), 0o600); err != nil {
		log.Printf("watch: seed history id: %v", err)
	}
}
