const cameras = [];

for (const [key, value] of Object.entries(process.env)) {
  const match = key.match(/^CAM(\d+)_RTSP_URL$/);
  if (match && value) {
    const num = match[1];
    const id = `cam${num.padStart(2, "0")}`;
    cameras.push({
      id,
      name: process.env[`CAM${num}_NAME`] || id,
      rtspUrl: value,
      hlsDir: process.env.HLS_BASE_DIR
        ? `${process.env.HLS_BASE_DIR}/${id}`
        : `/var/www/hls/${id}`,
    });
  }
}

if (cameras.length === 0) {
  console.error("ERROR: No cameras configured.");
  console.error("Add CAM1_RTSP_URL, CAM2_RTSP_URL, ... to your .env file.");
  console.error("See .env.example for details.");
  process.exit(1);
}

cameras.sort((a, b) => a.id.localeCompare(b.id));

export { cameras };
