"""Placeholder smoke tests for the email parsers.

Partition 00 gate: each parser must return the right platform string and parse
a price out of a minimal inline body. Real .eml fixtures land in partition 04.
"""

from decimal import Decimal

from gmail_ingest.parsers import parse_grailed, parse_depop, parse_ebay


def test_parse_grailed_smoke():
    sale = parse_grailed(
        "Congrats, you sold Penguin Shirt!",
        "Sold price: $45.00\nOrder #: ABC123",
    )
    assert sale.platform == "Grailed"
    assert sale.price == Decimal("45.00")


def test_parse_depop_smoke():
    sale = parse_depop(
        "You've made a sale!",
        "Item price: $45.00\nOrder #: 12345",
    )
    assert sale.platform == "Depop"
    assert sale.price == Decimal("45.00")


def test_parse_ebay_smoke():
    sale = parse_ebay(
        "Your item sold!",
        "Sold price: $45.00\nOrder #: ABC123",
    )
    assert sale.platform == "eBay"
    assert sale.price == Decimal("45.00")
