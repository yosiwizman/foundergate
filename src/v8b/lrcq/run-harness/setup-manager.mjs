// FounderGate LRCQ — real filesystem-backed setup/worktree manager (FG-LRCQ-ACT-011). Mechanically
// creates, verifies, and rolls back one branch + one isolated worktree per ELIGIBLE WIDE_SAFE job
// from the exact candidate. No asserted booleans: every result is an observed value. Founder-gated,
// narrow-sensitive, HELD and UNKNOWN jobs are refused. Never alters protected main; never reuses a
// worktree; never creates two writers for one path. Deterministic rollback removes only lane-owned state.
import { execFileSync } from "node:child_process";
import { fixedGit } from "../assurance/fixed-executables.mjs";
import { existsSync, realpathSync } from "node:fs";
import { sep } from "node:path";
import { resolveRunPlan } from "./run-plan.mjs";

// Authoritative common git dir of a path (realpath'd for macOS /private symlink parity with the
// provider's identity check). Returns null when the path is not inside a git tree.
function commonGitDir(git, path) { try { return realpathSync(git(["rev-parse", "--path-format=absolute", "--git-common-dir"], path)); } catch { return null; } }

export function eligibleForSetup(job) {
  if (job.risk_class !== "WIDE_SAFE") return { ok: false, reason: "not WIDE_SAFE (" + job.risk_class + ")" };
  if (job.effect_class && !["LOCAL_FS"].includes(job.effect_class)) return { ok: false, reason: "effect_class " + job.effect_class };
  if (job.gate_trigger && job.gate_trigger !== "NONE") return { ok: false, reason: "founder-gated (" + job.gate_trigger + ")" };
  if (["HELD", "UNKNOWN", "PARKED"].includes(job.status)) return { ok: false, reason: "status " + job.status };
  return { ok: true };
}

// opts: { git(argsArr, cwd), repoRoot, candidateRef, exists }
export function setupManager(jobs, run_id, manifest, opts = {}) {
  // FG-CHK-197-02: the DEFAULT git runner is the FIXED ABSOLUTE /usr/bin/git in a minimal environment.
  const git = opts.git || ((a, cwd) => fixedGit(a, { cwd }));
  const exists = opts.exists || existsSync;
  const candidateRef = opts.candidateRef || "HEAD";
  const repoRoot = opts.repoRoot;
  const steps = []; const created = []; const rec = (step, expected, actual, pass, evidence) => steps.push({ step, expected, actual, status: pass ? "PASS" : "FAIL", evidence, rollback: pass ? null : "remove lane-owned branch+worktree", next_safe_action: pass ? "proceed" : "rollback + report" });

  const usedBranches = new Set(); const usedWorktrees = new Set(); const usedPaths = new Map();
  const rollback = () => { for (const c of created.reverse()) { try { git(["worktree", "remove", c.worktree, "--force"], repoRoot); } catch { /* */ } try { git(["branch", "-D", c.branch], repoRoot); } catch { /* */ } } };

  for (const job of jobs) {
    const el = eligibleForSetup(job);
    if (!el.ok) { rec("eligibility:" + job.job_id, "eligible", el.reason, false); continue; } // refused, not created
    const plan = resolveRunPlan(job, run_id, manifest);
    // collisions
    if (usedBranches.has(plan.branch)) { rec("branch_collision:" + job.job_id, "unique branch", plan.branch, false); rollback(); return { ok: false, steps, created: [], failed_step: "branch_collision:" + job.job_id }; }
    if (usedWorktrees.has(plan.worktree)) { rec("worktree_collision:" + job.job_id, "unique worktree", plan.worktree, false); rollback(); return { ok: false, steps, created: [], failed_step: "worktree_collision:" + job.job_id }; }
    for (const f of job.allowed_files || []) { if (usedPaths.has(f) && usedPaths.get(f) !== job.job_id) { rec("path_collision:" + job.job_id, "single writer for " + f, usedPaths.get(f), false); rollback(); return { ok: false, steps, created: [], failed_step: "path_collision:" + job.job_id }; } usedPaths.set(f, job.job_id); }
    if (plan.branch === "main" || plan.branch.endsWith("/main")) { rec("protected_main:" + job.job_id, "not main", plan.branch, false); rollback(); return { ok: false, steps, created: [], failed_step: "protected_main:" + job.job_id }; }
    // create worktree + branch from the exact candidate
    try { git(["worktree", "add", "-q", "-b", plan.branch, plan.worktree, candidateRef], repoRoot); }
    catch (e) { rec("create:" + job.job_id, "worktree created", "error: " + (e.message || e), false); rollback(); return { ok: false, steps, created: [], failed_step: "create:" + job.job_id }; }
    created.push({ job_id: job.job_id, branch: plan.branch, worktree: plan.worktree });
    usedBranches.add(plan.branch); usedWorktrees.add(plan.worktree);
    // OBSERVE: worktree exists, on the exact branch, correct repository common-dir, not detached
    const onBranch = (() => { try { return git(["rev-parse", "--abbrev-ref", "HEAD"], plan.worktree); } catch { return "(err)"; } })();
    const wtExists = exists(plan.worktree);
    // FG-LRCQ-ACT-025: verify the SAME repository-identity fact the provider requires — the job
    // worktree's common git dir must equal (or nest under) the allowed repository's common git dir.
    // repoRoot may itself be a linked worktree (its `.git` is a pointer file), so both sides are
    // resolved via git rev-parse, not join(path,".git"). Without this, setup deemed a worktree
    // "prepared" that the provider then refused ("belongs to a different repository") — the exact
    // first-real-run defect. "Prepared" must now imply "provider-acceptable" (fail closed on UNKNOWN).
    const repoCommon = commonGitDir(git, repoRoot);
    const wtCommon = commonGitDir(git, plan.worktree);
    const sameRepo = !!repoCommon && !!wtCommon && (wtCommon === repoCommon || wtCommon.startsWith(repoCommon + sep));
    const passIdentity = wtExists && onBranch === plan.branch && onBranch !== "HEAD" && sameRepo;
    rec("worktree_identity:" + job.job_id, plan.branch + " @ " + plan.worktree, onBranch + " exists=" + wtExists + " same_repo=" + sameRepo + " common=" + wtCommon, passIdentity, { branch: plan.branch, worktree: plan.worktree, repo_common_dir: repoCommon, worktree_common_dir: wtCommon });
    if (!passIdentity) { rollback(); return { ok: false, steps, created: [], failed_step: "worktree_identity:" + job.job_id }; }
  }
  // dependency eligibility (deps must be among the created set or previously satisfied)
  const createdIds = new Set(created.map((c) => c.job_id));
  for (const job of jobs) { if (!createdIds.has(job.job_id)) continue; for (const d of job.dependencies || []) if (!createdIds.has(d)) { rec("dependency:" + job.job_id, "dep " + d + " set up", "missing", false); rollback(); return { ok: false, steps, created: [], failed_step: "dependency:" + job.job_id }; } }
  rec("ready", "all eligible jobs set up", created.length + " worktrees", true);
  return { ok: true, steps, created, teardown: () => { for (const c of created) { try { git(["worktree", "remove", c.worktree, "--force"], repoRoot); } catch { /* */ } try { git(["branch", "-D", c.branch], repoRoot); } catch { /* */ } } } };
}
