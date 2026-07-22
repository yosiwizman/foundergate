// FounderGate LRCQ — Reconciliation Inbox + filesystem-backed crash/restart tests.
// Uses REAL disposable directories + the persist layer. NO Claude, NO provider.
import { ReconciliationInbox, inboxEntry, INBOX_STATEMENTS } from "../reconciliation/inbox.mjs";
import { canDispatch, reconcile } from "../reconciliation/transaction.mjs";
import { Controller, MODE } from "../controller.mjs";
import { saveSnapshot, resume, detectLiveRun } from "../persist.mjs";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const tx = (o = {}) => ({ transaction_id: "t", idempotency_key: "k", job_id: "j", attempt: 1, target: "lane/j", evidence_links: ["/ev/j"], ...o });

// ---- INBOX MODEL ----
{ const e = inboxEntry(tx(), { dispatch_exists: true, process_alive: false, definitive_result: false });
  ok("01 dead-process/no-result -> NEEDS_RECONCILIATION, held, no safe retry", e.reconciliation_classification === "NEEDS_RECONCILIATION" && e.founder_action_required === true && e.safe_retry === false && e.recommendation === "BRANCH"); }
{ const e = inboxEntry(tx(), { intent_exists: true, dispatch_exists: false, process_alive: false, worktree_unchanged: true });
  ok("02 intent-only -> SAFE_TO_RESUME, not held", e.reconciliation_classification === "SAFE_TO_RESUME" && e.founder_action_required === false && e.safe_retry === true); }
{ const e = inboxEntry(tx(), { checkpoint_corrupt: true });
  ok("03 corrupt checkpoint -> HELD + founder action", e.reconciliation_classification === "HELD" && e.founder_action_required === true); }
{ const e = inboxEntry(tx(), {});
  ok("04 unknown -> EXTERNAL_EFFECT_UNKNOWN held (never green)", e.reconciliation_classification === "EXTERNAL_EFFECT_UNKNOWN" && e.founder_action_required === true); }
{ const inbox = new ReconciliationInbox();
  inbox.add(tx({ idempotency_key: "safe" }), { intent_exists: true, worktree_unchanged: true });
  inbox.add(tx({ idempotency_key: "held" }), {});
  ok("05 pending() returns only held entries", inbox.pending().length === 1 && inbox.pending()[0].idempotency_key === "held");
  ok("06 mayAutoRetry true only for safe non-held", inbox.mayAutoRetry("safe") === true && inbox.mayAutoRetry("held") === false); }
ok("07 inbox statements present", INBOX_STATEMENTS.some((s) => /will not retry an uncertain action/.test(s)));

// ---- FILESYSTEM-BACKED CRASH / RESTART (real dirs + persist layer) ----
const root = mkdtempSync(join(tmpdir(), "lrcq-crash-"));
const mkController = (id) => { const c = new Controller({ run_id: id, now: 1000, maxWidth: 1, mode: MODE.SIMULATION_ONLY }); c.load([{ job_id: "j1", title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/j1.mjs"], forbidden_files: [], branch: "lane/j1", worktree: "/wt/j1", expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING" }, { job_id: "j2", title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/j2.mjs"], forbidden_files: [], branch: "lane/j2", worktree: "/wt/j2", expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING" }]); return c; };

// crash after job started (RUNNING, unsealed) -> resume resets to PENDING (no double-run)
{ const dir = join(root, "c1"); const c = mkController("r1"); c.refill(); saveSnapshot(dir, c); const r = resume(dir);
  ok("08 crash during builder (unsealed RUNNING) -> PENDING re-attempt", r.byId.get(c.jobs.find((j) => j.status === "RUNNING").job_id).status === "PENDING"); }
// crash after evidence sealed but before final -> resume promotes to COMPLETED (no re-run)
{ const dir = join(root, "c2"); const c = mkController("r2"); c.refill(); const rj = c.jobs.find((j) => j.status === "RUNNING").job_id; c.sealed.add(rj); saveSnapshot(dir, c); const r = resume(dir);
  ok("09 crash after seal, before final -> COMPLETED (no double-run)", r.byId.get(rj).status === "COMPLETED"); }
// restart resumes to completion without duplicate completion events
{ const dir = join(root, "c3"); const c = mkController("r3"); c.refill(); saveSnapshot(dir, c); const r = resume(dir); r.runToCompletion();
  const dups = r.events.filter((e) => e.event_type === "job_completed").reduce((m, e) => { m[e.job_id] = (m[e.job_id] || 0) + 1; return m; }, {});
  ok("10 restart -> no duplicate completion events", Object.values(dups).every((v) => v <= 1)); }
// interrupted evidence write: snapshot missing -> resume returns null (fail-closed), not a fake state
{ ok("11 missing snapshot -> resume null (no fabricated state)", resume(join(root, "does-not-exist")) === null); }
// live run detected (refuse duplicate supervisor); stale lock recoverable
{ const dir = join(root, "c4"); const c = mkController("r4"); c.now = 5000; c.refill(); saveSnapshot(dir, c);
  ok("12 live run detected (duplicate supervisor refused)", detectLiveRun(dir, 5010).live === true);
  ok("13 stale lock recoverable (not treated as live)", detectLiveRun(dir, 5000 + 10000).live === false); }
// recovery never starts a founder-gated job
{ const dir = join(root, "c5"); const c = new Controller({ run_id: "r5", now: 1000, mode: MODE.SIMULATION_ONLY }); c.load([{ job_id: "g", title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/g.mjs"], forbidden_files: [], branch: "lane/g", worktree: "/wt/g", expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "FOUNDER_GATE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING" }]); saveSnapshot(dir, c); const r = resume(dir);
  ok("14 recovery leaves founder-gate job HELD (never started)", r.byId.get("g").status === "HELD"); }
// duplicate idempotency-key dispatch refused (real dispatch registry)
{ const disp = { k: { state: "DISPATCHED" } };
  ok("15 duplicate idempotency dispatch refused", canDispatch({ transaction_id: "t", idempotency_key: "k", run_id: "r", job_id: "j", attempt: 2, role: "builder", candidate_stack: "s", backlog_digest: "d", lease_digest: "l", blast_budget_digest: "b", prompt_digest: "p", tool_digests: "t", worktree: "/wt", branch: "lane/j", pre_action_fingerprint: "f", deadline_epoch: 9e12, budget_usd: 1, evidence_dir: "/e", state: "AUTHORIZED" }, disp).duplicate === true); }

try { rmSync(root, { recursive: true, force: true }); } catch { /* */ }
console.log("\nLRCQ INBOX-RECOVERY SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
