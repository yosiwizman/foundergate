// FounderGate LRCQ — the ONE governed real Claude Code provider adapter (HARDENED).
// Disabled unless a founder activation record passes EVERY validation. Spawns the
// mechanically-discovered local Claude CLI (or, in tests, a deterministic stub at the
// activation's provider_executable_path) as a BOUNDED child process. Never bypasses
// permissions, never reads/prints credentials, never merges/pushes, never treats
// missing output as success. Mechanically verifies the git worktree identity, enforces
// BOTH per-job timeout and the overall run deadline during execution, and confirms the
// process tree is actually gone (no optimistic default). This is the only Claude route.
import { spawn, execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { validateActivation } from "./activation-schema.mjs";
import { renderPrompt } from "./identity-envelope.mjs";
import { parseTransport } from "./transport-envelope.mjs";

export const OUTCOMES = ["SUCCESS", "FAILED", "WORKER_TIMEOUT", "RUN_DEADLINE_EXPIRED", "OUTPUT_OVERFLOW", "SPAWN_ERROR", "TERMINATED_BY_PAUSE", "TERMINATED_BY_STOP", "TEARDOWN_FAILED", "ACTIVATION_REFUSED", "UNKNOWN_FAILURE"];
const PERMISSION_BYPASS = ["--dangerously-skip-permissions", "--allow-dangerously-skip-permissions"];

// ---- static path/scope containment (fail closed) -------------------------------------
export function containmentCheck(job, activation) {
  const wtRoot = activation.allowed_worktree_root;
  if (!job.worktree) return "job has no worktree";
  const wt = resolve(job.worktree);
  const root = resolve(wtRoot);
  if (wt !== root && !wt.startsWith(root + sep)) return "worktree outside approved root: " + wt;
  if (job.worktree.includes("..")) return "path traversal in worktree";
  try {
    if (existsSync(wt)) {
      const rootReal = existsSync(root) ? realpathSync(root) : root;
      const rp = realpathSync(wt);
      if (rp !== rootReal && !rp.startsWith(rootReal + sep)) return "symlink escape: " + rp;
    }
  } catch { /* non-fatal */ }
  if (activation.allowed_branch_prefix && job.branch && !job.branch.startsWith(activation.allowed_branch_prefix)) return "branch outside allowed prefix: " + job.branch;
  for (const f of job.allowed_files || []) {
    for (const bad of job.forbidden_files || []) if (f === bad || f.startsWith(bad) || (bad.endsWith("/") && f.startsWith(bad))) return "allowed_file overlaps forbidden: " + f;
    if (f.includes("..")) return "path traversal in allowed_file: " + f;
  }
  return null;
}

// ---- ACTUAL git worktree identity (FG-LRCQ-P188-007/008) ------------------------------
// Verifies (via read-only git) that the assigned path is a registered worktree of the
// approved repository, checked out on the exact assigned branch, not detached, not main.
export function gitWorktreeIdentity(job, activation, gitRunner) {
  const g = gitRunner || ((args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
  try {
    const wt = job.worktree;
    if (!existsSync(wt)) return "worktree does not exist: " + wt;
    const inside = g(["rev-parse", "--is-inside-work-tree"], wt);
    if (inside !== "true") return "not a git work tree: " + wt;
    const top = realpathSync(g(["rev-parse", "--show-toplevel"], wt));
    if (top !== realpathSync(wt)) return "worktree toplevel != assigned path: " + top;
    const commonDir = realpathSync(g(["rev-parse", "--path-format=absolute", "--git-common-dir"], wt));
    // FG-LRCQ-ACT-025: allowed_repository may ITSELF be a linked git worktree (its `.git` is a pointer
    // FILE, not the common git dir) — the actual first-real-run condition. Deriving its git dir via
    // join(allowed_repository, ".git") then resolves that pointer file and never equals the sub-worktree's
    // real common-dir, so EVERY job was refused pre-spawn. Resolve the allowed repository's AUTHORITATIVE
    // common git dir the same way (git rev-parse), so we compare common-dir to common-dir regardless of
    // whether the launch dir is a normal clone, a linked worktree, or a subdirectory of either.
    const allowedCommonDir = realpathSync(g(["rev-parse", "--path-format=absolute", "--git-common-dir"], activation.allowed_repository));
    if (commonDir !== allowedCommonDir && !commonDir.startsWith(allowedCommonDir + sep)) return "worktree belongs to a different repository: " + commonDir + " (allowed common-dir " + allowedCommonDir + ")";
    const head = g(["symbolic-ref", "--quiet", "--short", "HEAD"], wt); // empty/throws when detached
    if (!head) return "worktree is in detached HEAD";
    if (head !== job.branch) return "actual branch (" + head + ") != assigned job.branch (" + job.branch + ")";
    if (head === "main" || head === "master") return "worktree is on protected main";
    return null; // identity OK
  } catch (e) { return "git identity check could not be established: " + (e.message || String(e)); }
}

// ---- CLI argv: individual tool entries (variadic <tools...>), proven by --help/--version smoke ----
export function buildArgv(activation, job, promptText) {
  const argv = ["-p", promptText, "--output-format", "json", "--permission-mode", "manual"];
  argv.push("--allowedTools", ...activation.allowed_tools);       // individual entries, NOT one joined string
  argv.push("--disallowedTools", ...(activation.denied_tools || []));
  argv.push("--add-dir", job.worktree);
  argv.push("--max-budget-usd", String(activation.max_budget_usd)); // MANDATORY cost ceiling
  if (activation.subscription_only === true) argv.push("--bare");
  // Reject a bypass ONLY when it would be an ACTIVE control: bypass permission-mode, or a
  // bypass token in the ALLOWED tools. A bypass token in the DENY list is legitimate (it
  // denies the capability) and must not trip this guard.
  if (activation.provider_mode === "bypassPermissions") throw new Error("permission-bypass mode rejected");
  if ((activation.allowed_tools || []).some((t) => PERMISSION_BYPASS.includes(t))) throw new Error("permission-bypass token in allowed_tools rejected");
  const pmIdx = argv.indexOf("--permission-mode");
  if (pmIdx >= 0 && argv[pmIdx + 1] !== "manual") throw new Error("permission-mode must be manual");
  return argv;
}

export function scrubEnv(activation, baseEnv) {
  const env = {};
  for (const k of ["PATH", "HOME"]) if (baseEnv[k]) env[k] = baseEnv[k];
  const prohibited = new Set((activation.prohibited_env || []).concat(["ANTHROPIC_API_KEY", "AWS_SECRET_ACCESS_KEY", "GITHUB_TOKEN", "GH_TOKEN", "OPENAI_API_KEY"]));
  for (const k of prohibited) delete env[k];
  return env;
}

// ---- real process-tree liveness (FG-LRCQ-P188-006/005) --------------------------------
function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } }
export function verifyTreeGone(pgid, descendantPids) {
  const alive = [];
  try { process.kill(-pgid, 0); alive.push("group:" + pgid); } catch (e) { if (e.code === "EPERM") alive.push("group:" + pgid); }
  for (const p of descendantPids || []) if (Number.isInteger(p) && pidAlive(p)) alive.push(p);
  return { gone: alive.length === 0, alive };
}

export async function runJob(activation, job, bindings, opts = {}) {
  // FG-LRCQ-ACT-023: teardown_status is NEVER null. It starts NOT_ATTEMPTED (the provider has not yet run,
  // so there is nothing to tear down) and becomes CONFIRMED/FAILED/UNKNOWN only after the real teardown
  // check. An early return (refused/spawn-error) therefore reports NOT_ATTEMPTED — a PROVIDER outcome, never
  // a teardown defect. provider_invocation likewise tracks the real lifecycle stage.
  const evidence = { pid: null, pgid: null, outcome: null, exit_code: null, stdout_bytes: 0, stderr_bytes: 0, killed: false, kill_escalated: false, tree_gone: null, tree_alive: null, descendant_pids: [], started: false, teardown_status: "TEARDOWN_NOT_ATTEMPTED", provider_invocation: "PROVIDER_NOT_ATTEMPTED" };
  const seal = (outcome, extra) => ({ ...evidence, outcome, ...(extra || {}) });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // INTRINSIC LIVE CLOCK: the running-worker clock is the REAL system clock by default.
  // opts.nowProvider is a DETERMINISTIC-TEST injector ONLY. The frozen activation
  // validation timestamp (bindings.now_epoch) is used only for pre-spawn validation and
  // must never become the running-worker deadline clock.
  const nowS = () => (opts.nowProvider ? opts.nowProvider() : Math.floor(Date.now() / 1000));

  const av = validateActivation(activation, bindings);
  if (!av.valid) return seal("ACTIVATION_REFUSED", { refusals: av.refusals });
  if (job.risk_class !== "WIDE_SAFE") return seal("ACTIVATION_REFUSED", { refusals: ["job not WIDE_SAFE: " + job.risk_class] });
  if (job.gate_trigger && job.gate_trigger !== "NONE") return seal("ACTIVATION_REFUSED", { refusals: ["job gated: " + job.gate_trigger] });
  if (job.effect_class === "LIVE_ACTION" || job.effect_class === "NETWORK") return seal("ACTIVATION_REFUSED", { refusals: ["job live/network effect"] });
  const c = containmentCheck(job, activation);
  if (c) return seal("ACTIVATION_REFUSED", { refusals: [c] });
  // ACTUAL git identity (skippable only via an explicit test injector)
  if (!opts.skipGitIdentity) { const gi = gitWorktreeIdentity(job, activation, opts.gitRunner); if (gi) return seal("ACTIVATION_REFUSED", { refusals: [gi] }); }
  if (typeof bindings.now_epoch === "number" && bindings.now_epoch >= activation.hard_deadline_epoch) return seal("RUN_DEADLINE_EXPIRED");
  const sig0 = opts.controlSignal && opts.controlSignal();
  if (sig0 === "PAUSE") return seal("TERMINATED_BY_PAUSE");
  if (sig0 === "STOP") return seal("TERMINATED_BY_STOP");

  // FG-LRCQ-ACT-005: role-aware prompt. A checker session receives the READ-ONLY review prompt
  // (not the builder objective). Role is derived from an explicit marker on the job.
  const role = opts.role || (job._checker_session ? "checker" : "builder");
  let argv;
  try { argv = buildArgv(activation, job, rolePrompt(job, role)); } catch (e) { return seal("ACTIVATION_REFUSED", { refusals: [e.message] }); }
  const env = scrubEnv(activation, opts.env || {});
  const evDir = join(activation.allowed_evidence_root, job.job_id);
  try { mkdirSync(evDir, { recursive: true }); } catch { /* */ }

  let child;
  // FG-LRCQ-ACT-022: spawn the IMMUTABLE resolved versioned target (never the mutable alias).
  const execTarget = activation.provider_resolved_target || activation.provider_executable_path;
  evidence.provider_invocation = "PROVIDER_SPAWN_ATTEMPTED";
  try { child = spawn(execTarget, argv, { cwd: job.worktree, env, detached: true, stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { return seal("SPAWN_ERROR", { error: e.message }); }
  if (!child.pid) return seal("SPAWN_ERROR", { error: "no pid" });
  evidence.started = true; evidence.pid = child.pid; evidence.pgid = child.pid; evidence.provider_invocation = "PROVIDER_SPAWNED";
  writeFileSync(join(evDir, "process.json"), JSON.stringify({ pid: child.pid, pgid: child.pid, argv_redacted: redactArgv(argv), started_epoch: nowS() }, null, 2) + "\n");

  const maxBytes = activation.max_output_bytes;
  let out = "", err = "", overflow = false;
  child.stdout.on("data", (d) => { evidence.stdout_bytes += d.length; if (evidence.stdout_bytes > maxBytes) overflow = true; else out += d; });
  child.stderr.on("data", (d) => { evidence.stderr_bytes += d.length; if (evidence.stderr_bytes <= maxBytes) err += d; });
  const killTree = (sig) => { try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* */ } } };
  const isAlive = () => { try { process.kill(child.pid, 0); return true; } catch { return false; } };

  const result = await new Promise((resolveP) => {
    let done = false, killing = false, to = null, poll = null, ovf = null, dl = null;
    const graceMs = (activation.termination_grace_s || 0) * 1000;
    const clearAll = () => { for (const t of [to, poll, ovf, dl]) { if (t) { clearTimeout(t); clearInterval(t); } } };
    const finish = (o, extra) => { if (done) return; done = true; clearAll(); resolveP({ o, extra }); };
    const escalate = async (o) => { if (done || killing) return; killing = true; clearAll(); evidence.killed = true; killTree("SIGTERM"); await sleep(graceMs); if (isAlive()) { evidence.kill_escalated = true; killTree("SIGKILL"); await sleep(80); } finish(o); };
    const timeoutMs = (activation.per_job_timeout_s || 0) * 1000;
    if (timeoutMs > 0) to = setTimeout(() => escalate("WORKER_TIMEOUT"), timeoutMs);
    // overall run-deadline monitor DURING execution — earlier limit wins.
    dl = setInterval(() => { if (nowS() >= activation.hard_deadline_epoch) escalate("RUN_DEADLINE_EXPIRED"); }, opts.pollMs || 40);
    if (opts.controlSignal) poll = setInterval(() => { const s = opts.controlSignal(); if (s === "PAUSE" || s === "STOP") escalate(s === "PAUSE" ? "TERMINATED_BY_PAUSE" : "TERMINATED_BY_STOP"); }, opts.pollMs || 40);
    ovf = setInterval(() => { if (overflow) escalate("OUTPUT_OVERFLOW"); }, 20);
    child.on("error", (e) => finish("SPAWN_ERROR", { error: e.message }));
    child.on("close", (code) => { evidence.exit_code = code; if (killing) return; finish(code === 0 ? "SUCCESS" : "FAILED"); });
  });

  writeFileSync(join(evDir, "stdout.txt"), out.slice(0, maxBytes));
  writeFileSync(join(evDir, "stderr.txt"), err.slice(0, maxBytes));

  // real process-tree verification (retry briefly for the OS to reap after SIGKILL)
  let descendants = [];
  try { const gp = join(job.worktree, "grandchild.pid"); if (existsSync(gp)) descendants = readFileSync(gp, "utf8").trim().split(/\s+/).map((x) => parseInt(x, 10)).filter((x) => Number.isInteger(x)); } catch { /* */ }
  evidence.descendant_pids = descendants;
  let tv = { gone: false, alive: ["unchecked"] };
  for (let i = 0; i < 6; i++) { tv = verifyTreeGone(child.pid, descendants); if (tv.gone) break; await sleep(40); }
  evidence.tree_gone = tv.gone; evidence.tree_alive = tv.alive;
  // teardown_status is an explicit enum — never null: CONFIRMED requires the tree confirmed gone; an
  // "unchecked" verification is UNKNOWN (fails closed); otherwise FAILED. Provider output was received.
  evidence.teardown_status = tv.gone ? "TEARDOWN_CONFIRMED" : (Array.isArray(tv.alive) && tv.alive.includes("unchecked") ? "TEARDOWN_UNKNOWN" : "TEARDOWN_FAILED");
  evidence.provider_invocation = "PROVIDER_OUTPUT_RECEIVED";
  writeFileSync(join(evDir, "teardown.json"), JSON.stringify({ pgid: child.pid, descendant_pids: descendants, tree_gone: tv.gone, alive: tv.alive, teardown_status: evidence.teardown_status }, null, 2) + "\n");

  // a termination event that did NOT clean up the tree is NEVER success
  if (evidence.killed && !tv.gone) return seal("TEARDOWN_FAILED", { note: "process tree not confirmed gone after termination", alive: tv.alive });

  let parsed = null, providerCostUsd = null, transportDigest = null;
  if (result.o === "SUCCESS") {
    if (!tv.gone) return seal("TEARDOWN_FAILED", { note: "exit 0 but tree not confirmed gone" });
    if (!out || out.trim() === "") return seal("UNKNOWN_FAILURE", { note: "exit 0 but no output — not treated as success" });
    // FG-LRCQ-ACT-009 protocol: when opts.transport is set, the worker wraps its payload in the
    // documented CLI transport envelope; parse it strictly (separating transport + payload + cost).
    if (opts.transport) { const tp = parseTransport(out); if (!tp.ok) return seal("FAILED", { note: "transport: " + tp.reason }); parsed = tp.payload; providerCostUsd = tp.cost_usd; transportDigest = tp.transport_digest; }
    else { try { parsed = JSON.parse(out); } catch { return seal("FAILED", { note: "unparseable output on exit 0" }); } }
  }
  // FG-LRCQ-ACT-005/009: return the PARSED role output + provider cost + transport evidence.
  return seal(result.o, { ...(result.extra || {}), parsed_ok: !!parsed, parsed_output: parsed || null, role, provider_cost_usd: providerCostUsd, transport_digest: transportDigest });
}

// Builder prompt: bounded to the job objective + allowed files/tools; no authority to merge/push.
export function builderPrompt(job) {
  return [
    "FounderGate LRCQ BUILDER — job " + job.job_id + " (attempt " + (job.__attempt || 1) + ") — WIDE-SAFE only.",
    "Objective: " + job.objective, "Done means: " + job.done_meaning,
    "Allowed files (ONLY these): " + (job.allowed_files || []).join(", "),
    "Forbidden files: " + (job.forbidden_files || []).join(", "),
    "Required tests: " + JSON.stringify(job.tests || []), "Required evidence: " + JSON.stringify(job.required_evidence || []),
    "Branch " + job.branch + " / worktree " + job.worktree,
    "You may not merge, push, touch protected main, act outside this worktree, or modify any gate/authority.",
    "Emit a single JSON object per the lrcq-builder-output-1 schema on stdout.",
  ].join("\n");
}
// Checker prompt: READ-ONLY review; explicitly requires a structured verdict; never asks the
// checker to implement the objective; forbids edits/writes/push/merge/acceptance inference.
export function checkerPrompt(job) {
  return [
    "FounderGate LRCQ INDEPENDENT CHECKER — job " + job.job_id + " (attempt " + (job.__attempt || 1) + ") — READ-ONLY.",
    "Review candidate/job/attempt identity, the builder transaction, and the machine-verifier report digest.",
    "Inspect ONLY: the actual diff, the executed-test evidence, and the required output/evidence artifacts.",
    "You have ONLY Read and Grep. You may NOT edit, write, push, merge, or infer acceptance.",
    "Do NOT implement the objective. Give a per-criterion PASS/FAIL and ONE final verdict: CLEAN | FINDINGS | INSUFFICIENT_EVIDENCE.",
    "Emit a single JSON object per the lrcq-checker-output-1 schema on stdout.",
  ].join("\n");
}
// FG-LRCQ-ACT-009: when a canonical identity envelope is attached, render the FULL identity +
// non-recursive prompt-contract digest DIRECTLY into the prompt (no identity.json side channel).
export function rolePrompt(job, role) {
  const instructions = role === "checker" ? checkerPrompt(job) : builderPrompt(job);
  if (job._identity_envelope) return renderPrompt(job._identity_envelope, instructions);
  return instructions;
}
function redactArgv(argv) { return argv.map((a) => (a.length > 200 ? a.slice(0, 200) + "…" : a)); }
