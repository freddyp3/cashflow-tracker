"""Central configuration for the automation service, loaded from automation/.env."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    tracker_api_url: str = "http://localhost:8080"

    gmail_credentials_file: str = "credentials/gmail_credentials.json"
    gmail_token_file: str = "state/gmail_token.json"
    gmail_processed_label: str = "order-tracker/imported"
    gmail_lookback_days: int = 14

    relist_db_file: str = "state/relist.db"
    grailed_storage_state: str = "state/grailed_auth.json"
    relist_weekly_drop_pct: float = 5.0
    relist_min_price_fraction: float = 0.6
    relist_cycle_days: int = 30
    relist_batch_size: int = 15
    relist_headed: bool = False

    schedule_relist_cron: str = "0 9 * * 1"
    schedule_ingest_minutes: int = 30

    def resolve(self, rel: str) -> Path:
        """Resolve a config path relative to the automation/ directory."""
        p = Path(rel)
        return p if p.is_absolute() else BASE_DIR / p


settings = Settings()

# Ensure the state directory exists for tokens, session storage and the DB.
(BASE_DIR / "state").mkdir(exist_ok=True)
