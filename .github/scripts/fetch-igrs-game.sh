#!/usr/bin/env bash
set -euo pipefail

ID="${1:-}"
RAW_DIR="${2:-}"

case "$ID" in
  ""|*[!0-9]*)
    printf 'Skipping invalid game ID: %s\n' "$ID" >&2
    exit 0
    ;;
esac

if [ -z "$RAW_DIR" ]; then
  printf 'Missing raw output directory for game ID: %s\n' "$ID" >&2
  exit 2
fi

mkdir -p "$RAW_DIR"

API_URL="https://api.igrs.id/public/games/${ID}"
TEMP_FILE="${RAW_DIR}/${ID}.json"
DOWNLOAD_FILE="${TEMP_FILE}.download.$$"
MINIFIED_FILE="${TEMP_FILE}.min.$$"

cleanup() {
  rm -f "$DOWNLOAD_FILE" "$MINIFIED_FILE"
}
trap cleanup EXIT

set +e
HTTP_STATUS="$(curl \
  --insecure \
  --silent \
  --show-error \
  --globoff \
  --retry 3 \
  --retry-all-errors \
  --retry-delay 1 \
  --connect-timeout 10 \
  --max-time 30 \
  --output "$DOWNLOAD_FILE" \
  --write-out "%{http_code}" \
  "$API_URL")"
CURL_EXIT=$?
set -e

if [ "$CURL_EXIT" -eq 0 ] && [ "$HTTP_STATUS" -eq 200 ] && jq -e --arg requestedId "$ID" '(.id | tostring) == $requestedId' "$DOWNLOAD_FILE" >/dev/null 2>&1; then
  jq -c '.' "$DOWNLOAD_FILE" > "$MINIFIED_FILE"
  mv "$MINIFIED_FILE" "$TEMP_FILE"
else
  printf 'Failed to fetch IGRS game: id=%s url=%s curl_exit=%s http_status=%s\n' "$ID" "$API_URL" "$CURL_EXIT" "$HTTP_STATUS" >&2
fi
