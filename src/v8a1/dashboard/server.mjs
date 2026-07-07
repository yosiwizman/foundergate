// FounderGate V8-A1 — Truth Dashboard local server (zero-dependency, read-only).
//
// Serves the static dashboard and exposes the reader's honest model at /api/model.
// It only READS the attached project (default: the MOCK_ONLY fixture). It writes
// nothing anywhere. This is a local status viewer — not product proof.
//
//   node src/v8a1/dashboard/server.mjs               # serves the fixture on :4173
//   FG_PROJECT_ROOT=/path/to/repo node .../server.mjs
//   FG_PORT=5000 node .../server.mjs

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { buildModel } from "../reader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(HERE, "..", "fixture", "mock-project");
const PROJECT_ROOT = process.env.FG_PROJECT_ROOT || FIXTURE_ROOT;
const PORT = Number(process.env.FG_PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const SAFE_FILES = new Set(["index.html", "styles.css", "app.js", "view-model.mjs"]);

export function createDashboardServer(projectRoot = PROJECT_ROOT) {
  return createServer((req, res) => {
    const url = req.url.split("?")[0];
    if (url === "/api/model") {
      const model = buildModel(projectRoot);
      res.writeHead(200, { "content-type": MIME[".json"] });
      res.end(JSON.stringify(model));
      return;
    }
    const name = url === "/" ? "index.html" : url.replace(/^\//, "");
    if (!SAFE_FILES.has(name)) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    const file = join(HERE, name);
    if (!existsSync(file)) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(name)] || "text/plain" });
    res.end(readFileSync(file));
  });
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const server = createDashboardServer();
  server.listen(PORT, () => {
    console.log(`FounderGate V8-A1 Truth Dashboard on http://localhost:${PORT}`);
    console.log(`Reading (read-only): ${PROJECT_ROOT}`);
  });
}
