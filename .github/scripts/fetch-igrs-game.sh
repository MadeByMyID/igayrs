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

API_URL="https://api.igrs.id/public/games/${ID}"
TEMP_FILE="${RAW_DIR}/${ID}.json"

set +e
HTTP_STATUS="$(curl \
  --silent \
  --show-error \
  --globoff \
  --retry 3 \
  --retry-delay 1 \
  --max-time 20 \
  --output "$TEMP_FILE" \
  --write-out "%{http_code}" \
  "$API_URL")"
CURL_EXIT=$?
set -e

if [ "$CURL_EXIT" -eq 0 ] && [ "$HTTP_STATUS" -eq 200 ] && jq -e '.id != null' "$TEMP_FILE" >/dev/null 2>&1; then
  jq -c '.' "$TEMP_FILE" > "${TEMP_FILE}.min"
  mv "${TEMP_FILE}.min" "$TEMP_FILE"
else
  printf 'Failed to fetch IGRS game: id=%s url=%s curl_exit=%s http_status=%s\n' "$ID" "$API_URL" "$CURL_EXIT" "$HTTP_STATUS" >&2
  rm -f "$TEMP_FILE"
fi
