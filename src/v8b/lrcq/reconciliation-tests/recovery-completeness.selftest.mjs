// FounderGate LRCQ — recovery completeness (A10). Adds the first-internal-run crash points not
// already covered by inbox-recovery.selftest. Real disposable dirs; NO Claude/provider.
import { reconcile, mayResume } from "../reconciliation/transaction.mjs";
import { ReplayStream } from "../run-harness/replay.mjs";
import { atomicWrite, resume, detectLiveRun } from "../persist.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const root = mkdtempSync(join(tmpdir(), "lrcq-rec-"));
const mk = (d) => { mkdirSync(d, { recursive: true }); return d; };
const ev = (i) => ({ run_id: "r", job_id: "j" + i, attempt: 1, role: "builder", provider: "p", model_id: null, cli_version: "c", executable_identity: "e", policy_version: "pv", candidate_stack: "s", prompt_digest: "pd", allowed_tools_digest: "a", denied_tools_digest: "d", lease_digest: "l", blast_budget_digest: "b", stdout_digest: "o", stderr_digest: "e2", transcript_digest: "t", branch: "lane", worktree: "/wt", pre_fingerprint: "pf", post_fingerprint: "pf", checkpoint_before: "cb", checkpoint_after: "ca", transaction_state: "SEALED", reconciliation_state: "n/a", evidence_path: "/e", timestamp: i });

// restart during checker (interrupted, no definitive result) -> NEEDS_RECONCILIATION, not auto-completed
{ const r = reconcile({ dispatch_exists: true, process_alive: false, definitive_result: false });
  ok("01 restart during checker -> NEEDS_RECONCILIATION (not auto-completed)", r.state === "NEEDS_RECONCILIATION" && r.recommend === "BRANCH"); }
// restart during builder (intent only) -> SAFE_TO_RESUME only w/ no-dup proof
{ const r = reconcile({ intent_exists: true, dispatch_exists: false, process_alive: false, worktree_unchanged: true });
  ok("02 restart during builder -> SAFE_TO_RESUME, resume only w/ no-dup proof", r.state === "SAFE_TO_RESUME" && mayResume(r, true) === true && mayResume(r, false) === false); }
ok("03 corrupt checkpoint -> HELD", reconcile({ checkpoint_corrupt: true }).state === "HELD");
// partial replay write: truncated/garbage trailing record breaks chain verification
{ const rs = new ReplayStream("r"); rs.append(ev(1)); rs.append(ev(2));
  ok("04 intact replay verifies", rs.verifyChain().ok === true);
  rs.records[1].chain_digest = "sha256:garbage-partial";
  ok("05 partial/garbage replay record detected", rs.verifyChain().ok === false); }
// interrupted evidence write: partially-written (invalid JSON) snapshot -> resume fail-closed (null)
{ const dir = mk(join(root, "partial")); writeFileSync(join(dir, "snapshot.json"), '{ "jobs": [ {"job_id":"a"');
  ok("06 interrupted evidence write (truncated snapshot) -> resume null (fail-closed)", resume(dir) === null); }
// unavailable evidence directory -> resume null (fail-closed)
ok("07 unavailable evidence dir -> resume null", resume(join(root, "does-not-exist")) === null);
// disk-full / unwritable fixture: atomicWrite where a parent path component is a FILE throws
// (ENOTDIR) -> caller HOLDs, prior state intact.
{ const dir = mk(join(root, "ro")); const good = join(dir, "state.json"); atomicWrite(good, { v: 1 });
  writeFileSync(join(dir, "blocker"), "i am a file, not a dir");
  let threw = false; try { atomicWrite(join(dir, "blocker", "x.json"), { v: 2 }); } catch { threw = true; }
  ok("08 unwritable target (parent is a file) throws (HOLD) + prior state intact", threw === true && JSON.parse(readFileSync(good, "utf8")).v === 1); }
// stale run recoverable; live run refused (duplicate supervisor)
{ const dir = mk(join(root, "lock")); atomicWrite(join(dir, "recovery-state.json"), { run_id: "r", now: 1000, runtime_state: "RUNNING", jobs: [] });
  ok("09 live run refused (duplicate supervisor)", detectLiveRun(dir, 1100).live === true);
  ok("10 stale run recoverable (not treated as live)", detectLiveRun(dir, 1000 + 100000).live === false); }
// exact next-safe-action recovery: durably readable after crash
{ const dir = mk(join(root, "nsa")); atomicWrite(join(dir, "next-safe-action.txt"), "resume j1 after no-duplicate proof");
  ok("11 next-safe-action durably recoverable from disk", existsSync(join(dir, "next-safe-action.txt")) && /no-duplicate/.test(readFileSync(join(dir, "next-safe-action.txt"), "utf8"))); }
ok("12 unestablished state -> EXTERNAL_EFFECT_UNKNOWN (never green)", reconcile({}).state === "EXTERNAL_EFFECT_UNKNOWN");

try { rmSync(root, { recursive: true, force: true }); } catch { /* */ }
console.log("\nLRCQ RECOVERY-COMPLETENESS SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
