"""Playwright automation for Grailed: login session capture, price drops,
and delete-and-repost relisting.

Grailed bumps a listing to the top of the feed when its price is dropped, so
the weekly price drop doubles as the "bump". Selectors here target Grailed's
web app as of mid-2026 and are centralized in SELECTORS so a UI change is a
one-place fix.

Run `python -m relist.grailed login` once to open a browser, log in manually
(handles the captcha/2FA problem), and persist the session to
state/grailed_auth.json for headless reuse.
"""

from __future__ import annotations

import logging
import sys
from decimal import Decimal

from playwright.sync_api import Browser, Page, sync_playwright

from config import settings

log = logging.getLogger(__name__)

SELECTORS = {
    "edit_button": "a:has-text('Edit'), button:has-text('Edit')",
    "price_input": "input[name='price'], input[id*='price']",
    "save_button": "button:has-text('Save'), button[type='submit']:has-text('Update')",
    "delete_button": "button:has-text('Delete'), a:has-text('Delete')",
    "delete_confirm": "button:has-text('Confirm'), button:has-text('Yes')",
    "sell_form": {
        "title": "input[name='title']",
        "description": "textarea[name='description']",
        "price": "input[name='price']",
        "publish": "button:has-text('Publish')",
    },
}


class GrailedBot:
    def __init__(self):
        self._pw = None
        self._browser: Browser | None = None
        self.page: Page | None = None

    def __enter__(self) -> "GrailedBot":
        storage = settings.resolve(settings.grailed_storage_state)
        if not storage.exists():
            raise FileNotFoundError(
                f"No Grailed session at {storage}. Run `python -m relist.grailed login` first."
            )
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(headless=not settings.relist_headed)
        context = self._browser.new_context(storage_state=str(storage))
        self.page = context.new_page()
        return self

    def __exit__(self, *exc) -> None:
        if self._browser:
            self._browser.close()
        if self._pw:
            self._pw.stop()

    # ------------------------------------------------------------------

    def drop_price(self, listing_url: str, new_price: Decimal) -> None:
        """Open a listing, edit it, and set a lower price (triggers a bump)."""
        page = self.page
        page.goto(listing_url, wait_until="domcontentloaded")
        page.locator(SELECTORS["edit_button"]).first.click()
        price_input = page.locator(SELECTORS["price_input"]).first
        price_input.wait_for(state="visible", timeout=15_000)
        price_input.fill(str(int(new_price)))
        page.locator(SELECTORS["save_button"]).first.click()
        page.wait_for_load_state("networkidle")
        log.info("Dropped price on %s to %s", listing_url, new_price)

    def scrape_listing(self, listing_url: str) -> dict:
        """Capture title/description/photos needed to repost the listing."""
        page = self.page
        page.goto(listing_url, wait_until="domcontentloaded")
        title = page.locator("h1").first.inner_text().strip()
        description = ""
        desc_loc = page.locator("[class*='description'], [data-testid*='description']").first
        if desc_loc.count():
            description = desc_loc.inner_text().strip()
        photo_urls = [
            img.get_attribute("src")
            for img in page.locator("[class*='photo'] img, [class*='gallery'] img").all()
            if img.get_attribute("src")
        ]
        return {"title": title, "description": description, "photos": photo_urls}

    def delete_listing(self, listing_url: str) -> None:
        page = self.page
        page.goto(listing_url, wait_until="domcontentloaded")
        page.locator(SELECTORS["edit_button"]).first.click()
        page.locator(SELECTORS["delete_button"]).first.click()
        page.locator(SELECTORS["delete_confirm"]).first.click()
        page.wait_for_load_state("networkidle")
        log.info("Deleted listing %s", listing_url)

    def repost(self, details: dict, price: Decimal) -> str:
        """Create a fresh listing from scraped details; returns the new URL.

        Note: photos must be re-uploaded from local files — Grailed's sell form
        does not accept remote URLs. Keep source photos on disk and extend this
        with page.set_input_files() if photo re-upload is needed; until then the
        repost is created and left in drafts for photos to be added by hand.
        """
        page = self.page
        form = SELECTORS["sell_form"]
        page.goto("https://www.grailed.com/sell/new", wait_until="domcontentloaded")
        page.locator(form["title"]).fill(details["title"])
        if details.get("description"):
            page.locator(form["description"]).fill(details["description"])
        page.locator(form["price"]).fill(str(int(price)))
        page.locator(form["publish"]).click()
        page.wait_for_url("**/listings/**", timeout=30_000)
        new_url = page.url
        log.info("Reposted '%s' at %s -> %s", details["title"], price, new_url)
        return new_url


def capture_login() -> None:
    """Open a headed browser for manual login, then save the session."""
    storage = settings.resolve(settings.grailed_storage_state)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        page.goto("https://www.grailed.com/users/sign_up")
        print("Log in to Grailed in the opened browser window.")
        input("Press Enter here once you are fully logged in... ")
        context.storage_state(path=str(storage))
        browser.close()
    print(f"Session saved to {storage}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "login":
        capture_login()
    else:
        print("Usage: python -m relist.grailed login")
