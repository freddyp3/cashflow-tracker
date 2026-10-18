package parsers

import (
	"regexp"
	"strings"

	"golang.org/x/net/html"
)

var multiNewline = regexp.MustCompile(`\n{2,}`)

// HTMLToText converts an HTML email body to plain text: script/style
// elements are dropped, text nodes are joined with newlines, and runs of
// blank lines are collapsed — mirroring the Python BeautifulSoup version.
func HTMLToText(doc string) string {
	root, err := html.Parse(strings.NewReader(doc))
	if err != nil {
		return ""
	}
	var b strings.Builder
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && (n.Data == "script" || n.Data == "style") {
			return
		}
		if n.Type == html.TextNode {
			b.WriteString(n.Data)
			b.WriteByte('\n')
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(root)
	return strings.TrimSpace(multiNewline.ReplaceAllString(b.String(), "\n"))
}
