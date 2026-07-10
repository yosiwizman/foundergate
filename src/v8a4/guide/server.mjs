// FounderGate V8-A4 — Project Guide server (zero-dependency, loopback-only).
//
// Serves the in-dashboard chat panel + a read-only ask API. It NEVER decides
// anything itself: every answer comes from guide.mjs (which reads state via the
// V8-A1 reader and file content only through the checker-approved File Cabinet
// enforcement). No write/route/send/exec path. No live/provider/payment path.
//
//   FG_PROJECT_ROOT=/path node src/v8a4/guide/server.mjs   # default: mock fixture

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, resolve } from "node:path";
import { answer, loadRules, CAPABILITIES } from "./guide.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = join(HERE, "ui");
const FIXTURE = resolve(HERE, "..", "..", "v8a1", "fixture", "mock-project");
const PROJECT_ROOT = process.env.FG_PROJECT_ROOT || FIXTURE;
const PORT = Number(process.env.FG_A4_PORT || 4500);

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
const SAFE_FILES = new Set(["guide.html", "guide.js", "guide.css"]);
const jsonRes = (res, code, obj) => { res.writeHead(code, { "content-type": MIME[".json"] }); res.end(JSON.stringify(obj)); };

const MAX_Q = 4000; // bound the input; the Guide is read-only, but keep bodies sane.

export function createGuideServer(projectRoot = PROJECT_ROOT) {
  const rules = loadRules(projectRoot);
  return createServer((req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    const path = u.pathname;

    if (path === "/api/guide/capabilities") return jsonRes(res, 200, { capabilities: CAPABILITIES });

    if (path === "/api/guide/ask" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => {
        body += c;
        if (body.length > MAX_Q) { req.destroy(); } // never buffer unbounded input
      });
      req.on("end", () => {
        let question = "";
        try { question = String(JSON.parse(body || "{}").question || ""); } catch { question = ""; }
        // read-only: produce a structured answer. Never writes, routes, sends, execs.
        const reply = answer(projectRoot, question.slice(0, MAX_Q), rules);
        return jsonRes(res, 200, reply);
      });
      return;
    }

    const name = path === "/" ? "guide.html" : path.replace(/^\//, "");
    if (!SAFE_FILES.has(name)) { res.writeHead(404); return res.end("not found"); }
    const file = join(UI, name);
    if (!existsSync(file)) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": MIME[extname(name)] || "text/plain" });
    res.end(readFileSync(file));
  });
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const server = createGuideServer();
  server.listen(PORT, "127.0.0.1", () => { // loopback only
    console.log(`FounderGate V8-A4 Project Guide on http://127.0.0.1:${PORT}`);
    console.log(`Attached project (read-only): ${PROJECT_ROOT}`);
  });
}
