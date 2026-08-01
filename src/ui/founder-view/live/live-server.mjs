// FounderGate — minimal LOCAL live-wired server (test/demo only, NOT production).
// Routes: "/" composed view; "/?state=NAME" honest sample states; "/flow" index;
// "/doctor" local Doctor; "/golden-path" the founder-readable V1 golden-path screen;
// "/healthz". 127.0.0.1 only. No auth/provider/deploy/external.
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { buildFounderView, renderFounderViewText } from "../founder-view.mjs";
import { SAMPLE_STATES, renderSample } from "./samples.mjs";
import { buildDoctor, renderDoctorReport } from "./doctor.mjs";
import { buildRunLifecycle, renderRunLifecycleText } from "../../../autonomous-run/console/run-lifecycle.mjs";
import { buildIntakeView, renderIntakeText } from "../../../founder_url_drop/intake/url-intake.mjs";
import { buildDecisionPackage, renderDecisionText } from "../../../evidence/decision-package/decision-package.mjs";
import { buildShipReport, renderShipReportText } from "../ship-report.mjs";

const HOST = "127.0.0.1";
const PORT = Number(process.env.LIVE_PORT || 4820);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const shell = (title, tid, body, extra = "") => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title></head>
<body><main><h1>${esc(title)}</h1>${extra}<pre id="out" data-testid="${tid}">${esc(body)}</pre></main></body></html>`;

function defaultBody() {
  const HB = 1784428534019, NOW = HB + 30000;
  return renderFounderViewText(buildFounderView({ runId: "run-<script>alert(1)</script>\nMARK-READY", state: { state: "RUNNING" }, heartbeat: { ts: HB }, nowMs: NOW }));
}
function doctorBody() {
  const signals = { node: true, npm: true, node_modules: existsSync(join(process.cwd(), "node_modules")),
    browsers: existsSync(join(homedir(), "Library/Caches/ms-playwright")), local_server: true, evidence_root: true };
  return renderDoctorReport(buildDoctor({ signals, identity: { repo: "yosiwizman/foundergate", main_sha: "65fd0166 (local demo)", evidence_root: "~/.foundergate/runs/" } }));
}
function goldenPathBody() {
  // A founder-readable V1 golden-path screen composed from REAL modules (stub contract; no provider).
  const contract = { run_id: "gp-demo-001", deadline_utc: "2026-08-01T06:00:00Z", budget_usd: 0, stop_condition: "authorized queue exhausted" };
  const lifecycle = buildRunLifecycle({ contract, state: "READY_FOR_AUTHORIZATION", requiresProvider: true, providerAuthorized: false });
  const intake = buildIntakeView("https://github.com/yosiwizman/foundergate");
  const pkg = buildDecisionPackage({ verdict: "READY_FOR_REVIEW", limitations: ["local demo only — not production-ready"], run_id: contract.run_id });
  const ship = buildShipReport({ decisionPackage: pkg, checkerVerdict: "CLEAN", gateAdvisorVerdict: "READY_FOR_REVIEW_WITH_LIMITS", nowMs: 1784428600000 });
  return [
    "== FOUNDERGATE — V1 GOLDEN PATH (local, test-only) ==",
    "", "-- 1. DOCTOR --", doctorBody(),
    "", "-- 2. CONTROLLED INTAKE --", renderIntakeText(intake),
    "", "-- 3. LIVE RUN CONSOLE --", renderRunLifecycleText(lifecycle),
    "", "-- 4. DECISION PACKAGE --", renderDecisionText(pkg),
    "", "-- 5. FOUNDER SHIP REPORT --", renderShipReportText(ship),
    "", "NOTE: local golden-path demo. Provider is NOT_ACTIVATED. Nothing here is production/customer/final-beta.",
  ].join("\n");
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  const html = (title, tid, body, extra) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(shell(title, tid, body, extra)); };
  if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }); return res.end("ok"); }
  if (url.pathname === "/doctor") return html("FounderGate — Doctor (local)", "doctor-out", doctorBody());
  if (url.pathname === "/golden-path") return html("FounderGate — V1 Golden Path (local, test-only)", "golden-path-out", goldenPathBody(), `<p data-testid="gp-provider">provider=NOT_ACTIVATED</p>`);
  if (url.pathname === "/flow") {
    const links = SAMPLE_STATES.map((s) => `<li><a data-testid="flow-link-${s}" href="/?state=${s}">${s}</a></li>`).join("");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FounderGate — Live Founder Flow (local)</title></head><body><main><h1>FounderGate — Live Founder Flow (local, test-only)</h1><ul data-testid="flow-index">${links}<li><a data-testid="flow-link-golden-path" href="/golden-path">golden-path</a></li><li><a data-testid="flow-link-doctor" href="/doctor">doctor</a></li></ul></main></body></html>`);
  }
  const state = url.searchParams.get("state");
  if (state) { const s = renderSample(state); if (!s) { res.writeHead(404); return res.end("unknown state"); } return html(`FounderGate — Live state: ${state}`, "live-out", s.text, `<p data-testid="state-name">state=${esc(state)}</p>`); }
  return html("FounderGate — Live Founder View (local, test-only)", "live-founderview-out", defaultBody());
});
server.listen(PORT, HOST, () => console.log(`[live-server] listening http://${HOST}:${PORT}/ (routes: / /flow /doctor /golden-path /?state=)`));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { console.log(`[live-server] ${sig} -> shutting down`); server.close(() => process.exit(0)); });
