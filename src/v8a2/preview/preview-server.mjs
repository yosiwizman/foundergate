// FounderGate V8-A2 — safe static preview server (the ONLY allowlisted preview
// target). Serves a directory over 127.0.0.1 (loopback only), read-only. It makes
// NO outbound network calls, has NO provider/send/payment path, and refuses path
// traversal. The Preview Bay controller spawns this as a tracked child process; it
// never runs an arbitrary command from project config.
//
//   node preview-server.mjs --dir <appDir> [--port 0]
// Prints "PREVIEW-READY <port>" on stdout once listening; exits on SIGTERM.

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, realpathSync } from "node:fs";
import { join, normalize, extname, resolve, sep } from "node:path";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const APP_DIR = resolve(arg("--dir", "."));
const PORT = Number(arg("--port", "0"));

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

const server = createServer((req, res) => {
  // read-only: refuse any non-GET/HEAD method (no sends, no writes)
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "content-type": "text/plain" });
    res.end("preview is read-only");
    return;
  }
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    res.writeHead(400, { "content-type": "text/plain" });
    res.end("bad request");
    return;
  }
  if (urlPath === "/") urlPath = "/index.html";
  const abs = normalize(join(APP_DIR, urlPath));
  // path-traversal guard: resolved path must stay inside APP_DIR
  if (!abs.startsWith(APP_DIR + sep) && abs !== APP_DIR) {
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("forbidden");
    return;
  }
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  // symlink containment: the REAL path must also stay inside APP_DIR (a symlink
  // inside app_dir must not escape it).
  let real;
  try {
    real = realpathSync(abs);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  const realRoot = realpathSync(APP_DIR);
  if (!real.startsWith(realRoot + sep) && real !== realRoot) {
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("forbidden");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(real)] || "application/octet-stream" });
  res.end(req.method === "HEAD" ? undefined : readFileSync(real));
});

// Loopback only — never exposed off the machine.
server.listen(PORT, "127.0.0.1", () => {
  const port = server.address().port;
  console.log(`PREVIEW-READY ${port}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
