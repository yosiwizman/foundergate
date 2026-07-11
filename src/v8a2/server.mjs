// FounderGate V8-A2 — Preview Bay + Bug Collector server (zero-dependency).
//
// Serves the Preview Bay page (app-shell style) and a small control API that
// drives the SAFE preview controller. It only ever previews the attached project
// via the allowlisted static target; it never runs an arbitrary command, and it
// exposes no live/provider/send/payment path. Read-only against the app; the only
// writes are the project's run_state.json (tracked preview) and, for the Bug
// Collector, a bug evidence packet under .foundergate/bugs.
//
//   FG_PROJECT_ROOT=/path/to/project node src/v8a2/server.mjs   # default: the fixture

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, resolve } from "node:path";
import { PreviewController } from "./preview/preview-controller.mjs";
import { defaultProjectRoot } from "../tools/project-root.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = join(HERE, "preview", "ui");
const PORT = Number(process.env.FG_A2_PORT || 4300);

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
const SAFE_FILES = new Set(["preview-bay.html", "preview-bay.js", "preview-bay.css"]);

function json(res, code, obj) {
  res.writeHead(code, { "content-type": MIME[".json"] });
  res.end(JSON.stringify(obj));
}
async function body(req, limit = 256 * 1024) {
  // cap the request body to avoid unbounded memory use (checker note #7).
  return await new Promise((res, rej) => {
    let d = "", n = 0;
    req.on("data", (c) => { n += c.length; if (n > limit) { rej(new Error("body too large")); req.destroy(); } else d += c; });
    req.on("end", () => res(d));
  });
}

export function createA2Server(projectRoot) {
  if (!projectRoot) projectRoot = defaultProjectRoot(false); // never write the committed fixture
  const controller = new PreviewController(projectRoot);

  return createServer(async (req, res) => {
    const url = req.url.split("?")[0];

    // ---- Preview control API (drives the SAFE controller) ------------------
    if (url === "/api/preview/status") return json(res, 200, safeStatus(controller));
    if (url.startsWith("/api/preview/") && req.method === "POST") {
      const action = url.split("/").pop();
      try {
        if (action === "start") await controller.start();
        else if (action === "stop") controller.stop();
        else if (action === "restart") await controller.restart();
        else if (action === "refresh") controller.refresh();
        else if (action === "clear-cache") controller.clearCache();
        else return json(res, 404, { error: "unknown action" });
        return json(res, 200, safeStatus(controller));
      } catch (e) {
        // C7: plain-English failure, never a fabricated success.
        return json(res, 200, { ...safeStatus(controller), failure: PreviewController.describeFailure(e) });
      }
    }

    // ---- Bug Collector: Report Problem (capture → classify → store) --------
    if (url === "/api/bug/report" && req.method === "POST") {
      const mod = await import("./bugs/bug-collector.mjs").catch(() => null);
      if (!mod) return json(res, 200, { stored: false, error: "bug collector not wired yet" });
      try {
        const payload = JSON.parse((await body(req)) || "{}");
        const packet = mod.captureBug(projectRoot, payload);
        return json(res, 200, { stored: true, packet });
      } catch (e) {
        return json(res, 200, { stored: false, error: String(e && e.message) });
      }
    }

    // ---- Static UI ---------------------------------------------------------
    const name = url === "/" ? "preview-bay.html" : url.replace(/^\//, "");
    if (!SAFE_FILES.has(name)) { res.writeHead(404); return res.end("not found"); }
    const file = join(UI, name);
    if (!existsSync(file)) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": MIME[extname(name)] || "text/plain" });
    res.end(readFileSync(file));
  });
}

function safeStatus(controller) {
  const s = controller.status();
  return { status: s.status, url: s.url, labels: s.labels };
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const root = defaultProjectRoot(); // announces if it made a throwaway copy
  const server = createA2Server(root);
  // Loopback ONLY — the process-control API must never be exposed off-machine
  // (independent-checker finding A). Same binding discipline as the preview server.
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`FounderGate V8-A2 Preview Bay on http://127.0.0.1:${PORT}`);
    console.log(`Attached project: ${root}`);
  });
}
