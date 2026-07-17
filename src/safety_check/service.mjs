// FounderGate Phase 7.1 — Safety Check job service (zero-dependency, loopback-only).
//
// The UI action CREATES a real new runtime job: POST /api/check validates the fixed
// fixture, mints a run ID, and SPAWNS src/safety_check/run-job.sh (the real bounded VM
// pipeline). Progress + results are read from that run's disk ledger — never invented, never
// shown before evidence exists. Single active job. No shell interpolation of user input.
import { createServer } from "node:http";
import { spawn, execFileSync } from "node:child_process";
const execFileSyncQuiet = (script, dir, id) => execFileSync("node", [script, dir, id], { stdio: "ignore" });
import { readFileSync, existsSync, mkdirSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, extname } from "node:path";
import { randomUUID } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const UI = join(REPO, "src", "founder_url_drop", "ui");
const TOKENS = join(REPO, "src", "ui", "tokens.css");
const RUNS_DIR = process.env.FG_SAFETY_RUNS_DIR || join(REPO, "var", "foundergate", "safety-check", "runs");
const PORT = Number(process.env.FG_SAFETY_PORT || 4700);
const FIXTURE = "https://github.com/pypa/sampleproject";
// Deterministic UI-CI mode (clearly labeled): POST /api/check produces a synthetic COMPLETE
// run WITHOUT a real VM, so Playwright/axe can exercise the full flow. NEVER used for the
// founder witness — that path always spawns the real job. Marked scenario:"CI-FIXTURE".
const UI_CI = process.env.FG_UI_CI === "1";
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".zip": "application/zip", ".pdf": "application/pdf" };
const SAFE = new Set(["safety.html", "safety.css", "safety.js", "tokens.css"]);
mkdirSync(RUNS_DIR, { recursive: true });

const jres = (res, code, obj) => { res.writeHead(code, { "content-type": MIME[".json"] }); res.end(JSON.stringify(obj, null, 2)); };
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const runDir = (id) => join(RUNS_DIR, id);

export function classifyUrl(url) {
  if (typeof url !== "string" || !url.trim()) return { kind: "REFUSED", reason: "empty url" };
  const u = url.trim();
  if (u.startsWith("git@") || u.startsWith("ssh://") || u.startsWith("git://")) return { kind: "REFUSED", reason: "SSH/git URL not permitted" };
  if (u.startsWith("file://") || u.startsWith("/")) return { kind: "REFUSED", reason: "local path / file:// not permitted" };
  let p; try { p = new URL(u); } catch { return { kind: "REFUSED", reason: "unparseable URL" }; }
  if (p.protocol !== "https:") return { kind: "REFUSED", reason: "must be https" };
  if (p.username || p.password) return { kind: "REFUSED", reason: "embedded credentials not permitted" };
  if (["token","access_token","auth","password","api_key"].some((k)=>p.search.toLowerCase().includes(k))) return { kind: "REFUSED", reason: "credential in query string not permitted" };
  if (p.hostname.toLowerCase() !== "github.com") return { kind: "REFUSED", reason: "public github.com only" };
  const norm = p.origin + p.pathname.replace(/\/$/,"").replace(/\.git$/,"");
  if (norm === FIXTURE) return { kind: "FIXTURE" };
  return { kind: "HELD", reason: "HELD — GENERAL PUBLIC-REPOSITORY EXECUTION NOT YET AUTHORIZED" };
}

// Read a run's disk-backed state (stages from ledger, result if present). Bound to run_id.
export function readRun(id) {
  const dir = runDir(id);
  if (!existsSync(dir)) return null;
  const ledger = join(dir, "RUN_LEDGER.jsonl");
  const stages = [];
  if (existsSync(ledger)) for (const line of readFileSync(ledger, "utf8").split("\n")) { if (line.trim()) try { stages.push(JSON.parse(line)); } catch {} }
  const result = readJson(join(dir, "RUN_RESULT.json"));
  const req = readJson(join(dir, "RUN_REQUEST.json"));
  const last = stages[stages.length - 1];
  let status = "RUNNING";
  if (result?.status === "COMPLETE") status = "COMPLETE";
  else if (result?.status === "FAILED") status = "FAILED";
  else if (last?.name === "complete") status = "COMPLETE";
  // teardown_complete gate: only true when destroy stage done
  const teardown_complete = stages.some((s)=>s.name==="destroying disposable runtime" && s.status==="DONE");
  const evidence_pack = existsSync(join(dir, "EVIDENCE_PACK", "evidence-pack.zip"));
  return { run_id: id, repository_url: req?.repository_url || FIXTURE, status, stages, current_stage: last ? { n: last.stage, name: last.name, status: last.status } : null,
    result: status === "COMPLETE" ? result : null, teardown_complete, evidence_pack_ready: evidence_pack };
}

function activeRun() {
  if (!existsSync(RUNS_DIR)) return null;
  for (const id of readdirSync(RUNS_DIR)) { const r = readRun(id); if (r && r.status === "RUNNING") return r; }
  return null;
}
function latestRun() {
  const ids = readdirSync(RUNS_DIR).map((id)=>({id,t:statSync(runDir(id)).mtimeMs})).sort((a,b)=>b.t-a.t);
  return ids[0] ? readRun(ids[0].id) : null;
}

function startCheck(url) {
  const c = classifyUrl(url);
  if (c.kind !== "FIXTURE") return c;
  if (activeRun()) return { kind: "HELD", reason: "HELD — ONE SAFETY CHECK IS ALREADY RUNNING" };
  const run_id = "sc-" + randomUUID().slice(0, 8);
  const dir = runDir(run_id); mkdirSync(join(dir, "EVIDENCE_PACK"), { recursive: true });
  writeFileSync(join(dir, "RUN_REQUEST.json"), JSON.stringify({ run_id, repository_url: FIXTURE, requested_at: new Date().toISOString() }, null, 2));
  writeFileSync(join(dir, "RUN_RECOVERY_STATE.json"), JSON.stringify({ run_id, state: "STARTED" }, null, 2));
  if (UI_CI) {
    // synthetic deterministic run (labeled) — full stage set + completed result; NO VM.
    const stageNames = ["validating URL","resolving exact commit","acquiring immutable snapshot","validating archive","fingerprinting snapshot","creating disposable sandbox","running harness-owned compileability check","exporting evidence","removing temporary snapshot","destroying disposable runtime","generating Evidence Pack","complete"];
    writeFileSync(join(dir, "RUN_LEDGER.jsonl"), stageNames.map((n, i) => JSON.stringify({ ts: new Date().toISOString(), run_id, stage: i + 1, name: n, status: "DONE" })).join("\n") + "\n");
    writeFileSync(join(dir, "RUN_RESULT.json"), JSON.stringify({ run_id, fixture_url: FIXTURE, status: "COMPLETE", scenario: "CI-FIXTURE", exact_commit: "621e4974ca25ce531773def586ba3ed8e736b3fc", archive_sha256: "fd8597e4d351a9fd42007f48339dc93ee6469d8555fd0ff24906c69905357c01", canonical_manifest_sha256: "649ecb02d79d5cee55c86549b6dff26fb341c4a4de6d3c92d959c42714b6e7de", manifest_file_count: 12, port_binding_guard: "GUARD_PASS", egress_example_com: "DENIED", docker_socket: "ABSENT", classification: "COMPILEABILITY_OBSERVED", compileall_exit: 0, in_sandbox_manifest_matches_pro: true, teardown_get_status: "404", vm_destroyed: true, build_proven: false, tests_proven: false, security_proven: false, production_ready: false }, null, 2));
    writeFileSync(join(dir, "RUN_LIMITATIONS.json"), JSON.stringify({ compileability_observed: true, build_proven: false, tests_proven: false, security_proven: false, production_ready: false }, null, 2));
    try { execFileSyncQuiet(join(HERE, "evidence-pack.mjs"), dir, run_id); } catch {}
    return { kind: "STARTED", run_id, mode: "CI-FIXTURE" };
  }
  writeFileSync(join(dir, "RUN_LEDGER.jsonl"), JSON.stringify({ ts: new Date().toISOString(), run_id, stage: 0, name: "queued", status: "DONE" }) + "\n");
  const child = spawn("bash", [join(HERE, "run-job.sh"), run_id, dir], {
    detached: true, stdio: "ignore", env: { ...process.env, WT: REPO },
  });
  child.unref();
  return { kind: "STARTED", run_id };
}

export function createSafetyServer() {
  return createServer((req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    const path = u.pathname;
    if (path === "/") { res.writeHead(200, { "content-type": MIME[".html"] }); return res.end(readFileSync(join(UI, "safety.html"))); }
    if (path === "/api/health") return jres(res, 200, { ok: true, fixture: FIXTURE, active: !!activeRun() });
    if (path === "/api/state") { const a = activeRun() || latestRun(); return jres(res, 200, a || { status: "NEUTRAL", note: "no run yet — click Run Safety Check for the fixed fixture" }); }
    if (path === "/api/check" && req.method === "POST") {
      let body = ""; req.on("data", (c) => { body += c; if (body.length > 4000) req.destroy(); });
      req.on("end", () => { let url = ""; try { url = String(JSON.parse(body || "{}").url || ""); } catch {} return jres(res, 200, startCheck(url)); });
      return;
    }
    const runMatch = path.match(/^\/api\/runs\/([a-z0-9-]+)(\/evidence|\/evidence-pack|\/pause-request)?$/);
    if (runMatch) {
      const id = runMatch[1], sub = runMatch[2];
      const r = readRun(id); if (!r) return jres(res, 404, { error: "UNKNOWN run" });
      if (!sub) return jres(res, 200, r);
      if (sub === "/evidence") return jres(res, 200, { run_id: id, result: r.result, evidence_pack_ready: r.evidence_pack_ready });
      if (sub === "/evidence-pack") {
        const zip = join(runDir(id), "EVIDENCE_PACK", "evidence-pack.zip");
        if (r.status !== "COMPLETE" || !r.teardown_complete || !existsSync(zip)) return jres(res, 200, { status: "UNKNOWN", reason: "Evidence Pack not available until runtime + teardown complete" });
        res.writeHead(200, { "content-type": MIME[".zip"], "content-disposition": `attachment; filename="evidence-pack-${id}.zip"` });
        return res.end(readFileSync(zip));
      }
      if (sub === "/pause-request" && req.method === "POST") { writeFileSync(join(runDir(id), "PAUSE_REQUEST.json"), JSON.stringify({ requested_at: new Date().toISOString() })); return jres(res, 200, { pause: "requested", message: "Pause requested. FounderGate will stop at the next safe cleanup point. Immediate cancellation is not yet proven." }); }
    }
    const name = path.replace(/^\/(ui\/)?/, "");
    if (SAFE.has(name)) { const file = name === "tokens.css" ? TOKENS : join(UI, name); if (existsSync(file)) { res.writeHead(200, { "content-type": MIME[extname(file)] || "text/plain" }); return res.end(readFileSync(file)); } }
    res.writeHead(404, { "content-type": "text/plain" }); res.end("not found");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createSafetyServer().listen(PORT, "127.0.0.1", () => console.log(`FounderGate Safety Check on http://127.0.0.1:${PORT}/  (loopback only; fixed fixture ${FIXTURE})`));
}
