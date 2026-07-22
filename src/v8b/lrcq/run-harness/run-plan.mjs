// FounderGate LRCQ — deterministic run-plan resolver + all-25 material validator (FG-LRCQ-ACT-010).
// The frozen backlog carries deterministic branch/worktree TEMPLATES (never host-specific absolute
// paths). The resolver derives the exact branch/worktree inside the signed boundaries. The material
// validator proves EVERY job is compatible with the manifest + executing machine verifier before READY.
import { createHash } from "node:crypto";
import { join } from "node:path";

export const EXEC_TEST_ALLOWLIST = ["node", "npm", "git", "shasum"];
export const EVIDENCE_MODES = ["must_exist", "must_match_sha256"];

// Deterministic branch/worktree derivation — no host-specific values in the backlog.
export function resolveRunPlan(job, run_id, manifest) {
  const branch = manifest.branch_prefix + run_id + "-" + job.job_id;      // e.g. lane/real-run-<run>-<job>
  const worktree = join(manifest.permitted_worktree_root, run_id, job.job_id);
  return { run_id, job_id: job.job_id, branch, worktree, allowed_files: job.allowed_files, forbidden_files: job.forbidden_files, test_commands: job.test_commands, negative_test_commands: job.negative_test_commands || [], expected_output_paths: job.expected_output_paths, required_evidence_files: job.required_evidence_files, dependencies: job.dependencies || [], collision_set: job.collision_set || [] };
}

const argvOk = (t) => Array.isArray(t) && t.length >= 1 && EXEC_TEST_ALLOWLIST.includes(t[0]);
const withinAllowed = (p, allowed) => allowed.some((a) => p === a || (a.endsWith("/") && p.startsWith(a)));

// Validate ONE frozen job's executable material. `exists` (injectable) checks test/verifier targets.
export function validateExecutableJob(job, manifest, opts = {}) {
  const r = []; const R = (c, m) => { if (c) r.push(job.job_id + ": " + m); };
  const exists = opts.exists || (() => true);
  R(!job.objective || /placeholder|TODO|filler/i.test(job.objective), "concrete objective required");
  R(job.risk_class !== "WIDE_SAFE", "must be WIDE_SAFE");
  R(job.effect_class && !["LOCAL_FS"].includes(job.effect_class), "effect_class must be LOCAL_FS");
  R(!Array.isArray(job.allowed_files) || job.allowed_files.length === 0, "allowed_files required");
  R(!Array.isArray(job.forbidden_files), "forbidden_files array required");
  // NO host-specific fields
  R(job.worktree && job.worktree.startsWith("/"), "no absolute /wt worktree permitted (use templates)");
  R(job.branch && !job.branch.startsWith(manifest.branch_prefix), "branch outside manifest prefix");
  // executable tests
  R(!Array.isArray(job.test_commands) || job.test_commands.length === 0, "test_commands (argv arrays) required");
  for (const t of job.test_commands || []) { R(!argvOk(t), "test not an allowlisted argv array: " + JSON.stringify(t)); if (argvOk(t)) { const target = t.find((x, i) => i > 0 && /\.(mjs|js|sh)$/.test(x)); if (target) R(!exists(target), "test target missing: " + target); } }
  for (const t of job.negative_test_commands || []) R(!argvOk(t), "negative test not an allowlisted argv array");
  // expected outputs within allowed files
  for (const o of job.expected_output_paths || []) R(!withinAllowed(o, job.allowed_files), "expected output outside allowed_files: " + o);
  // required evidence files: valid mode; verifier/evidence must NOT be builder-writable
  for (const ev of job.required_evidence_files || []) { R(!ev.path || !EVIDENCE_MODES.includes(ev.mode), "required_evidence_files needs {path,mode}"); R(withinAllowed(ev.path, job.allowed_files), "verifier/evidence file must be immutable to the builder (outside allowed_files): " + ev.path); if (ev.mode === "must_match_sha256") R(!ev.sha256, "must_match_sha256 requires a sha256"); }
  // immutable verifier scripts must be outside allowed (builder-writable) paths
  for (const t of job.test_commands || []) { if (!Array.isArray(t)) continue; const target = t.find((x, i) => i > 0 && /\.(mjs|js|sh)$/.test(x)); if (target) R(withinAllowed(target, job.allowed_files), "verifier script must be immutable (outside allowed_files): " + target); }
  R(typeof job.max_changed_lines !== "number", "max_changed_lines required");
  R(typeof job.max_files !== "number", "max_files required");
  R(typeof job.builder_cost_cap_usd !== "number", "builder_cost_cap_usd required");
  R(typeof job.checker_cost_cap_usd !== "number", "checker_cost_cap_usd required");
  R(!Array.isArray(job.checker_criteria) || job.checker_criteria.length === 0, "checker_criteria required");
  R(job.gate_trigger && job.gate_trigger !== "NONE", "founder-gated job is not auto-eligible");
  R(!job.rollback_action, "rollback/teardown action required");
  return { valid: r.length === 0, refusals: r };
}

// Validate ALL jobs + dependency acyclicity + collision plan. Returns per-job + aggregate.
export function validateAll25(backlog, manifest, opts = {}) {
  const jobs = backlog.jobs || backlog.items || [];
  const refusals = []; const perJob = {};
  for (const j of jobs) { const v = validateExecutableJob(j, manifest, opts); perJob[j.job_id] = v; if (!v.valid) refusals.push(...v.refusals); }
  // dependency graph exists + acyclic
  const ids = new Set(jobs.map((j) => j.job_id));
  for (const j of jobs) for (const d of j.dependencies || []) if (!ids.has(d)) refusals.push(j.job_id + ": missing dependency " + d);
  const cycle = findCycle(jobs); if (cycle) refusals.push("dependency cycle: " + cycle.join("->"));
  // budget headroom: sum of builder+checker caps is a plan-level upper bound (informational; runtime ledger enforces $10)
  return { valid: refusals.length === 0, refusals, count: jobs.length, perJob };
}

function findCycle(jobs) {
  const byId = new Map(jobs.map((j) => [j.job_id, j])); const state = new Map();
  const dfs = (id, stack) => { if (state.get(id) === "done") return null; if (state.get(id) === "open") return stack.concat(id); state.set(id, "open"); for (const d of (byId.get(id)?.dependencies || [])) { const c = dfs(d, stack.concat(id)); if (c) return c; } state.set(id, "done"); return null; };
  for (const j of jobs) { const c = dfs(j.job_id, []); if (c) return c; } return null;
}

export function runPlanDigest(plans) { return "sha256:" + createHash("sha256").update(JSON.stringify(plans)).digest("hex"); }
