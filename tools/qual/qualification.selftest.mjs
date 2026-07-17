// Phase 7.1-Q qualification selftest — exercises the REAL service endpoints for the false-green,
// deny-path, unauthorized-path, evidence-binding, neutral-first and no-fabricated-result classes.
// Deterministic FG_UI_CI mode (labeled CI-FIXTURE; no VM). Auto-discoverable / CI-runnable.
process.env.FG_UI_CI = "1";
process.env.FG_SAFETY_RUNS_DIR = process.env.FG_SAFETY_RUNS_DIR || "/tmp/qual-selftest-runs";
import assert from "node:assert";
import { rmSync, mkdirSync } from "node:fs";
try { rmSync(process.env.FG_SAFETY_RUNS_DIR, { recursive: true, force: true }); } catch {}
mkdirSync(process.env.FG_SAFETY_RUNS_DIR, { recursive: true });
const { createSafetyServer, classifyUrl } = await import("../../src/safety_check/service.mjs");

const server = createSafetyServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const P = server.address().port;
const base = `http://127.0.0.1:${P}`;
const get = async (p) => { const r = await fetch(base + p); return { code: r.status, body: await r.json().catch(() => ({})) }; };
const post = async (p, obj) => { const r = await fetch(base + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(obj) }); return { code: r.status, body: await r.json() }; };

let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass += 1; };

// classifyUrl deny/hold paths (unit)
ok(classifyUrl("https://github.com/pypa/sampleproject").kind === "FIXTURE", "fixture accepted");
ok(classifyUrl("https://github.com/torvalds/linux").kind === "HELD", "non-fixture public HELD (unauthorized_path)");
ok(classifyUrl("git@github.com:foo/bar.git").kind === "REFUSED", "ssh REFUSED (deny_path)");
ok(classifyUrl("file:///etc/passwd").kind === "REFUSED", "file:// REFUSED (deny_path)");
ok(classifyUrl("https://github.com/x/y?token=abc").kind === "REFUSED", "credential-in-query REFUSED");
ok(classifyUrl("https://gitlab.com/x/y").kind === "REFUSED", "non-github REFUSED");
ok(classifyUrl("").kind === "REFUSED", "empty REFUSED (malformed_input)");

// neutral-first (no fabricated result before a run)
const st = await get("/api/state");
ok(st.body.status === "NEUTRAL", "neutral-first: /api/state NEUTRAL before any run (false_green guard)");

// unknown run -> 404, never a fabricated result
const unk = await get("/api/runs/sc-doesnotexist");
ok(unk.code === 404, "unknown run 404 (no fabricated result)");

// UI creates a run with a new run id
const started = await post("/api/check", { url: "https://github.com/pypa/sampleproject" });
ok(started.body.kind === "STARTED" && /^sc-/.test(started.body.run_id), "UI creates a run with a new run id");
const rid = started.body.run_id;

// deny/hold via the endpoint too
const held = await post("/api/check", { url: "https://github.com/torvalds/linux" });
ok(held.body.kind === "HELD", "endpoint HELD for non-fixture public url");
const refused = await post("/api/check", { url: "git@github.com:foo/bar.git" });
ok(refused.body.kind === "REFUSED", "endpoint REFUSED for ssh url");

// result is BOUND to run id + repo + exact commit, and claims stay NOT proven
const run = await get(`/api/runs/${rid}`);
const s = run.body.result || {};
ok(run.body.run_id === rid, "result bound to run id");
ok((s.fixture_url || run.body.repository_url).includes("pypa/sampleproject"), "result bound to repository");
ok(/^[0-9a-f]{40}$/.test(s.exact_commit || ""), "result carries exact commit (evidence_binding)");
ok(s.build_proven === false && s.tests_proven === false && s.security_proven === false && s.production_ready === false,
   "build/tests/security/production remain NOT proven");
ok(s.scenario === "CI-FIXTURE", "deterministic run is honestly labeled CI-FIXTURE (not a real VM)");

// teardown gate: completed CI-FIXTURE marks teardown + vm destroyed
ok(run.body.teardown_complete === true, "teardown_complete only after destroy stage");
ok(s.vm_destroyed === true, "vm destroyed recorded");

server.close();
console.log(`qualification.selftest: OK (${pass} checks — false-green, deny/hold, binding, neutral-first, teardown)`);
