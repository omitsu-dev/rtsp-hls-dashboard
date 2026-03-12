#!/bin/bash
# Health check for camera HLS streams
# Scans HLS directory for camera subdirectories and checks playlist freshness

HLS_DIR="${HLS_BASE_DIR:-/var/www/hls}"
ALERT_THRESHOLD="${ALERT_THRESHOLD:-30}" # seconds

if [ ! -d "$HLS_DIR" ]; then
  echo "[ERROR] HLS directory not found: $HLS_DIR"
  exit 1
fi

exit_code=0

for cam_dir in "$HLS_DIR"/cam*/; do
  [ -d "$cam_dir" ] || continue
  cam=$(basename "$cam_dir")
  playlist="${cam_dir}index.m3u8"

  if [ ! -f "$playlist" ]; then
    echo "[ALERT] ${cam}: playlist not found"
    exit_code=1
    continue
  fi

  age=$(( $(date +%s) - $(stat -c %Y "$playlist") ))
  if [ "$age" -gt "$ALERT_THRESHOLD" ]; then
    echo "[ALERT] ${cam}: playlist is ${age}s old (threshold: ${ALERT_THRESHOLD}s)"
    exit_code=1
  else
    echo "[OK] ${cam}: last updated ${age}s ago"
  fi
done

exit $exit_code
