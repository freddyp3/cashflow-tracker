"""Parsers that turn marketplace sale-confirmation emails into ParsedSale objects.

Each platform gets its own parser keyed by sender domain. The formats of these
emails change over time, so every field is extracted defensively: a missing
field becomes None and the order is still created as a draft with the raw
values captured in the note for manual review — the parser should never make
an email silently disappear.

Prices in Grailed/Depop/eBay emails are assumed USD unless a currency symbol
says otherwise; conversion to CAD happens at order-creation time.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation

from bs4 import BeautifulSoup


@dataclass
class ParsedSale:
    platform: str
    item_title: str | None = None
    price: Decimal | None = None
    shipping: Decimal | None = None
    currency: str = "USD"
    buyer_name: str | None = None
    location: str | None = None
    size: str | None = None
    order_ref: str | None = None
    warnings: list[str] = field(default_factory=list)


MONEY_RE = r"(?P<cur>[A-Z]{3}\s*)?(?P<sym>[$£€]|C\$|CA\$|US\$)?\s*(?P<amt>\d{1,6}(?:[.,]\d{2})?)"

SYMBOL_CURRENCY = {"£": "GBP", "€": "EUR", "C$": "CAD", "CA$": "CAD", "US$": "USD", "$": "USD"}


def _money(match: re.Match | None) -> tuple[Decimal | None, str | None]:
    if not match:
        return None, None
    try:
        amount = Decimal(match.group("amt").replace(",", "."))
    except InvalidOperation:
        return None, None
    currency = None
    if match.group("cur"):
        currency = match.group("cur").strip().upper()
    elif match.group("sym"):
        currency = SYMBOL_CURRENCY.get(match.group("sym"))
    return amount, currency


def _search_money(pattern: str, text: str) -> tuple[Decimal | None, str | None]:
    return _money(re.search(pattern, text, re.IGNORECASE))


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    return re.sub(r"\n{2,}", "\n", text).strip()


def _first(pattern: str, text: str, group: int = 1) -> str | None:
    m = re.search(pattern, text, re.IGNORECASE)
    return m.group(group).strip() if m else None


# ---------------------------------------------------------------------------
# Grailed — "Congrats, you sold <item>!" / "You made a sale"
# ---------------------------------------------------------------------------

def parse_grailed(subject: str, body: str) -> ParsedSale:
    sale = ParsedSale(platform="Grailed")

    sale.item_title = (
        _first(r"(?:congrats[^\n]*sold|you sold)\s*[:\-]?\s*(.+?)[!\n]", subject + "\n" + body)
        or _first(r"item\s*[:\-]\s*(.+)", body)
    )
    sale.price, cur = _search_money(r"sold\s+(?:price|for)\s*[:\-]?\s*" + MONEY_RE, body)
    if sale.price is None:
        sale.price, cur = _search_money(r"(?:earnings|total|price)\s*[:\-]?\s*" + MONEY_RE, body)
    if cur:
        sale.currency = cur

    sale.shipping, _ = _search_money(r"shipping\s*[:\-]?\s*" + MONEY_RE, body)
    sale.buyer_name = _first(r"(?:buyer|sold to)\s*[:\-]?\s*([^\n]+)", body)
    sale.size = _first(r"\bsize\s*[:\-]?\s*([A-Za-z0-9./ ]{1,12})\b", body)
    sale.location = _first(r"(?:ships? to|shipping address|destination)\s*[:\-]?\s*([^\n]+)", body)
    sale.order_ref = _first(r"order\s*(?:#|number|id)\s*[:\-]?\s*([A-Za-z0-9\-]+)", body)
    return sale


# ---------------------------------------------------------------------------
# Depop — "You've made a sale!" / receipt emails
# ---------------------------------------------------------------------------

def parse_depop(subject: str, body: str) -> ParsedSale:
    sale = ParsedSale(platform="Depop")

    sale.item_title = (
        _first(r"you(?:'ve| have)? sold\s*[:\-]?\s*(.+?)[!\n]", subject + "\n" + body)
        or _first(r"item\s*[:\-]\s*(.+)", body)
    )
    sale.price, cur = _search_money(r"(?:item price|sold for|price)\s*[:\-]?\s*" + MONEY_RE, body)
    if sale.price is None:
        sale.price, cur = _search_money(r"total\s*[:\-]?\s*" + MONEY_RE, body)
    if cur:
        sale.currency = cur

    sale.shipping, _ = _search_money(r"(?:shipping|postage)\s*[:\-]?\s*" + MONEY_RE, body)
    sale.buyer_name = _first(r"(?:buyer|sold to|@)\s*[:\-]?\s*([A-Za-z0-9_.\- ]+)", body)
    sale.size = _first(r"\bsize\s*[:\-]?\s*([A-Za-z0-9./ ]{1,12})\b", body)
    sale.location = _first(r"(?:ships? to|deliver(?:y)? to|address)\s*[:\-]?\s*([^\n]+)", body)
    sale.order_ref = _first(r"(?:receipt|order)\s*(?:#|number|id)?\s*[:\-]?\s*(\d[\dA-Za-z\-]+)", body)
    return sale


# ---------------------------------------------------------------------------
# eBay — "Your item sold!" emails
# ---------------------------------------------------------------------------

def parse_ebay(subject: str, body: str) -> ParsedSale:
    sale = ParsedSale(platform="eBay")

    sale.item_title = (
        _first(r"(?:your item sold|sold)\s*[:!\-]?\s*(.+?)[!\n]", subject + "\n" + body)
        or _first(r"item\s*[:\-]\s*(.+)", body)
    )
    sale.price, cur = _search_money(r"(?:sold (?:price|for)|item price|price)\s*[:\-]?\s*" + MONEY_RE, body)
    if sale.price is None:
        sale.price, cur = _search_money(r"(?:order )?total\s*[:\-]?\s*" + MONEY_RE, body)
    if cur:
        sale.currency = cur

    sale.shipping, _ = _search_money(r"(?:shipping|postage|delivery)\s*[:\-]?\s*" + MONEY_RE, body)
    sale.buyer_name = _first(r"buyer\s*(?:username)?\s*[:\-]?\s*([A-Za-z0-9_.\- ]+)", body)
    sale.size = _first(r"\bsize\s*[:\-]?\s*([A-Za-z0-9./ ]{1,12})\b", body)
    sale.location = _first(r"(?:ship(?:s|ping)? to|deliver to)\s*[:\-]?\s*([^\n]+)", body)
    sale.order_ref = _first(r"order\s*(?:#|number|id)\s*[:\-]?\s*([\dA-Za-z\-]+)", body)
    return sale


# ---------------------------------------------------------------------------
# Dispatch by sender
# ---------------------------------------------------------------------------

PARSERS = {
    "grailed.com": parse_grailed,
    "depop.com": parse_depop,
    "ebay.com": parse_ebay,
    "ebay.ca": parse_ebay,
}

# Gmail search query fragments identifying sale confirmations per platform.
SALE_QUERIES = [
    'from:grailed.com (subject:"sold" OR subject:"you made a sale")',
    'from:depop.com subject:"sale"',
    'from:ebay.com (subject:"your item sold" OR subject:"item sold")',
]


def parser_for_sender(from_header: str):
    sender = from_header.lower()
    for domain, parser in PARSERS.items():
        if domain in sender:
            return parser
    return None
