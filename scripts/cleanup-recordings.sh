#!/bin/bash
# Delete recording files older than RETENTION_DAYS
# Add to cron: 0 3 * * * /opt/rtsp-hls-dashboard/scripts/cleanup-recordings.sh

RECORDINGS_DIR="${RECORDINGS_DIR:-/var/recordings}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

if [ ! -d "$RECORDINGS_DIR" ]; then
  echo "[ERROR] Recordings directory not found: $RECORDINGS_DIR"
  exit 1
fi

count=$(find "$RECORDINGS_DIR" -name "*.mp4" -mtime +"$RETENTION_DAYS" | wc -l)
find "$RECORDINGS_DIR" -name "*.mp4" -mtime +"$RETENTION_DAYS" -delete

echo "[$(date)] Cleanup completed: ${count} file(s) deleted (older than ${RETENTION_DAYS} days)"
