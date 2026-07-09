"""Gmail -> order-tracker ingest pipeline.

Flow per run:
  1. Search Gmail for sale-confirmation emails from Grailed/Depop/eBay within
     the lookback window that do NOT yet carry the processed label.
  2. Parse each into a ParsedSale, convert money to CAD via the tracker's
     currency endpoint, fuzzy-match the listing title to a catalog product.
  3. POST a draft order (draft=true) so it shows up in the dashboard for
     review instead of silently entering the books.
  4. Label the email as processed — the label is the dedupe mechanism, so a
     re-run never creates the same order twice.

Emails that fail parsing entirely are still labeled and reported in the run
summary so they can be handled by hand rather than retried forever.
"""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from api_client import TrackerClient
from config import settings
from gmail_ingest.auth import get_gmail_service
from gmail_ingest.parsers import SALE_QUERIES, ParsedSale, html_to_text, parser_for_sender

log = logging.getLogger(__name__)


@dataclass
class IngestReport:
    scanned: int = 0
    created: int = 0
    skipped: int = 0
    failures: list[str] = field(default_factory=list)
    created_orders: list[dict] = field(default_factory=list)


def _get_or_create_label_id(service, name: str) -> str:
    labels = service.users().labels().list(userId="me").execute().get("labels", [])
    for label in labels:
        if label["name"] == name:
            return label["id"]
    created = (
        service.users()
        .labels()
        .create(userId="me", body={"name": name, "labelListVisibility": "labelShow",
                                   "messageListVisibility": "show"})
        .execute()
    )
    return created["id"]


def _extract_body(payload: dict) -> str:
    """Walk the MIME tree and return the best-effort plain text body."""
    def decode(data: str) -> str:
        return base64.urlsafe_b64decode(data.encode()).decode(errors="replace")

    stack, plain, html = [payload], [], []
    while stack:
        part = stack.pop()
        stack.extend(part.get("parts", []))
        data = part.get("body", {}).get("data")
        if not data:
            continue
        mime = part.get("mimeType", "")
        if mime == "text/plain":
            plain.append(decode(data))
        elif mime == "text/html":
            html.append(decode(data))
    if plain:
        return "\n".join(plain)
    if html:
        return html_to_text("\n".join(html))
    return ""


def _header(message: dict, name: str) -> str:
    for h in message.get("payload", {}).get("headers", []):
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def _order_date(message: dict) -> str:
    ms = int(message.get("internalDate", 0))
    if ms:
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).date().isoformat()
    return date.today().isoformat()


def _build_note(sale: ParsedSale, msg_id: str) -> str:
    parts = [f"Auto-imported from Gmail ({sale.platform}, msg {msg_id})."]
    if sale.order_ref:
        parts.append(f"Order ref: {sale.order_ref}.")
    if sale.warnings:
        parts.append("Review needed: " + "; ".join(sale.warnings) + ".")
    return " ".join(parts)


def _sale_to_order(tracker: TrackerClient, sale: ParsedSale, msg_id: str, order_date: str) -> dict:
    if sale.price is None:
        sale.warnings.append("price not found in email")
    if not sale.item_title:
        sale.warnings.append("item title not found in email")

    revenue = tracker.to_cad(sale.price or Decimal("0"), sale.currency)
    shipping = tracker.to_cad(sale.shipping or Decimal("0"), sale.currency)

    items: list[dict] = []
    if sale.item_title:
        match = tracker.match_product(sale.item_title)
        if match:
            items.append({
                "productId": match.product_id,
                "itemPaid": float(revenue),
                "itemSize": sale.size,
                "note": f"Matched '{sale.item_title}' -> '{match.product_name}' "
                        f"({match.score:.0%} confidence)",
            })
        else:
            sale.warnings.append(f"no catalog product matched '{sale.item_title}'")

    return tracker.create_draft_order(
        platform=sale.platform,
        revenue_cad=revenue,
        shipping_cad=shipping,
        customer_name=sale.buyer_name or "TBD",
        shipping_location=sale.location or "TBD",
        order_date=order_date,
        items=items,
        note=_build_note(sale, msg_id),
    )


def run_ingest() -> IngestReport:
    report = IngestReport()
    service = get_gmail_service()
    tracker = TrackerClient()
    label_id = _get_or_create_label_id(service, settings.gmail_processed_label)

    after = (date.today() - timedelta(days=settings.gmail_lookback_days)).strftime("%Y/%m/%d")

    try:
        for query_fragment in SALE_QUERIES:
            query = f"{query_fragment} after:{after} -label:{settings.gmail_processed_label}"
            resp = service.users().messages().list(userId="me", q=query, maxResults=50).execute()
            for ref in resp.get("messages", []):
                report.scanned += 1
                msg_id = ref["id"]
                try:
                    msg = service.users().messages().get(
                        userId="me", id=msg_id, format="full"
                    ).execute()
                    parser = parser_for_sender(_header(msg, "From"))
                    if parser is None:
                        report.skipped += 1
                        continue

                    sale = parser(_header(msg, "Subject"), _extract_body(msg["payload"]))
                    order = _sale_to_order(tracker, sale, msg_id, _order_date(msg))
                    report.created += 1
                    report.created_orders.append({
                        "orderId": order.get("orderId"),
                        "platform": sale.platform,
                        "item": sale.item_title,
                        "warnings": sale.warnings,
                    })
                    log.info("Created draft order %s from message %s", order.get("orderId"), msg_id)
                except Exception as exc:  # keep going; one bad email shouldn't stop the run
                    report.failures.append(f"{msg_id}: {exc}")
                    log.exception("Failed to ingest message %s", msg_id)
                finally:
                    # Label even on failure so a permanently broken email isn't
                    # retried every run; failures surface in the report instead.
                    service.users().messages().modify(
                        userId="me", id=msg_id, body={"addLabelIds": [label_id]}
                    ).execute()
    finally:
        tracker.close()

    return report


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = run_ingest()
    print(f"scanned={result.scanned} created={result.created} "
          f"skipped={result.skipped} failures={len(result.failures)}")
    for f in result.failures:
        print("  FAIL:", f)
