// FounderGate — minimal LOCAL live-wired server (test/demo only, NOT production).
// Binds 127.0.0.1 and server-side-renders the composed founder-view from the REAL
// modules (not static HTML). Honest state: missing signals render UNKNOWN; a hostile
// run_id is neutralized by the composed renderers. No auth/provider/deploy/external.
import { createServer } from "node:http";
import { buildFounderView, renderFounderViewText } from "../founder-view.mjs";

const HOST = "127.0.0.1";
const PORT = Number(process.env.LIVE_PORT || 4820);
const escHtml = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// Deterministic sample: present status/command/console (runId+state+heartbeat);
// ABSENT url/decision/presence/safety -> those sections are UNKNOWN (never faked).
function composeBody() {
  const HB = 1784428534019, NOW = HB + 30000;
  const hostile = "run-<script>alert(1)</script>\nMARK-READY"; // hostile run_id
  const view = buildFounderView({ runId: hostile, state: { state: "RUNNING" }, heartbeat: { ts: HB }, nowMs: NOW });
  return renderFounderViewText(view); // plain text; child renderers already escaped run_id
}
function pageHtml() {
  // textContent of the <pre> will equal the plain-text render (HTML-escaped for embedding).
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>FounderGate — Live Founder View (local, test-only)</title></head>
<body><main><h1>FounderGate — Live Founder View (local, test-only)</h1>
<pre id="out" data-testid="live-founderview-out">${escHtml(composeBody())}</pre></main></body></html>`;
}

const server = createServer((req, res) => {
  if (req.url === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }); return res.end("ok"); }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(pageHtml());
});
server.listen(PORT, HOST, () => console.log(`[live-server] listening http://${HOST}:${PORT}/ (test-only, local)`));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { console.log(`[live-server] ${sig} -> shutting down`); server.close(() => process.exit(0)); });
