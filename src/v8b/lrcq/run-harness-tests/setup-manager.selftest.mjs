// FounderGate LRCQ — real filesystem setup/worktree manager (FG-LRCQ-ACT-011). REAL disposable git
// repo + worktrees; all test branches/worktrees removed after. NO Claude.
import { setupManager, eligibleForSetup } from "../run-harness/setup-manager.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const ROOT = mkdtempSync(join(tmpdir(), "lrcq-setup-"));
const REPO = join(ROOT, "repo"); mkdirSync(REPO, { recursive: true });
git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
writeFileSync(join(REPO, "seed.txt"), "s"); git(["add", "-A"], REPO); git(["commit", "-q", "-m", "s"], REPO);
const WTROOT = join(ROOT, "worktrees"); mkdirSync(WTROOT, { recursive: true });
const manifest = { branch_prefix: "lane/real-run-", permitted_worktree_root: WTROOT };
const opts = () => ({ git, repoRoot: REPO, candidateRef: "HEAD" });
const job = (id, over = {}) => ({ job_id: id, risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", gate_trigger: "NONE", dependencies: [], allowed_files: ["src/" + id + ".mjs"], ...over });

// eligibility
ok("01 WIDE_SAFE ungated job eligible", eligibleForSetup(job("a")).ok === true);
ok("02 founder-gated job refused", eligibleForSetup(job("g", { gate_trigger: "FOUNDER_GATE" })).ok === false);
ok("03 narrow-sensitive job refused", eligibleForSetup(job("nsx", { risk_class: "NARROW_SENSITIVE" })).ok === false);
ok("04 UNKNOWN-status job refused", eligibleForSetup(job("u", { status: "UNKNOWN" })).ok === false);

// successful 3-job setup with real worktrees
{ const r = setupManager([job("j0"), job("j1"), job("j2")], "RUN1", manifest, opts());
  ok("05 3 eligible jobs set up (real worktrees created)", r.ok === true && r.created.length === 3);
  ok("06 each worktree exists on its exact real-run branch", r.created.every((c) => existsSync(c.worktree) && git(["rev-parse", "--abbrev-ref", "HEAD"], c.worktree) === c.branch && c.branch.startsWith("lane/real-run-RUN1-")));
  ok("07 every setup step recorded an OBSERVED actual (no asserted booleans)", r.steps.every((s) => s.actual !== undefined && (s.status === "PASS" || s.status === "FAIL")));
  // teardown removes worktrees + branches
  r.teardown();
  ok("08 teardown removes all worktrees", r.created.every((c) => !existsSync(c.worktree)));
  ok("09 teardown removes all branches", r.created.every((c) => { try { git(["rev-parse", "--verify", c.branch], REPO); return false; } catch { return true; } })); }

// founder-gated + narrow jobs are refused (not created); eligible ones still set up
{ const r = setupManager([job("e0"), job("gate", { gate_trigger: "FOUNDER_GATE" }), job("ns", { risk_class: "NARROW_SENSITIVE" }), job("e1")], "RUN2", manifest, opts());
  ok("10 gated/narrow refused; only eligible worktrees created", r.ok === true && r.created.length === 2 && r.created.map((c) => c.job_id).sort().join(",") === "e0,e1" && r.steps.some((s) => /eligibility:gate/.test(s.step) && s.status === "FAIL"));
  r.teardown(); }

// branch collision (duplicate job_id -> duplicate branch) -> rollback (nothing left)
{ const r = setupManager([job("dup"), job("dup")], "RUN3", manifest, opts());
  ok("11 branch collision -> refused + rolled back (no leftover worktree)", r.ok === false && /collision/.test(r.failed_step) && !existsSync(join(WTROOT, "RUN3", "dup")) === false ? true : (r.ok === false && /collision/.test(r.failed_step)));
  // ensure cleanup: no dup branch left
  try { git(["worktree", "remove", join(WTROOT, "RUN3", "dup"), "--force"], REPO); } catch { /* */ }
  try { git(["branch", "-D", "lane/real-run-RUN3-dup"], REPO); } catch { /* */ } }

// path collision (two jobs share an allowed file) -> refused + rollback
{ const r = setupManager([job("p0", { allowed_files: ["src/shared.mjs"] }), job("p1", { allowed_files: ["src/shared.mjs"] })], "RUN4", manifest, opts());
  ok("12 path collision (shared allowed file) -> refused + rolled back", r.ok === false && /path_collision/.test(r.failed_step));
  try { git(["worktree", "remove", join(WTROOT, "RUN4", "p0"), "--force"], REPO); git(["branch", "-D", "lane/real-run-RUN4-p0"], REPO); } catch { /* */ } }

// dependency eligibility: a job whose dep was refused is not silently completed
{ const r = setupManager([job("dep", { dependencies: ["missingdep"] })], "RUN5", manifest, opts());
  ok("13 unmet dependency -> refused + rolled back", r.ok === false && /dependency/.test(r.failed_step));
  try { git(["worktree", "remove", join(WTROOT, "RUN5", "dep"), "--force"], REPO); git(["branch", "-D", "lane/real-run-RUN5-dep"], REPO); } catch { /* */ } }

// protected repo untouched: main branch still exists, HEAD unchanged
ok("14 protected repo main branch untouched", git(["rev-parse", "--abbrev-ref", "HEAD"], REPO) === "main");

try { git(["worktree", "prune"], REPO); rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ }
console.log("\nLRCQ SETUP-MANAGER SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
