// L3 visual-fixtures static server (test harness only — NOT production code).
// Serves the worktree root read-only over loopback so fixture pages can ES-import
// the Level 2 component modules by absolute path. No writes, no external calls.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = normalize(fileURLToPath(new URL("..", import.meta.url))).replace(/[\\/]+$/, ""); // worktree root, no trailing sep
const PORT = Number(process.env.L3_PORT || 4713);
const TYPES = { ".html": "text/html; charset=utf-8", ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    let p = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (p !== ROOT && !p.startsWith(ROOT + sep)) { res.writeHead(403); return res.end("forbidden"); }
    if (url.pathname === "/") p = join(ROOT, "visual-fixtures", "dashboard.html");
    const body = await readFile(p);
    res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
}).listen(PORT, "127.0.0.1", () => console.log(`l3 static server on http://127.0.0.1:${PORT}`));
