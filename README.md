# rtsp-hls-dashboard

Browser-based surveillance dashboard that converts RTSP camera feeds to HLS via FFmpeg and displays them in a responsive grid layout.

![Dashboard Demo](docs/demo-screenshot.png)

## Important: FFmpeg Not Included

**This repository does NOT include FFmpeg.** FFmpeg is licensed under LGPL/GPL and must be installed separately by the user. This tool invokes FFmpeg as an external subprocess — it does not link against or bundle any FFmpeg libraries.

See [FFmpeg Legal](https://ffmpeg.org/legal.html) for licensing details.

## Features

- One FFmpeg process per camera (process isolation — one crash doesn't take down others)
- Auto-restart on stream failure (5-second backoff)
- Dynamic camera config via environment variables (no code changes to add cameras)
- Browser-based dashboard with [hls.js](https://github.com/video-dev/hls.js)
- Status API for monitoring
- Graceful shutdown (SIGTERM/SIGINT)
- Health check and recording cleanup scripts

## Prerequisites

- **Node.js** >= 18
- **FFmpeg** >= 6.0 — install separately (see below)
- **Nginx** — optional, for production HLS serving

### Installing FFmpeg

Ubuntu / Debian:

```bash
sudo apt update && sudo apt install -y ffmpeg
```

macOS:

```bash
brew install ffmpeg
```

Build from source: https://ffmpeg.org/download.html
For a detailed walkthrough, see the [FFmpeg Installation Guide](https://32blog.com/en/ffmpeg/ffmpeg-install-guide).

Verify installation:

```bash
ffmpeg -version
ffmpeg -protocols 2>/dev/null | grep rtsp
```

## Quick Start

```bash
git clone https://github.com/omitsu-dev/rtsp-hls-dashboard.git
cd rtsp-hls-dashboard
cp .env.example .env    # Edit with your camera RTSP URLs
npm install
sudo mkdir -p /var/www/hls
npm start
```

The stream manager API starts on port 3001. Set up Nginx (see `examples/nginx.conf`) to serve the dashboard UI and HLS segments.

## Configuration

### Adding Cameras

Edit `.env` and add camera entries. No code changes needed.

```bash
CAM1_RTSP_URL=rtsp://admin:pass@192.168.1.64:554/Streaming/Channels/101
CAM1_NAME=Entrance

CAM2_RTSP_URL=rtsp://admin:pass@192.168.1.108:554/cam/realmonitor?channel=1&subtype=0
CAM2_NAME=Server Room
```

The config auto-detects `CAM{N}_RTSP_URL` environment variables. Add `CAM3`, `CAM4`, etc. as needed.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CAM{N}_RTSP_URL` | — | RTSP URL for camera N (required) |
| `CAM{N}_NAME` | `camNN` | Display name for camera N |
| `HLS_BASE_DIR` | `/var/www/hls` | HLS output directory |
| `API_PORT` | `3001` | Stream manager API port |

## Production Setup

### Nginx

Copy and adjust `examples/nginx.conf`:

```bash
sudo cp examples/nginx.conf /etc/nginx/sites-available/surveillance
sudo ln -s /etc/nginx/sites-available/surveillance /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### systemd Service

```bash
sudo cp examples/surveillance-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable surveillance-dashboard
sudo systemctl start surveillance-dashboard
```

### Recording + Cleanup

Add the cleanup script to cron:

```bash
# Delete recordings older than 30 days, runs daily at 3 AM
echo "0 3 * * * /opt/rtsp-hls-dashboard/scripts/cleanup-recordings.sh" | sudo crontab -
```

### Health Monitoring

```bash
npm run healthcheck
# Or run directly:
ALERT_THRESHOLD=30 bash scripts/healthcheck.sh
```

## Architecture

```
IP Cameras (RTSP)
    │
    ▼
Node.js Stream Manager ──→ spawns 1 FFmpeg process per camera
    │
    ▼
FFmpeg (per camera) ──→ RTSP → HLS conversion
    │
    ▼
/var/www/hls/camNN/ ──→ .m3u8 + .ts segment files
    │
    ▼
Nginx ──→ serves HLS + dashboard UI + proxies API
    │
    ▼
Browser (hls.js) ──→ grid layout with live feeds
```

## Resource Estimates

With `-c:v copy` (no re-encoding):

| Cameras | CPU | Memory | Bandwidth |
|---------|-----|--------|-----------|
| 1–4 | 5–10% | ~50 MB/process | 2–8 Mbps/camera |
| 5–10 | 10–25% | ~500 MB | 10–40 Mbps |
| 10–20 | 20–50% | ~1 GB | 20–80 Mbps |

## Troubleshooting

- **Camera not connecting** — test with `ffprobe rtsp://...` first
- **High CPU** — check if re-encoding is happening (`-c:v copy` should be near zero CPU)
- **Stale playlist** — run `npm run healthcheck` to diagnose
- **FFmpeg not found** — ensure `ffmpeg` is in your PATH

## Related

- [FFmpeg RTSP Streaming Guide](https://32blog.com/en/ffmpeg/rtsp-ffmpeg-streaming-guide) — RTSP fundamentals
- [Building a Surveillance Dashboard with FFmpeg](https://32blog.com/en/ffmpeg/ffmpeg-rtsp-surveillance-dashboard) — full tutorial

## Credits

Created by **omitsu-dev**

- GitHub: [omitsu-dev](https://github.com/omitsu-dev)
- X: [@omitsu_dev](https://x.com/omitsu_dev)

## License

**AGPL-3.0** with additional terms — see [LICENSE](LICENSE) for details.

- Derivative works and network use (SaaS) must also be open-sourced under AGPL-3.0
- Attribution to the original author is required (link to this repo or mention [@omitsu_dev](https://x.com/omitsu_dev))
- This software is provided for **lawful purposes only**. The author assumes no responsibility for unauthorized surveillance or privacy violations
