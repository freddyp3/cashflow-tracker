// Package config parses the worker's environment configuration.
//
// Every setting has a default suitable for local development against the
// Pub/Sub emulator and the Spring API on localhost; production overrides come
// from the environment only.
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds every runtime setting for the worker.
type Config struct {
	PubSubProjectID    string
	PubSubTopic        string
	PubSubSubscription string
	PubSubDLQTopic     string
	Concurrency        int
	MaxAttempts        int
	TrackerAPIURL      string
	GmailUser          string
	GmailTokenFile     string
	GmailHistoryFile   string
	WatchRenewInterval time.Duration
	HealthAddr         string
	PubSubEmulatorHost string
	MailSourceDir      string
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) (int, error) {
	v := os.Getenv(key)
	if v == "" {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return n, nil
}

// Load reads the environment into a Config.
func Load() (Config, error) {
	concurrency, err := envInt("WORKER_CONCURRENCY", 4)
	if err != nil {
		return Config{}, err
	}
	maxAttempts, err := envInt("WORKER_MAX_ATTEMPTS", 5)
	if err != nil {
		return Config{}, err
	}
	interval, err := time.ParseDuration(env("WATCH_RENEW_INTERVAL", "24h"))
	if err != nil {
		return Config{}, fmt.Errorf("WATCH_RENEW_INTERVAL: %w", err)
	}
	return Config{
		PubSubProjectID:    env("PUBSUB_PROJECT_ID", "cashflow-local"),
		PubSubTopic:        env("PUBSUB_TOPIC", "gmail-notifications"),
		PubSubSubscription: env("PUBSUB_SUBSCRIPTION", "gmail-notifications-worker"),
		PubSubDLQTopic:     env("PUBSUB_DLQ_TOPIC", "gmail-notifications-dlq"),
		Concurrency:        concurrency,
		MaxAttempts:        maxAttempts,
		TrackerAPIURL:      env("TRACKER_API_URL", "http://localhost:8080"),
		GmailUser:          env("GMAIL_USER", "me"),
		GmailTokenFile:     env("GMAIL_TOKEN_FILE", "/secrets/gmail_token.json"),
		GmailHistoryFile:   env("GMAIL_HISTORY_FILE", "/state/history_id"),
		WatchRenewInterval: interval,
		HealthAddr:         env("HEALTH_ADDR", ":8090"),
		PubSubEmulatorHost: os.Getenv("PUBSUB_EMULATOR_HOST"),
		MailSourceDir:      env("MAIL_SOURCE_DIR", ""),
	}, nil
}
