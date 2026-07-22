// FounderGate LRCQ — witness authoritative-source parsers over REAL files/git/process state
// (FG-LRCQ-ACT-021). Proves the witness reads content, binds to the run, and fails closed — no line-count,
// no hard-coded safe value, no self-comparison. Read-only.
import { parseEvidenceIndex, protectedMainState, liveSupervisorOwners } from "../run-harness/witness-sources.mjs";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const ROOT = mkdtempSync(join(tmpdir(), "lrcq-wsrc-"));

try {
  // ---- parseEvidenceIndex: content + run-binding + fail-closed ----
  const idx = join(ROOT, "evidence-index.jsonl");
  const lines = [
    JSON.stringify({ t: 10, run_id: "R", job: "J1", sealed: true, attempt: 1 }),
    JSON.stringify({ t: 11, run_id: "R", job: "J2", sealed: true, attempt: 1 }),
    "",                                                                      // blank ignored
    "{ not json",                                                            // malformed
    JSON.stringify({ t: 12, run_id: "OTHER", job: "J1", sealed: true }),     // foreign run
    JSON.stringify({ t: 13, run_id: "R", job: "FAKE", sealed: true }),       // foreign job (not in backlog)
    JSON.stringify({ t: 11, run_id: "R", job: "J2", sealed: true, attempt: 1 }), // duplicate
    JSON.stringify({ t: 5, run_id: "R", job: "J3", sealed: true, attempt: 1 }),  // non-monotonic (t<lastT) but valid
  ].join("\n") + "\n";
  writeFileSync(idx, lines);
  const p = parseEvidenceIndex(idx, { runId: "R", jobIds: ["J1", "J2", "J3"] });
  ok("01 valid current-run records counted (J1,J2,J3)", p.valid_records === 3 && p.sealed_jobs === 3);
  ok("02 malformed line detected (fail-closed input)", p.malformed === 1);
  ok("03 foreign-run record rejected", p.foreign_run === 1);
  ok("04 fabricated job (not in backlog) rejected", p.foreign_job === 1);
  ok("05 duplicate record rejected", p.duplicates === 1);
  ok("06 non-monotonic timestamp flagged", p.non_monotonic === 1);
  ok("07 missing index -> present:false, zero progress", (() => { const q = parseEvidenceIndex(join(ROOT, "nope.jsonl"), { runId: "R", jobIds: ["J1"] }); return q.present === false && q.valid_records === 0; })());
  ok("08 line count alone does NOT establish progress (8 lines, only 3 valid)", p.valid_records !== 8);

  // ---- protectedMainState: real git ref, real drift, fail-closed on error ----
  const REPO = join(ROOT, "repo"); mkdirSync(REPO);
  git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
  writeFileSync(join(REPO, "a.txt"), "1"); git(["add", "-A"], REPO); git(["commit", "-q", "-m", "m1"], REPO);
  const MAIN1 = git(["rev-parse", "refs/heads/main"], REPO);
  git(["checkout", "-q", "-b", "candidate"], REPO); writeFileSync(join(REPO, "b.txt"), "2"); git(["add", "-A"], REPO); git(["commit", "-q", "-m", "cand"], REPO);
  const CAND = git(["rev-parse", "HEAD"], REPO);
  ok("09 protected-main unchanged (baseline==ref) -> ok:true; ref is main, not candidate HEAD", (() => { const r = protectedMainState({ repoRoot: REPO, ref: "refs/heads/main", baseline: MAIN1 }); return r.ok === true && r.current === MAIN1 && MAIN1 !== CAND; })());
  git(["checkout", "-q", "main"], REPO); writeFileSync(join(REPO, "c.txt"), "3"); git(["add", "-A"], REPO); git(["commit", "-q", "-m", "m2"], REPO); git(["checkout", "-q", "candidate"], REPO);
  ok("10 main drift while candidate unchanged -> ok:false", protectedMainState({ repoRoot: REPO, ref: "refs/heads/main", baseline: MAIN1 }).ok === false);
  ok("11 candidate change is NOT mistaken for main drift (main still matches baseline)", protectedMainState({ repoRoot: REPO, ref: "refs/heads/main", baseline: git(["rev-parse", "refs/heads/main"], REPO) }).ok === true);
  ok("12 git read failure -> ok:null (UNKNOWN, never 'unchanged')", protectedMainState({ repoRoot: REPO, ref: "refs/heads/does-not-exist", baseline: MAIN1 }).ok === null);
  ok("13 no reviewed baseline -> ok:null (fail closed)", protectedMainState({ repoRoot: REPO, ref: "refs/heads/main", baseline: null }).ok === null);

  // ---- liveSupervisorOwners: enumerate real state files, live PID + run binding ----
  const SUP = join(ROOT, "sup"); mkdirSync(SUP);
  writeFileSync(join(SUP, "supervisor-R.state.json"), JSON.stringify({ run_id: "R", supervisor_pid: process.pid, state: "RUN_ACTIVE" }));
  ok("14 one live owner detected", liveSupervisorOwners(SUP, "R") === 1);
  writeFileSync(join(SUP, "supervisor-R-dup.state.json"), JSON.stringify({ run_id: "R", supervisor_pid: process.pid, state: "RUN_ACTIVE" }));
  ok("15 duplicate live owners detected (2)", liveSupervisorOwners(SUP, "R") === 2);
  writeFileSync(join(SUP, "supervisor-R2.state.json"), JSON.stringify({ run_id: "R", supervisor_pid: 999999, state: "RUN_ACTIVE" }));
  ok("16 dead-PID state does not inflate owner count", liveSupervisorOwners(SUP, "R") === 2);
  ok("17 owners for a different run -> 0", liveSupervisorOwners(SUP, "OTHER") === 0);
} finally { try { rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ WITNESS-SOURCES SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
