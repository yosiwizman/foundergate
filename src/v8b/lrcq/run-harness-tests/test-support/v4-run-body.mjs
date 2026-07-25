// FounderGate LRCQ — TEST-SUPPORT driver for running a test body under a GENUINE SUPERVISOR_EXECUTION
// capability (FG-LRCQ-ACT-029). Structurally test-only.
//
// Because the SUPERVISOR_EXECUTION stage is mintable only inside a process that received the ephemeral key
// over the governed inherited anonymous descriptor, a test that must reach the real provider-spawn boundary
// cannot assert in-process. runV4Body() builds a disposable V4 world, consumes it, creates the launch intent
// bound to v4-execution-child.mjs, performs the ONE governed key transfer, and returns the body's result.
import { realpathSync, mkdirSync, openSync, closeSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeDisposableV4World } from "./v4-fixture.mjs";
import { consumeActivationV4, createLaunchIntentV4, spawnGovernedSupervisorV4 } from "../../assurance/lifecycle-authority-v4.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const EXECUTION_CHILD = realpathSync(join(HERE, "v4-execution-child.mjs"));

// opts: { world (existing world) | worldOpts, bodyModule, bodyArgs, env, timeoutMs }
export async function runV4Body(opts = {}) {
  const w = opts.world || makeDisposableV4World(opts.worldOpts || {});
  const owned = !opts.world;
  try {
    const c = consumeActivationV4(w.verified, { now: w.now });
    if (!c.ok) throw new Error("runV4Body: consume failed " + c.code);
    const li = createLaunchIntentV4(c.capability, { now: w.now, supervisorEntrypoint: EXECUTION_CHILD });
    if (!li.ok) throw new Error("runV4Body: intent failed " + li.code);
    // Bodies always receive the disposable world's roots so they can scaffold their own git repos,
    // worktrees and evidence trees inside it (auto-removed with the world).
    const cfgPath = w.writeChildConfig(opts.configName || "execution-config.json", {
      bodyModule: realpathSync(opts.bodyModule),
      bodyArgs: { base: w.repoRoot, worldBase: w.base, lifecycleRoot: w.lifecycleRoot, ...(opts.bodyArgs || {}) },
    });
    // FG-FFIN-197-F1: the governed transfer now returns only AFTER the supervisor's VERIFIED claim exists, so
    // the child may ALREADY have finished by the time we get the result — and node emits 'close' and DESTROYS
    // the stdio pipes at exit, so listeners attached afterwards receive nothing and a 'close' wait would hang
    // forever. (The old 240s timeout only KILLED the child; it never resolved the promise, so this hung
    // rather than failing.) The supervisor therefore writes to FILE descriptors we open here — the governed
    // transfer's supported stdoutFd/stderrFd — and we read those files once it is done.
    const outPath = join(w.repoRoot, (opts.configName || "v4-body") + ".out");
    const errPath = join(w.repoRoot, (opts.configName || "v4-body") + ".err");
    const outFd = openSync(outPath, "a", 0o600), errFd = openSync(errPath, "a", 0o600);
    let g;
    try {
      g = await spawnGovernedSupervisorV4(c.capability, {
        args: ["--config", cfgPath], stdoutFd: outFd, stderrFd: errFd, detached: false,
        env: opts.env || { PATH: process.env.PATH, HOME: process.env.HOME },
      });
    } finally { /* the fds are closed below, after the child is done writing through them */ }
    if (!g.ok) {
      try { closeSync(outFd); closeSync(errFd); } catch { /* */ }
      throw new Error("runV4Body: governed transfer failed " + g.code + " " + (g.detail || "") + " :: " + readFileSync(errPath, "utf8").slice(-400));
    }
    const res = await new Promise((resolve) => {
      const finish = () => {
        try { closeSync(outFd); closeSync(errFd); } catch { /* */ }
        const rd = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
        const out = rd(outPath), err = rd(errPath);
        let parsed = null;
        const marker = out.lastIndexOf("__V4_BODY_RESULT__");
        if (marker >= 0) { try { parsed = JSON.parse(out.slice(marker + "__V4_BODY_RESULT__".length).trim().split("\n")[0]); } catch { /* */ } }
        if (!parsed) { const lines = out.trim().split("\n"); for (let i = lines.length - 1; i >= 0; i--) { try { parsed = JSON.parse(lines[i]); break; } catch { /* */ } } }
        resolve({ parsed, out, err, code: g.child.exitCode });
      };
      if (g.child.exitCode !== null || g.child.signalCode !== null) return finish();
      const t = setTimeout(() => { try { g.child.kill("SIGKILL"); } catch { /* */ } finish(); }, opts.timeoutMs || 240000);
      g.child.on("close", () => { clearTimeout(t); finish(); });
    });
    return { ...res, world: w, capabilityWorld: w };
  } finally { if (owned && !opts.keepWorld) w.cleanup(); }
}

// Report a body's checks through a parent-side `ok(name, cond)` reporter.
export function reportChecks(res, ok, prefix = "") {
  if (!res.parsed || res.parsed.ok !== true) {
    ok(prefix + "child body executed under a genuine SUPERVISOR_EXECUTION capability", false);
    if (res.err) console.log("   child stderr: " + res.err.trim().split("\n").slice(-6).join("\n   "));
    if (res.parsed) console.log("   child said: " + JSON.stringify(res.parsed).slice(0, 800));
    else if (res.out) console.log("   child stdout tail: " + res.out.trim().split("\n").slice(-4).join("\n   "));
    return false;
  }
  for (const c of res.parsed.checks || []) ok(prefix + c.name + (c.ok ? "" : (c.detail ? " [" + String(c.detail).slice(0, 200) + "]" : "")), c.ok === true);
  return true;
}

// Make a disposable evidence/worktree scaffold inside a world (used by execution bodies).
export function scaffold(root, ...parts) { const p = join(root, ...parts); mkdirSync(p, { recursive: true }); return p; }
