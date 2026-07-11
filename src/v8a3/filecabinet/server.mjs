// FounderGate V8-A3 — File Cabinet server (zero-dependency, loopback-only).
//
// Serves the File Cabinet page + a read-only API. It NEVER decides access itself:
// every preview/copy/download goes through the checker-approved cabinet.mjs
// enforcement, so secrets/unknown/production files can never leak. No edit/delete,
// no Open-in-GitHub, no Project Guide, no live/provider/send/payment path.
//
//   FG_PROJECT_ROOT=/path node src/v8a3/filecabinet/server.mjs   # default: fixture

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, resolve } from "node:path";
import { buildTree, loadRules } from "./tree.mjs";
import { safePreview, safeCopy, safeDownload } from "./cabinet.mjs";
import { defaultProjectRoot } from "../../tools/project-root.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = join(HERE, "ui");
const TOKENS = resolve(HERE, "..", "..", "ui", "tokens.css"); // shared design system
const PORT = Number(process.env.FG_A3_PORT || 4400);

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
const SAFE_FILES = new Set(["filecabinet.html", "filecabinet.js", "filecabinet.css", "tokens.css"]);
const jsonRes = (res, code, obj) => { res.writeHead(code, { "content-type": MIME[".json"] }); res.end(JSON.stringify(obj)); };

export function createCabinetServer(projectRoot) {
  if (!projectRoot) projectRoot = defaultProjectRoot(false); // read-only, but never the committed fixture by default
  const rules = loadRules(projectRoot);
  return createServer((req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    const path = u.pathname;

    if (path === "/api/cabinet/tree") return jsonRes(res, 200, buildTree(projectRoot, rules));

    if (path === "/api/cabinet/file") {
      const rel = u.searchParams.get("path") || "";
      const action = u.searchParams.get("action") || "preview";
      const fn = action === "copy" ? safeCopy : action === "download" ? safeDownload : safePreview;
      // enforcement lives entirely in cabinet.mjs (checker-approved).
      const r = fn(projectRoot, rel, rules);
      return jsonRes(res, 200, r);
    }

    const name = path === "/" ? "filecabinet.html" : path.replace(/^\//, "");
    if (!SAFE_FILES.has(name)) { res.writeHead(404); return res.end("not found"); }
    const file = name === "tokens.css" ? TOKENS : join(UI, name);
    if (!existsSync(file)) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": MIME[extname(name)] || "text/plain" });
    res.end(readFileSync(file));
  });
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const root = defaultProjectRoot(); // announces if it made a throwaway copy
  const server = createCabinetServer(root);
  server.listen(PORT, "127.0.0.1", () => { // loopback only
    console.log(`FounderGate V8-A3 File Cabinet on http://127.0.0.1:${PORT}`);
    console.log(`Attached project (read-only): ${root}`);
  });
}
