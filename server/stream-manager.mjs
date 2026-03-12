import { spawn, execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export function checkFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "pipe" });
  } catch {
    console.error("ERROR: ffmpeg not found in PATH.");
    console.error("This tool requires FFmpeg but does not include it (see LICENSE).");
    console.error("Install FFmpeg before running:");
    console.error("  Ubuntu/Debian: sudo apt install ffmpeg");
    console.error("  macOS:         brew install ffmpeg");
    console.error("  From source:   https://ffmpeg.org/download.html");
    process.exit(1);
  }
}

export class StreamManager {
  #processes = new Map();
  #restartTimers = new Map();

  async startStream(camera) {
    if (this.#processes.has(camera.id)) {
      console.log(`[${camera.id}] Already running`);
      return;
    }

    await mkdir(camera.hlsDir, { recursive: true });

    const args = [
      "-rtsp_transport", "tcp",
      "-timeout", "5000000",
      "-i", camera.rtspUrl,
      "-c:v", "copy",
      "-c:a", "aac", "-b:a", "128k",
      "-f", "hls",
      "-hls_time", "2",
      "-hls_list_size", "10",
      "-hls_flags", "delete_segments+append_list",
      "-hls_segment_filename",
      path.join(camera.hlsDir, "seg_%03d.ts"),
      path.join(camera.hlsDir, "index.m3u8"),
    ];

    const proc = spawn("ffmpeg", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    proc.stderr.on("data", (data) => {
      const line = data.toString().trim();
      if (line.includes("Error") || line.includes("error")) {
        console.error(`[${camera.id}] ${line}`);
      }
    });

    proc.on("exit", (code) => {
      console.log(`[${camera.id}] FFmpeg exited with code ${code}`);
      this.#processes.delete(camera.id);
      this.#scheduleRestart(camera);
    });

    this.#processes.set(camera.id, proc);
    console.log(`[${camera.id}] Started (PID: ${proc.pid})`);
  }

  stopStream(cameraId) {
    const proc = this.#processes.get(cameraId);
    if (proc) {
      proc.kill("SIGTERM");
      this.#processes.delete(cameraId);
    }
    const timer = this.#restartTimers.get(cameraId);
    if (timer) {
      clearTimeout(timer);
      this.#restartTimers.delete(cameraId);
    }
  }

  #scheduleRestart(camera) {
    console.log(`[${camera.id}] Restarting in 5 seconds...`);
    const timer = setTimeout(() => {
      this.#restartTimers.delete(camera.id);
      this.startStream(camera);
    }, 5000);
    this.#restartTimers.set(camera.id, timer);
  }

  getStatus() {
    const status = {};
    for (const [id, proc] of this.#processes) {
      status[id] = { pid: proc.pid, running: !proc.killed };
    }
    return status;
  }

  stopAll() {
    for (const [id] of this.#processes) {
      this.stopStream(id);
    }
  }
}
