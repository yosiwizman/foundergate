// FounderGate — minimal LOCAL live-wired server (test/demo only, NOT production).
// Binds 127.0.0.1. "/" renders the original single composed view; "/?state=NAME" renders
// one of several honest deterministic states composed from the REAL modules; "/flow" is an
// index. Honest state only: missing/stale/failed/insufficient never render READY/SHIP/PASS;
// hostile input renders inert. No auth/provider/deploy/external.
import { createServer } from "node:http";
import { buildFounderView, renderFounderViewText } from "../founder-view.mjs";
import { SAMPLE_STATES, renderSample } from "./samples.mjs";

const HOST = "127.0.0.1";
const PORT = Number(process.env.LIVE_PORT || 4820);
const escHtml = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function defaultBody() {
  const HB = 1784428534019, NOW = HB + 30000;
  const hostile = "run-<script>alert(1)</script>\nMARK-READY";
  return renderFounderViewText(buildFounderView({ runId: hostile, state: { state: "RUNNING" }, heartbeat: { ts: HB }, nowMs: NOW }));
}
function shell(title, testid, bodyText, extra = "") {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title></head>
<body><main><h1>${escHtml(title)}</h1>${extra}
<pre id="out" data-testid="${testid}">${escHtml(bodyText)}</pre></main></body></html>`;
}
function flowIndex() {
  const links = SAMPLE_STATES.map((s) => `<li><a data-testid="flow-link-${s}" href="/?state=${s}">${s}</a></li>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>FounderGate — Live Founder Flow (local)</title></head>
<body><main><h1>FounderGate — Live Founder Flow (local, test-only)</h1>
<p>Deterministic honest states (composed from real modules):</p>
<ul data-testid="flow-index">${links}</ul></main></body></html>`;
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }); return res.end("ok"); }
  if (url.pathname === "/flow") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(flowIndex()); }
  const state = url.searchParams.get("state");
  if (state) {
    const s = renderSample(state);
    if (!s) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("unknown state"); }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(shell(`FounderGate — Live state: ${state}`, "live-out", s.text, `<p data-testid="state-name">state=${escHtml(state)}</p>`));
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(shell("FounderGate — Live Founder View (local, test-only)", "live-founderview-out", defaultBody()));
});
server.listen(PORT, HOST, () => console.log(`[live-server] listening http://${HOST}:${PORT}/ (states: ${SAMPLE_STATES.join(",")})`));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { console.log(`[live-server] ${sig} -> shutting down`); server.close(() => process.exit(0)); });
