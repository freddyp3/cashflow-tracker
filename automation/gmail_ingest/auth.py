"""Gmail OAuth flow and service construction.

First run opens a browser for consent and caches the refresh token in
state/gmail_token.json; subsequent runs are non-interactive.

Scopes: readonly to fetch messages, modify to apply the processed label.
"""

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from config import settings

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]


def get_gmail_service():
    token_path = settings.resolve(settings.gmail_token_file)
    creds_path = settings.resolve(settings.gmail_credentials_file)

    creds = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not creds_path.exists():
                raise FileNotFoundError(
                    f"Gmail OAuth client file not found at {creds_path}. "
                    "Create a Desktop-app OAuth client in Google Cloud Console "
                    "(with the Gmail API enabled) and save the JSON there."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
            creds = flow.run_local_server(port=0)
        token_path.parent.mkdir(parents=True, exist_ok=True)
        token_path.write_text(creds.to_json())

    return build("gmail", "v1", credentials=creds, cache_discovery=False)
