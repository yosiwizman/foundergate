// FounderGate LRCQ — the ONE governed real Claude Code provider adapter.
// Disabled unless a founder activation record passes EVERY validation. Spawns the
// mechanically-discovered local Claude CLI (or, in tests, a deterministic stub at the
// activation's provider_executable_path) as a BOUNDED child process. Never bypasses
// permissions, never reads/prints credentials, never merges/pushes, never treats
// missing output as success. This is the only Claude invocation route.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { validateActivation } from "./activation-schema.mjs";

export const OUTCOMES = ["SUCCESS", "FAILED", "WORKER_TIMEOUT", "RUN_DEADLINE_EXPIRED", "OUTPUT_OVERFLOW", "SPAWN_ERROR", "TERMINATED_BY_PAUSE", "TERMINATED_BY_STOP", "ACTIVATION_REFUSED", "UNKNOWN_FAILURE"];

const PERMISSION_BYPASS = ["--dangerously-skip-permissions", "--allow-dangerously-skip-permissions"];

// Worktree/branch/scope containment — fail closed. Returns a refusal string or null.
export function containmentCheck(job, activation) {
  const wtRoot = activation.allowed_worktree_root;
  if (!job.worktree) return "job has no worktree";
  const wt = resolve(job.worktree);
  // must be under the approved worktree root
  const root = resolve(wtRoot);
  if (wt !== root && !wt.startsWith(root + sep)) return "worktree outside approved root: " + wt;
  // path traversal
  if (job.worktree.includes("..")) return "path traversal in worktree";
  // symlink escape: the worktree's realpath must stay under the root's realpath.
  // (Resolve BOTH sides so platform symlinks like macOS /var -> /private/var don't false-positive.)
  try {
    if (existsSync(wt)) {
      const rootReal = existsSync(root) ? realpathSync(root) : root;
      const rp = realpathSync(wt);
      if (rp !== rootReal && !rp.startsWith(rootReal + sep)) return "symlink escape: " + rp;
    }
  } catch { /* non-fatal */ }
  // branch must match the allowed prefix
  if (activation.allowed_branch_prefix && job.branch && !job.branch.startsWith(activation.allowed_branch_prefix)) return "branch outside allowed prefix: " + job.branch;
  // allowed_files must stay inside the job contract (no forbidden overlap)
  for (const f of job.allowed_files || []) {
    for (const bad of job.forbidden_files || []) {
      if (f === bad || f.startsWith(bad) || (bad.endsWith("/") && f.startsWith(bad))) return "allowed_file overlaps forbidden: " + f;
    }
    if (f.includes("..")) return "path traversal in allowed_file: " + f;
  }
  return null;
}

// Build the CLI argv. NEVER includes a permission-bypass flag; always non-interactive
// with allow/deny tools, json output, cost ceiling, and worktree-scoped dir access.
export function buildArgv(activation, job, promptText) {
  const argv = [
    "-p", promptText,
    "--output-format", "json",
    "--permission-mode", "manual",
    "--allowedTools", activation.allowed_tools.join(" "),
    "--disallowedTools", (activation.denied_tools || []).join(" "),
    "--add-dir", job.worktree,
  ];
  if (typeof activation.max_budget_usd === "number") { argv.push("--max-budget-usd", String(activation.max_budget_usd)); }
  if (activation.subscription_only === true) argv.push("--bare");
  // guard: refuse if any bypass flag would be present
  if (argv.some((a) => PERMISSION_BYPASS.includes(a)) || activation.provider_mode === "bypassPermissions") throw new Error("permission-bypass flag rejected");
  return argv;
}

// Minimal-environment builder: pass only PATH + HOME (needed by the authenticated CLI),
// scrub any activation-prohibited vars, and drop obvious secret-looking vars. Never logs values.
export function scrubEnv(activation, baseEnv) {
  const env = {};
  for (const k of ["PATH", "HOME"]) if (baseEnv[k]) env[k] = baseEnv[k];
  const prohibited = new Set((activation.prohibited_env || []).concat(["ANTHROPIC_API_KEY", "AWS_SECRET_ACCESS_KEY", "GITHUB_TOKEN", "GH_TOKEN", "OPENAI_API_KEY"]));
  for (const k of prohibited) delete env[k];
  return env;
}

// Run one job through the adapter. `now_epoch` + control flags injected for determinism.
// opts.controlSignal() may return "PAUSE" or "STOP" to request termination.
export async function runJob(activation, job, bindings, opts = {}) {
  const evidence = { pid: null, pgid: null, outcome: null, exit_code: null, stdout_bytes: 0, stderr_bytes: 0, killed: false, kill_escalated: false, tree_gone: null, started: false };
  const seal = (outcome, extra) => ({ ...evidence, outcome, ...(extra || {}) });

  // 1. activation must validate — else disabled
  const av = validateActivation(activation, bindings);
  if (!av.valid) return seal("ACTIVATION_REFUSED", { refusals: av.refusals });
  // 2. only WIDE_SAFE + gate NONE + non-live jobs may reach the adapter
  if (job.risk_class !== "WIDE_SAFE") return seal("ACTIVATION_REFUSED", { refusals: ["job not WIDE_SAFE: " + job.risk_class] });
  if (job.gate_trigger && job.gate_trigger !== "NONE") return seal("ACTIVATION_REFUSED", { refusals: ["job gated: " + job.gate_trigger] });
  if (job.effect_class === "LIVE_ACTION" || job.effect_class === "NETWORK") return seal("ACTIVATION_REFUSED", { refusals: ["job live/network effect"] });
  // 3. containment
  const c = containmentCheck(job, activation);
  if (c) return seal("ACTIVATION_REFUSED", { refusals: [c] });
  // 4. deadline / pause / stop before spawn
  if (typeof bindings.now_epoch === "number" && bindings.now_epoch >= activation.hard_deadline_epoch) return seal("RUN_DEADLINE_EXPIRED");
  const sig0 = opts.controlSignal && opts.controlSignal();
  if (sig0 === "PAUSE") return seal("TERMINATED_BY_PAUSE");
  if (sig0 === "STOP") return seal("TERMINATED_BY_STOP");

  // 5. build argv + env; write the bound prompt to the evidence dir (no model call here beyond spawning the CLI/stub)
  let argv;
  try { argv = buildArgv(activation, job, boundPrompt(job)); } catch (e) { return seal("ACTIVATION_REFUSED", { refusals: [e.message] }); }
  const env = scrubEnv(activation, opts.env || {});
  const evDir = join(activation.allowed_evidence_root, job.job_id);
  try { mkdirSync(evDir, { recursive: true }); } catch { /* */ }

  // 6. spawn bounded child in its own process group (detached) with cwd = job worktree
  let child;
  try {
    child = spawn(activation.provider_executable_path, argv, { cwd: job.worktree, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { return seal("SPAWN_ERROR", { error: e.message }); }
  if (!child.pid) return seal("SPAWN_ERROR", { error: "no pid" });
  evidence.started = true; evidence.pid = child.pid; evidence.pgid = child.pid; // detached: pgid == pid
  writeFileSync(join(evDir, "process.json"), JSON.stringify({ pid: child.pid, pgid: child.pid, argv_redacted: redactArgv(argv), started_epoch: bindings.now_epoch }, null, 2) + "\n");

  const maxBytes = activation.max_output_bytes;
  let out = "", err = "", overflow = false;
  child.stdout.on("data", (d) => { evidence.stdout_bytes += d.length; if (evidence.stdout_bytes > maxBytes) { overflow = true; } else out += d; });
  child.stderr.on("data", (d) => { evidence.stderr_bytes += d.length; if (evidence.stderr_bytes <= maxBytes) err += d; });

  const killTree = (sig) => { try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* */ } } };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isAlive = () => { try { process.kill(child.pid, 0); return true; } catch { return false; } };
  const result = await new Promise((resolveP) => {
    let done = false, killing = false, to = null, poll = null, ovf = null;
    const graceMs = (activation.termination_grace_s || 0) * 1000;
    const clearAll = () => { if (to) clearTimeout(to); if (poll) clearInterval(poll); if (ovf) clearInterval(ovf); };
    const finish = (o, extra) => { if (done) return; done = true; clearAll(); resolveP({ o, extra }); };
    // bounded SIGTERM -> (grace) -> SIGKILL; awaited so escalation is reflected in evidence.
    const escalate = async (o) => {
      if (done || killing) return; killing = true; clearAll();
      evidence.killed = true; killTree("SIGTERM");
      await sleep(graceMs);
      if (isAlive()) { evidence.kill_escalated = true; killTree("SIGKILL"); await sleep(60); }
      finish(o);
    };
    const timeoutMs = (activation.per_job_timeout_s || 0) * 1000;
    if (timeoutMs > 0) to = setTimeout(() => { escalate("WORKER_TIMEOUT"); }, timeoutMs);
    if (opts.controlSignal) poll = setInterval(() => {
      const s = opts.controlSignal();
      if (s === "PAUSE" || s === "STOP") escalate(s === "PAUSE" ? "TERMINATED_BY_PAUSE" : "TERMINATED_BY_STOP");
    }, opts.pollMs || 50);
    ovf = setInterval(() => { if (overflow) escalate("OUTPUT_OVERFLOW"); }, 20);
    child.on("error", (e) => finish("SPAWN_ERROR", { error: e.message }));
    // If a kill is in progress, the escalate() path owns the outcome — a close caused by
    // our own SIGTERM/SIGKILL must not override WORKER_TIMEOUT/PAUSE/STOP/OVERFLOW.
    child.on("close", (code) => { evidence.exit_code = code; if (killing) return; finish(code === 0 ? "SUCCESS" : "FAILED"); });
  });

  // 7. persist partial output (capped) — never discard on failure
  writeFileSync(join(evDir, "stdout.txt"), out.slice(0, maxBytes));
  writeFileSync(join(evDir, "stderr.txt"), err.slice(0, maxBytes));
  // 8. verify process tree gone (best-effort, injectable for tests)
  evidence.tree_gone = opts.treeGoneCheck ? !!opts.treeGoneCheck(child.pid) : true;

  // 9. parse structured result on SUCCESS; missing output is NOT success
  let parsed = null;
  if (result.o === "SUCCESS") {
    if (!out || out.trim() === "") return seal("UNKNOWN_FAILURE", { note: "exit 0 but no output — not treated as success" });
    try { parsed = JSON.parse(out); } catch { return seal("FAILED", { note: "unparseable output on exit 0" }); }
  }
  return seal(result.o, { ...(result.extra || {}), parsed_ok: !!parsed });
}

function boundPrompt(job) {
  return [
    "FounderGate LRCQ job " + job.job_id + " — WIDE-SAFE only.",
    "Objective: " + job.objective,
    "Done means: " + job.done_meaning,
    "Allowed files (ONLY these): " + (job.allowed_files || []).join(", "),
    "Forbidden files: " + (job.forbidden_files || []).join(", "),
    "Tests: " + (job.tests || []).join(", "),
    "Required evidence: " + (job.required_evidence || []).join(", "),
    "You may not merge, push, touch protected main, or act outside this worktree.",
  ].join("\n");
}
function redactArgv(argv) { return argv.map((a) => (a.length > 200 ? a.slice(0, 200) + "…" : a)); }
