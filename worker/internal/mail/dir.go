package mail

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// DirSource is a MailSource that reads .eml files from a directory — the
// demo/local-development stand-in for Gmail. The history ID cursor is the
// file's base name without extension, so lexicographically increasing names
// (e.g. timestamped) act like Gmail's monotonically increasing historyId.
type DirSource struct {
	Dir string
}

// NewMessagesSince returns every .eml file whose base name (sans extension)
// sorts after last — all files when last is empty. Unreadable or
// undecodable files are logged and skipped, never failing the batch.
func (d DirSource) NewMessagesSince(_ context.Context, last string) ([]Message, error) {
	entries, err := os.ReadDir(d.Dir)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".eml") {
			continue
		}
		id := strings.TrimSuffix(e.Name(), ".eml")
		if last == "" || id > last {
			names = append(names, id)
		}
	}
	sort.Strings(names)

	var msgs []Message
	for _, id := range names {
		raw, err := os.ReadFile(filepath.Join(d.Dir, id+".eml"))
		if err != nil {
			log.Printf("dir mail source: read %s: %v", id, err)
			continue
		}
		msg, err := DecodeEML(id, raw)
		if err != nil {
			log.Printf("dir mail source: decode %s: %v", id, err)
			continue
		}
		msgs = append(msgs, msg)
	}
	return msgs, nil
}
