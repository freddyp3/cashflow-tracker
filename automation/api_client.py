"""HTTP client for the Spring Boot order-tracker API.

Mirrors the backend contracts:
  - POST /api/orders            (OrderRequest -> OrderResponse)
  - GET  /api/products          (Product list, used for fuzzy matching)
  - GET  /api/currency/rates    (live FX rate to CAD)

All monetary values sent to the tracker must already be CAD — that is the
backend's documented contract — so conversion happens here, not server-side.
"""

from __future__ import annotations

import difflib
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

import httpx

from config import settings

TWO_PLACES = Decimal("0.01")


@dataclass
class ProductMatch:
    product_id: int
    product_name: str
    score: float


class TrackerClient:
    def __init__(self, base_url: str | None = None):
        self._client = httpx.Client(
            base_url=base_url or settings.tracker_api_url,
            timeout=15.0,
        )
        self._products_cache: list[dict[str, Any]] | None = None
        self._rate_cache: dict[str, Decimal] = {}

    def close(self) -> None:
        self._client.close()

    # -- currency ---------------------------------------------------------

    def rate_to_cad(self, currency: str) -> Decimal:
        currency = currency.upper()
        if currency == "CAD":
            return Decimal("1")
        if currency not in self._rate_cache:
            resp = self._client.get("/api/currency/rates", params={"from": currency})
            resp.raise_for_status()
            self._rate_cache[currency] = Decimal(str(resp.json()["rate"]))
        return self._rate_cache[currency]

    def to_cad(self, amount: Decimal, currency: str) -> Decimal:
        return (amount * self.rate_to_cad(currency)).quantize(TWO_PLACES, ROUND_HALF_UP)

    # -- products ---------------------------------------------------------

    def products(self, refresh: bool = False) -> list[dict[str, Any]]:
        if self._products_cache is None or refresh:
            resp = self._client.get("/api/products")
            resp.raise_for_status()
            self._products_cache = resp.json()
        return self._products_cache

    def match_product(self, listing_title: str, cutoff: float = 0.45) -> ProductMatch | None:
        """Fuzzy-match a marketplace listing title to a catalog product.

        Listing titles are usually the product name plus extra words
        (size, condition, tags), so we score each product name against
        the title and also check for direct substring containment.
        """
        title = listing_title.lower().strip()
        best: ProductMatch | None = None
        for p in self.products():
            name = p["productName"]
            name_l = name.lower()
            if name_l in title:
                score = 1.0
            else:
                score = difflib.SequenceMatcher(None, name_l, title).ratio()
            if score >= cutoff and (best is None or score > best.score):
                best = ProductMatch(p["productId"], name, score)
        return best

    # -- orders -----------------------------------------------------------

    def create_draft_order(
        self,
        *,
        platform: str,
        revenue_cad: Decimal,
        shipping_cad: Decimal,
        customer_name: str,
        shipping_location: str,
        order_date: str,
        items: list[dict[str, Any]],
        note: str,
    ) -> dict[str, Any]:
        payload = {
            "platform": platform,
            "revenue": float(revenue_cad),
            "shipping": float(shipping_cad),
            "customerName": customer_name or "TBD",
            "shippingLocation": shipping_location or "TBD",
            "orderDate": order_date,
            "draft": True,
            "note": note,
            "items": items,
        }
        resp = self._client.post("/api/orders", json=payload)
        resp.raise_for_status()
        return resp.json()
