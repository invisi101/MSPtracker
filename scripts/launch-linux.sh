#!/usr/bin/env bash
# Open MSP Tracker as a desktop app on Linux (Omarchy): start the local server if it isn't running,
# wait until it answers, then open it in its own app window.
set -euo pipefail
URL="http://localhost:7797"
systemctl --user start msptracker
for i in $(seq 1 40); do
  curl -fsS "$URL/health" >/dev/null 2>&1 && break
  sleep 0.25
done
exec omarchy-launch-webapp "$URL"
