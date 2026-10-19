#!/usr/bin/env bash
# Create the Google Cloud resources the worker needs in production mode:
# Gmail + Pub/Sub APIs, notification topic, dead-letter topic, pull
# subscription with a dead-letter policy, the IAM bindings Gmail and Pub/Sub
# require, and the worker service account. Idempotent: every create is guarded
# by a describe check, so re-running is safe.
set -euo pipefail

PUBSUB_TOPIC="${PUBSUB_TOPIC:-gmail-notifications}"
PUBSUB_SUBSCRIPTION="${PUBSUB_SUBSCRIPTION:-gmail-notifications-worker}"
PUBSUB_DLQ_TOPIC="${PUBSUB_DLQ_TOPIC:-gmail-notifications-dlq}"
WORKER_MAX_ATTEMPTS="${WORKER_MAX_ATTEMPTS:-5}"
WORKER_SA_NAME="${WORKER_SA_NAME:-cashflow-worker}"

if [ -z "${PUBSUB_PROJECT_ID:-}" ]; then
    echo "usage: PUBSUB_PROJECT_ID=<gcp-project-id> $0" >&2
    echo "  optional env: PUBSUB_TOPIC PUBSUB_SUBSCRIPTION PUBSUB_DLQ_TOPIC WORKER_MAX_ATTEMPTS WORKER_SA_NAME" >&2
    exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
    echo "error: gcloud CLI not found; install https://cloud.google.com/sdk and run 'gcloud auth login'" >&2
    exit 1
fi

PROJECT="$PUBSUB_PROJECT_ID"
SA_EMAIL="${WORKER_SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
GMAIL_PUSH_SA="gmail-api-push@system.gserviceaccount.com"

echo "==> 1. Enabling gmail.googleapis.com and pubsub.googleapis.com"
gcloud services enable gmail.googleapis.com pubsub.googleapis.com --project="$PROJECT"

echo "==> 2. Creating topics ($PUBSUB_TOPIC, $PUBSUB_DLQ_TOPIC)"
if ! gcloud pubsub topics describe "$PUBSUB_TOPIC" --project="$PROJECT" >/dev/null 2>&1; then
    gcloud pubsub topics create "$PUBSUB_TOPIC" --project="$PROJECT"
else
    echo "    topic $PUBSUB_TOPIC already exists"
fi
if ! gcloud pubsub topics describe "$PUBSUB_DLQ_TOPIC" --project="$PROJECT" >/dev/null 2>&1; then
    gcloud pubsub topics create "$PUBSUB_DLQ_TOPIC" --project="$PROJECT"
else
    echo "    topic $PUBSUB_DLQ_TOPIC already exists"
fi

echo "==> 3. Creating subscription $PUBSUB_SUBSCRIPTION (dead-letter after $WORKER_MAX_ATTEMPTS attempts)"
if ! gcloud pubsub subscriptions describe "$PUBSUB_SUBSCRIPTION" --project="$PROJECT" >/dev/null 2>&1; then
    gcloud pubsub subscriptions create "$PUBSUB_SUBSCRIPTION" \
        --project="$PROJECT" \
        --topic="$PUBSUB_TOPIC" \
        --ack-deadline=60 \
        --dead-letter-topic="$PUBSUB_DLQ_TOPIC" \
        --max-delivery-attempts="$WORKER_MAX_ATTEMPTS" \
        --min-retry-delay=10s \
        --max-retry-delay=600s
else
    echo "    subscription $PUBSUB_SUBSCRIPTION already exists"
fi

echo "==> 4. Granting $GMAIL_PUSH_SA roles/pubsub.publisher on $PUBSUB_TOPIC"
gcloud pubsub topics add-iam-policy-binding "$PUBSUB_TOPIC" \
    --project="$PROJECT" \
    --member="serviceAccount:$GMAIL_PUSH_SA" \
    --role="roles/pubsub.publisher" >/dev/null

echo "==> 5. Granting the Pub/Sub service agent DLQ publish + subscribe"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
PUBSUB_AGENT="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"
gcloud pubsub topics add-iam-policy-binding "$PUBSUB_DLQ_TOPIC" \
    --project="$PROJECT" \
    --member="serviceAccount:$PUBSUB_AGENT" \
    --role="roles/pubsub.publisher" >/dev/null
gcloud pubsub subscriptions add-iam-policy-binding "$PUBSUB_SUBSCRIPTION" \
    --project="$PROJECT" \
    --member="serviceAccount:$PUBSUB_AGENT" \
    --role="roles/pubsub.subscriber" >/dev/null

echo "==> 6. Creating worker service account $SA_EMAIL"
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$WORKER_SA_NAME" \
        --project="$PROJECT" \
        --display-name="cashflow-tracker worker"
else
    echo "    service account $SA_EMAIL already exists"
fi
gcloud pubsub subscriptions add-iam-policy-binding "$PUBSUB_SUBSCRIPTION" \
    --project="$PROJECT" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/pubsub.subscriber" >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/pubsub.viewer" >/dev/null

cat <<EOF

Done. Next steps:
  1. Create a service-account key for the worker:
       gcloud iam service-accounts keys create worker/credentials/gcp-service-account.json \\
         --iam-account=$SA_EMAIL --project=$PROJECT
  2. Mint a Gmail OAuth refresh token (scopes gmail.readonly + gmail.modify) and
     save it as worker/credentials/gmail_token.json — see worker/README.md.
  3. Set PUBSUB_PROJECT_ID=$PROJECT in .env, then:
       docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build worker
EOF
