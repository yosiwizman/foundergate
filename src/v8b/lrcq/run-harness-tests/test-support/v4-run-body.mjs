// FounderGate LRCQ — TEST-SUPPORT driver for running a test body under a GENUINE SUPERVISOR_EXECUTION
// capability (FG-LRCQ-ACT-029). Structurally test-only.
//
// Because the SUPERVISOR_EXECUTION stage is mintable only inside a process that received the ephemeral key
// over the governed inherited anonymous descriptor, a test that must reach the real provider-spawn boundary
// cannot assert in-process. runV4Body() builds a disposable V4 world, consumes it, creates the launch intent
// bound to v4-execution-child.mjs, performs the ONE governed key transfer, and returns the body's result.
import { realpathSync, mkdirSync } from "node:fs";
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
    const g = await spawnGovernedSupervisorV4(c.capability, {
      args: ["--config", cfgPath], stdoutFd: "pipe", stderrFd: "pipe", detached: false,
      env: opts.env || { PATH: process.env.PATH, HOME: process.env.HOME },
    });
    if (!g.ok) throw new Error("runV4Body: governed transfer failed " + g.code + " " + (g.detail || ""));
    const res = await new Promise((resolve) => {
      let out = "", err = "";
      const t = setTimeout(() => { try { g.child.kill("SIGKILL"); } catch { /* */ } }, opts.timeoutMs || 240000);
      g.child.stdout.on("data", (d) => (out += d));
      g.child.stderr.on("data", (d) => (err += d));
      g.child.on("close", (code) => {
        clearTimeout(t);
        let parsed = null;
        const marker = out.lastIndexOf("__V4_BODY_RESULT__");
        if (marker >= 0) { try { parsed = JSON.parse(out.slice(marker + "__V4_BODY_RESULT__".length).trim().split("\n")[0]); } catch { /* */ } }
        if (!parsed) { const lines = out.trim().split("\n"); for (let i = lines.length - 1; i >= 0; i--) { try { parsed = JSON.parse(lines[i]); break; } catch { /* */ } } }
        resolve({ parsed, out, err, code });
      });
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
