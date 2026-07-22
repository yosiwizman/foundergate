// FounderGate LRCQ — FIRST-JOB WORKTREE PREPARATION under a LINKED-WORKTREE launch (FG-LRCQ-ACT-025).
// Hermetic production-route integration test. Reproduces the exact first-real-run condition — the run
// launched from a git worktree whose `.git` is a POINTER FILE, not the common dir — and drives the REAL
// production units (setupManager + gitWorktreeIdentity) through the first job's worktree lifecycle:
// CREATE -> VERIFY (branch AND repository identity) -> USE (provider-accept) -> REMOVE (tree gone).
//
// Regression it locks: before the fix, gitWorktreeIdentity derived the allowed repo's git dir via
// join(allowed_repository,".git") — a pointer FILE for a linked worktree — so EVERY job was refused
// pre-spawn ("belongs to a different repository"), yet setupManager (which only checked the branch)
// reported ok:true and the run dispatched into a refusal. "Prepared" must now IMPLY "provider-accepts".
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, mkdirSync, lstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setupManager, eligibleForSetup } from "../run-harness/setup-manager.mjs";
import { gitWorktreeIdentity } from "../provider/real-provider.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const g = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

const base = mkdtempSync(join(tmpdir(), "fg-fjwt-"));
const disposables = [];
try {
  // --- a normal "main" clone -------------------------------------------------------------------
  const main = join(base, "main"); mkdirSync(main);
  g(["init", "-q", "-b", "main"], main); g(["config", "user.email", "t@t"], main); g(["config", "user.name", "t"], main);
  writeFileSync(join(main, "seed.txt"), "x"); g(["add", "."], main); g(["commit", "-q", "-m", "c0"], main);
  const cand = g(["rev-parse", "HEAD"], main);

  // --- the run launches from a LINKED worktree of main (.git is a pointer FILE) -----------------
  const linked = join(base, "linked-run-dir");
  g(["worktree", "add", "-q", "-b", "lane/run-dir", linked, cand], main);
  disposables.push(["worktree", linked, "lane/run-dir"]);
  // Load-bearing precondition: the launch dir must be a LINKED worktree — its `.git` is a regular
  // FILE (a `gitdir:` pointer), NOT a directory. This is the exact condition the fix addresses; if it
  // is not met, the rest of the test is not exercising the real-run topology.
  ok("00 launch dir is a LINKED worktree (its .git is a pointer FILE, not a dir)", existsSync(join(linked, ".git")) && lstatSync(join(linked, ".git")).isFile());

  // --- run through the REAL setupManager, from the linked worktree ------------------------------
  const manifest = { branch_prefix: "lane/fjwt-", permitted_worktree_root: join(base, "wtroot") };
  const run_id = "run1";
  const jobs = [
    { job_id: "frr-0", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", gate_trigger: "NONE", allowed_files: ["src/a.mjs"], dependencies: [] },
    { job_id: "frr-1", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", gate_trigger: "NONE", allowed_files: ["src/b.mjs"], dependencies: [] },
  ];
  ok("01 both jobs are eligible for setup", jobs.every((j) => eligibleForSetup(j).ok));

  // repoRoot = the LINKED worktree (== manifest.repository_root / activation.allowed_repository in the real run)
  const setup = setupManager(jobs, run_id, manifest, { git: g, repoRoot: linked, candidateRef: cand });
  ok("02 setupManager returns ok:true from a linked-worktree launch (was the silent gap)", setup.ok === true);
  ok("03 exactly one worktree created per eligible job", setup.created.length === jobs.length);
  ok("04 every worktree_identity step PASSED (branch AND same_repo)", setup.steps.filter((s) => s.step.startsWith("worktree_identity")).every((s) => s.status === "PASS"));

  // --- the KEYSTONE: each prepared worktree is provider-ACCEPTED (prepared ⟺ provider-accepts) --
  // allowed_repository is the LINKED worktree — the exact real-run value that previously caused refusal.
  const activation = { allowed_repository: linked };
  for (const c of setup.created) {
    const job = { worktree: c.worktree, branch: c.branch };
    const res = gitWorktreeIdentity(job, activation, g);
    ok("05 provider ACCEPTS prepared worktree " + c.job_id + " (fix proven; res=" + (res || "null") + ")", res === null);
  }

  // --- NEGATIVE: a worktree from a DIFFERENT repository is still refused ------------------------
  const other = join(base, "other"); mkdirSync(other);
  g(["init", "-q", "-b", "main"], other); g(["config", "user.email", "t@t"], other); g(["config", "user.name", "t"], other);
  writeFileSync(join(other, "z.txt"), "z"); g(["add", "."], other); g(["commit", "-q", "-m", "c0"], other);
  const otherWt = join(base, "other-wt");
  g(["worktree", "add", "-q", "-b", "lane/other", otherWt, "HEAD"], other);
  disposables.push(["worktree", otherWt, "lane/other", other]);
  const refuseOther = gitWorktreeIdentity({ worktree: otherWt, branch: "lane/other" }, activation, g);
  ok("06 NEGATIVE: worktree from a different repo is REFUSED", typeof refuseOther === "string" && /different repository/.test(refuseOther));

  // --- NEGATIVE: detached / wrong-branch worktree is refused -----------------------------------
  const wrongBranch = gitWorktreeIdentity({ worktree: setup.created[0].worktree, branch: "lane/NOT-the-real-branch" }, activation, g);
  ok("07 NEGATIVE: assigned branch != actual branch is REFUSED", typeof wrongBranch === "string" && /!=/.test(wrongBranch));

  // --- USE + REMOVE: teardown removes the worktrees; tree is gone ------------------------------
  const wtPaths = setup.created.map((c) => c.worktree);
  ok("08 worktrees exist on disk before teardown", wtPaths.every((p) => existsSync(p)));
  setup.teardown();
  ok("09 teardown removes every job worktree (tree gone)", wtPaths.every((p) => !existsSync(p)));
  const stillRegistered = g(["worktree", "list", "--porcelain"], linked);
  ok("10 no torn-down worktree remains git-registered", wtPaths.every((p) => !stillRegistered.includes(p)));
} finally {
  // best-effort disposable cleanup (never touches any real repo)
  try { execFileSync("rm", ["-rf", base], { stdio: "ignore" }); } catch { /* */ }
}

console.log("\nLRCQ FIRST-JOB-WORKTREE (LINKED) SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
