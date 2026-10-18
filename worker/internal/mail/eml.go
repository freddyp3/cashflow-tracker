package mail

import (
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net/mail"
	"strings"
	"time"

	"github.com/freddyp3/cashflow-tracker/worker/internal/parsers"
)

// DecodeEML parses a raw RFC-822 message into a Message. The body is the
// concatenation of all text/plain parts when present, otherwise HTMLToText of
// the concatenated text/html parts. base64 and quoted-printable transfer
// encodings are honoured.
func DecodeEML(id string, raw []byte) (Message, error) {
	// Gmail raw messages are CRLF; fixtures written with LF line endings are
	// normalised so mime/multipart (which requires CRLF) parses them.
	text := strings.ReplaceAll(string(raw), "\r\n", "\n")
	text = strings.ReplaceAll(text, "\n", "\r\n")
	msg, err := mail.ReadMessage(strings.NewReader(text))
	if err != nil {
		return Message{}, fmt.Errorf("parse eml: %w", err)
	}

	m := Message{ID: id, From: msg.Header.Get("From"), Subject: msg.Header.Get("Subject")}
	if d, err := mail.ParseDate(msg.Header.Get("Date")); err == nil {
		m.Date = d.UTC()
	}

	mediaType, params, _ := mime.ParseMediaType(msg.Header.Get("Content-Type"))
	var plain, htmlParts []string
	if strings.HasPrefix(mediaType, "multipart/") {
		r := multipart.NewReader(msg.Body, params["boundary"])
		for {
			part, err := r.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				return Message{}, fmt.Errorf("read mime part: %w", err)
			}
			partType, _, _ := mime.ParseMediaType(part.Header.Get("Content-Type"))
			text, err := decodePart(part, part.Header.Get("Content-Transfer-Encoding"))
			if err != nil {
				return Message{}, err
			}
			switch {
			case strings.HasPrefix(partType, "multipart/"):
				// Nested multiparts are flattened one level: treat its decoded
				// content as opaque and let the top-level reader handle common mail.
				continue
			case partType == "" || partType == "text/plain":
				plain = append(plain, text)
			case partType == "text/html":
				htmlParts = append(htmlParts, text)
			}
		}
	} else {
		text, err := decodePart(msg.Body, msg.Header.Get("Content-Transfer-Encoding"))
		if err != nil {
			return Message{}, err
		}
		if mediaType == "text/html" {
			htmlParts = append(htmlParts, text)
		} else {
			plain = append(plain, text)
		}
	}

	if len(plain) > 0 {
		m.Body = strings.Join(plain, "\n")
	} else if len(htmlParts) > 0 {
		m.Body = parsers.HTMLToText(strings.Join(htmlParts, "\n"))
	}
	return m, nil
}

func decodePart(r io.Reader, encoding string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(encoding)) {
	case "base64":
		r = base64.NewDecoder(base64.StdEncoding, r)
	case "quoted-printable":
		r = quotedprintable.NewReader(r)
	}
	data, err := io.ReadAll(r)
	if err != nil {
		return "", fmt.Errorf("decode %s part: %w", encoding, err)
	}
	return string(data), nil
}

// DecodeGmailRaw decodes the base64url `raw` field of a Gmail
// users.messages.get(format=raw) response.
func DecodeGmailRaw(id string, raw string) (Message, error) {
	data, err := base64.URLEncoding.DecodeString(raw)
	if err != nil {
		// Gmail omits padding; retry with RawURLEncoding.
		data, err = base64.RawURLEncoding.DecodeString(raw)
		if err != nil {
			return Message{}, fmt.Errorf("decode gmail raw: %w", err)
		}
	}
	return DecodeEML(id, data)
}

// DateFromMillis converts a Gmail internalDate (ms since epoch) to UTC; a
// zero or missing value yields the zero time.
func DateFromMillis(ms int64) time.Time {
	if ms <= 0 {
		return time.Time{}
	}
	return time.UnixMilli(ms).UTC()
}
