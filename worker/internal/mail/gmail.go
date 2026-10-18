package mail

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"

	"github.com/freddyp3/cashflow-tracker/worker/internal/errs"
)

// GmailSource is a MailSource backed by the Gmail API. It lists
// messageAdded history entries since the stored history ID, then fetches each
// new message in `raw` format and decodes it as .eml.
type GmailSource struct {
	svc  *gmail.Service
	user string
}

// tokenFile mirrors the JSON shape written by Python's Credentials.to_json().
type tokenFile struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RefreshToken string `json:"refresh_token"`
	TokenURI     string `json:"token_uri"`
}

// NewGmailSource builds a GmailSource from the OAuth2 token JSON at path
// (the same file the Python worker produced).
func NewGmailSource(ctx context.Context, tokenPath, user string) (*GmailSource, error) {
	raw, err := os.ReadFile(tokenPath)
	if err != nil {
		return nil, fmt.Errorf("read token file: %w", err)
	}
	var tf tokenFile
	if err := json.Unmarshal(raw, &tf); err != nil {
		return nil, fmt.Errorf("parse token file: %w", err)
	}
	tokenURI := tf.TokenURI
	if tokenURI == "" {
		tokenURI = google.Endpoint.TokenURL
	}
	conf := &oauth2.Config{
		ClientID:     tf.ClientID,
		ClientSecret: tf.ClientSecret,
		Endpoint:     oauth2.Endpoint{TokenURL: tokenURI},
		Scopes:       []string{gmail.GmailReadonlyScope, gmail.GmailModifyScope},
	}
	token := &oauth2.Token{RefreshToken: tf.RefreshToken, TokenType: "Bearer"}
	svc, err := gmail.NewService(ctx, option.WithHTTPClient(conf.Client(ctx, token)))
	if err != nil {
		return nil, fmt.Errorf("build gmail service: %w", err)
	}
	return &GmailSource{svc: svc, user: user}, nil
}

// NewMessagesSince lists messageAdded history since lastHistoryID and decodes
// each new message. An empty lastHistoryID yields no messages (there is no
// baseline to diff against). API failures are transient.
func (s *GmailSource) NewMessagesSince(ctx context.Context, lastHistoryID string) ([]Message, error) {
	if lastHistoryID == "" {
		return nil, nil
	}
	startID, err := strconv.ParseUint(lastHistoryID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid history id %q: %w", lastHistoryID, errs.ErrPermanent)
	}
	call := s.svc.Users.History.List(s.user).
		StartHistoryId(startID).
		HistoryTypes("messageAdded")

	var ids []string
	err = call.Pages(ctx, func(page *gmail.ListHistoryResponse) error {
		for _, h := range page.History {
			for _, added := range h.MessagesAdded {
				if added.Message != nil {
					ids = append(ids, added.Message.Id)
				}
			}
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("history list: %w", errs.ErrTransient)
	}

	var out []Message
	for _, id := range ids {
		full, err := s.svc.Users.Messages.Get(s.user, id).Format("raw").Context(ctx).Do()
		if err != nil {
			return nil, fmt.Errorf("message get %s: %w", id, errs.ErrTransient)
		}
		m, err := DecodeGmailRaw(id, full.Raw)
		if err != nil {
			return nil, fmt.Errorf("decode message %s: %w", id, errs.ErrPermanent)
		}
		if m.Date.IsZero() {
			m.Date = DateFromMillis(full.InternalDate)
		}
		out = append(out, m)
	}
	return out, nil
}

// Watch renews the Gmail push watch for the given Pub/Sub topic and returns
// the current history ID — the bootstrap baseline for the first ingest.
func (s *GmailSource) Watch(ctx context.Context, projectID, topic string) (uint64, error) {
	resp, err := s.svc.Users.Watch(s.user, &gmail.WatchRequest{
		TopicName: "projects/" + projectID + "/topics/" + topic,
		LabelIds:  []string{"INBOX"},
	}).Context(ctx).Do()
	if err != nil {
		return 0, fmt.Errorf("gmail watch: %w", errs.ErrTransient)
	}
	return resp.HistoryId, nil
}
