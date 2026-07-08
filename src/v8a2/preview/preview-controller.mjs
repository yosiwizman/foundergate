// FounderGate V8-A2 — Preview Bay process controller (SEMI-SENSITIVE).
//
// Starts/stops/restarts a LOCAL preview of an attached project's app. Hard safety
// rules (all mechanically checked by the selftest + the no-live-path proof):
//   1. ALLOWLIST ONLY. The only preview target is the repo-local safe static
//      server. It NEVER runs an arbitrary command from project config.
//   2. NO LIVE PATH. Refuses to start if the preview declares a live environment,
//      any send that is not "off", or live payments. Preview control is not live
//      action; no provider/send/payment path exists here.
//   3. LOOPBACK ONLY. The preview binds 127.0.0.1 (see preview-server.mjs).
//   4. TRACKED. A running preview is registered in the project's run_state.json
//      (mode:running, tracked_processes) so the dashboard Pause control honestly
//      includes it. Stopping clears it.
//   5. FAIL-CLOSED. Any violation throws; a start failure returns a plain-English
//      C7 error object, never a fabricated success.

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, isAbsolute, normalize, sep } from "node:path";
import { validate } from "../../v8a1/validate.mjs";
import { validate as validatePreview } from "./validate-preview.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PREVIEW_SERVER = join(HERE, "preview-server.mjs");

// The ONLY preview target the controller knows how to start.
export const ALLOWED_TARGETS = Object.freeze(["static-preview"]);

export class PreviewError extends Error {
  constructor(message) { super(message); this.name = "PreviewError"; }
}

function fgPath(projectRoot, name) {
  return join(projectRoot, ".foundergate", name);
}

function readPreviewConfig(projectRoot) {
  const p = fgPath(projectRoot, "preview.json");
  if (!existsSync(p)) throw new PreviewError("no .foundergate/preview.json — cannot preview");
  const cfg = JSON.parse(readFileSync(p, "utf8"));
  const { valid, errors } = validatePreview(cfg);
  if (!valid) throw new PreviewError(`invalid preview.json: ${errors.join("; ")}`);
  return cfg;
}

// The no-live guard: refuse any preview that is (or could be) a live crossing.
function assertNotLive(cfg) {
  if (cfg.environment === "live") throw new PreviewError("refusing to preview a LIVE environment (V8-A2 preview is not live action)");
  if (cfg.sends && cfg.sends !== "off") throw new PreviewError(`refusing to preview with sends=${cfg.sends} (V8-A2 requires sends off)`);
  if (cfg.payments === "live") throw new PreviewError("refusing to preview with live payments");
}

// Validate app_dir is a safe project-relative directory (no traversal/absolute).
function resolveAppDir(projectRoot, appDir) {
  if (isAbsolute(appDir)) throw new PreviewError("app_dir must be project-relative");
  const abs = normalize(join(projectRoot, appDir));
  if (!abs.startsWith(resolve(projectRoot) + sep)) throw new PreviewError("app_dir escapes the project");
  if (!existsSync(abs)) throw new PreviewError(`app_dir not found: ${appDir}`);
  return abs;
}

// Always-on preview labels (honest; never claims live).
export function previewLabels(cfg) {
  return {
    environment: cfg.environment || "unknown",
    data: cfg.data || "unknown",
    sends: cfg.sends || "unknown",
    payments: cfg.payments || "unknown",
    build: cfg.build || "unknown",
    release_label: cfg.release_label || "unknown",
    data_classification: cfg.data_classification || "unknown",
    proof_recording: "off",
  };
}

function writeRunState(projectRoot, { mode, tracked }) {
  const dir = join(projectRoot, ".foundergate");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const p = fgPath(projectRoot, "run_state.json");
  // Build a CLEAN, minimal run_state (harness-managed); never merge unknown fields.
  const out = { schema_version: "1.0.0", mode, autonomous: false, tracked_processes: tracked };
  const { valid, errors } = validate(out, "run_state");
  if (!valid) throw new PreviewError(`refusing to write invalid run_state: ${errors.join("; ")}`);
  writeFileSync(p, JSON.stringify(out, null, 2) + "\n", "utf8");
}

// In-memory handle of the running preview for this controller instance.
export class PreviewController {
  constructor(projectRoot) {
    this.projectRoot = resolve(projectRoot);
    this.child = null;
    this.port = null;
    this.refreshedAt = null;
    this.starting = false;
  }

  // Start the safe static preview. Returns { status, port, url, labels }.
  async start() {
    const cfg = readPreviewConfig(this.projectRoot);
    if (!ALLOWED_TARGETS.includes(cfg.target)) {
      throw new PreviewError(`preview target "${cfg.target}" is not allowlisted (only: ${ALLOWED_TARGETS.join(", ")})`);
    }
    assertNotLive(cfg);
    const appDir = resolveAppDir(this.projectRoot, cfg.app_dir);
    if (this.child) return this.status(cfg); // idempotent
    if (this.starting) throw new PreviewError("preview is already starting");
    this.starting = true;

    try {
      return await new Promise((res, rej) => {
        // FIXED command — node running our own server. Never a config-supplied command.
        const child = spawn(process.execPath, [PREVIEW_SERVER, "--dir", appDir, "--port", "0"], {
          stdio: ["ignore", "pipe", "pipe"],
        });
        let settled = false;
        // On any failure BEFORE ready, kill the child so it never leaks (finding #5).
        const onFail = (why) => {
          if (settled) return;
          settled = true;
          try { child.kill("SIGTERM"); } catch { /* already gone */ }
          rej(new PreviewError(why));
        };
        const timer = setTimeout(() => onFail("preview did not become ready in time"), 5000);
        timer.unref?.();
        child.on("error", (e) => onFail(`preview failed to start: ${e.message}`));
        // If the preview exits on its own (crash or external kill), stop reporting
        // "running" and clear the tracked state (finding #6 — no stale live-looking state).
        child.on("exit", () => {
          if (this.child === child) {
            this.child = null;
            this.port = null;
            try { writeRunState(this.projectRoot, { mode: "idle", tracked: [] }); } catch { /* project gone */ }
          }
        });
        child.stderr.on("data", () => {});
        child.stdout.on("data", (buf) => {
          const m = /PREVIEW-READY (\d+)/.exec(String(buf));
          if (m && !settled) {
            clearTimeout(timer);
            this.child = child;
            this.port = Number(m[1]);
            this.refreshedAt = "started";
            try {
              writeRunState(this.projectRoot, {
                mode: "running",
                tracked: [`preview server (pid ${child.pid}, http://127.0.0.1:${this.port})`],
              });
            } catch (e) {
              // defensive (checker round-2 note): never let a run_state write crash
              // the control server; treat it as a start failure and reap the child.
              this.child = null; this.port = null;
              onFail(`could not record preview state: ${e.message}`);
              return;
            }
            settled = true;
            res(this.status(cfg));
          }
        });
      });
    } finally {
      this.starting = false;
    }
  }

  // Stop the preview and clear tracked state. Idempotent.
  stop() {
    if (this.child) {
      try { this.child.kill("SIGTERM"); } catch { /* already gone */ }
      this.child = null;
      this.port = null;
    }
    writeRunState(this.projectRoot, { mode: "idle", tracked: [] });
    return { status: "stopped" };
  }

  async restart() {
    this.stop();
    return await this.start();
  }

  // Refresh = the UI reloads the sandboxed iframe; server keeps running.
  refresh() {
    this.refreshedAt = "refreshed";
    return { status: this.child ? "running" : "stopped", refreshed: true };
  }

  // Clear cache = the UI clears the iframe; the server holds no per-session cache.
  clearCache() {
    return { status: this.child ? "running" : "stopped", note: "The preview server holds no cache; the embedded view was cleared." };
  }

  status(cfg) {
    const config = cfg || (existsSync(fgPath(this.projectRoot, "preview.json")) ? readPreviewConfig(this.projectRoot) : null);
    return {
      status: this.child ? "running" : "stopped",
      port: this.port,
      url: this.port ? `http://127.0.0.1:${this.port}/` : null,
      labels: config ? previewLabels(config) : null,
    };
  }

  // C7 preview-failure support: turn any start error into a plain-English object.
  static describeFailure(err) {
    return {
      failed: true,
      what: err instanceof PreviewError ? err.message : `preview error: ${err && err.message}`,
      next_action: "Check .foundergate/preview.json (target must be allowlisted, environment not live, sends off) and try again. The CTO can inspect the preview config.",
      // never a blank screen, never a fabricated success
      fabricated_success: false,
    };
  }
}
