import "dotenv/config";
import http from "node:http";
import { cameras } from "./config.mjs";
import { StreamManager, checkFfmpeg } from "./stream-manager.mjs";

checkFfmpeg();

const manager = new StreamManager();

for (const cam of cameras) {
  manager.startStream(cam);
}

const server = http.createServer((req, res) => {
  if (req.url === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      cameras: cameras.map((cam) => ({
        id: cam.id,
        name: cam.name,
        hlsUrl: `/hls/${cam.id}/index.m3u8`,
        ...manager.getStatus()[cam.id],
      })),
    }));
    return;
  }
  res.writeHead(404);
  res.end("Not Found");
});

const PORT = process.env.API_PORT || 3001;

server.listen(PORT, () => {
  console.log(`Stream manager API running on port ${PORT}`);
  console.log(`Managing ${cameras.length} camera(s)`);
});

function shutdown() {
  console.log("Shutting down...");
  manager.stopAll();
  server.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
