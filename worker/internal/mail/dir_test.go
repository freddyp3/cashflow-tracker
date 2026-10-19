package mail

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

const dirTestEML = `From: "Grailed" <holds@grailed.com>
Subject: Test sale
Date: Fri, 25 Sep 2026 18:14:52 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"

Order #: T-1
Sold price: $10.00
`

func writeDirFixture(t *testing.T, dir, name string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name+".eml"), []byte(dirTestEML), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
}

func TestDirSourceCursor(t *testing.T) {
	dir := t.TempDir()
	writeDirFixture(t, dir, "a-first")
	writeDirFixture(t, dir, "b-second")
	writeDirFixture(t, dir, "c-third")

	src := DirSource{Dir: dir}
	msgs, err := src.NewMessagesSince(context.Background(), "b-second")
	if err != nil {
		t.Fatalf("NewMessagesSince: %v", err)
	}
	if len(msgs) != 1 || msgs[0].ID != "c-third" {
		t.Fatalf("cursor after b-second: got %v", msgs)
	}
}

func TestDirSourceEmptyCursorReturnsAllSorted(t *testing.T) {
	dir := t.TempDir()
	writeDirFixture(t, dir, "c-third")
	writeDirFixture(t, dir, "a-first")
	writeDirFixture(t, dir, "b-second")

	src := DirSource{Dir: dir}
	msgs, err := src.NewMessagesSince(context.Background(), "")
	if err != nil {
		t.Fatalf("NewMessagesSince: %v", err)
	}
	if len(msgs) != 3 {
		t.Fatalf("empty cursor: got %d messages", len(msgs))
	}
	for i, want := range []string{"a-first", "b-second", "c-third"} {
		if msgs[i].ID != want {
			t.Fatalf("msgs[%d].ID = %q, want %q", i, msgs[i].ID, want)
		}
	}
}
