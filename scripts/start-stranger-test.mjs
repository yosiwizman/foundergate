// FounderGate — Stranger Test launcher (one command starts every founder-facing app).
//
// Starts all four V8-A servers on loopback and prints the URLs the stranger will use.
// Read-only against a THROWAWAY copy of the MOCK_ONLY fixture; no live/provider/send/
// payment path. Press Ctrl-C to stop them all.
//
//   node scripts/start-stranger-test.mjs
//   npm run stranger-test        (same thing)

import { spawn } from "node:child_process";
import { createServer, get as httpGet } from "node:http";
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

// ---- MECHANICAL "no parked defect on the critical path" gate --------------
// Anti-repeat for the Run-6 abort: a defect (L0 — café Send below the embed
// frame) was PARKED on step 2 of the stranger script, yet the session was
// allowed to start. This gate parses the parked-notes register against the
// critical-path manifest and REFUSES to start a session on any match. Pure
// data — no human memory involved. (Exported + proven by
// src/tools/critical-path-gate.selftest.mjs.)
export const MANIFEST_PATH = join(REPO, "docs", "lanes", "critical-path-manifest.json");
export const PARKED_NOTES_PATH = join(REPO, "docs", "assembly-evidence", "visual-review", "parked-notes.json");

export function loadJson(path) { return JSON.parse(readFileSync(path, "utf8")); }

// Return every parked note that lands on a CRITICAL step and is not waived.
// A non-empty result MUST refuse a stranger session.
export function criticalPathBlockers(manifest, parked) {
  const criticalKeys = new Set((manifest.steps || []).filter((s) => s.critical).map((s) => s.stepKey));
  return (parked.notes || []).filter((n) => n.waived !== true && criticalKeys.has(n.stepKey));
}

// The four founder-facing apps, in the order the stranger visits them. `expect` is
// a marker that MUST appear in that app's own "/" page — the health check uses it to
// prove each port serves its OWN app (not just any 200). Distinct per app.
export const APPS = [
  { name: "Truth Dashboard", entry: "src/v8a1/dashboard/server.mjs", port: 4173, env: { FG_PORT: "4173" }, expect: "Truth Dashboard" },
  { name: "Preview Bay + Bug Collector", entry: "src/v8a2/server.mjs", port: 4300, env: { FG_A2_PORT: "4300" }, expect: "Preview Bay" },
  { name: "File Cabinet", entry: "src/v8a3/filecabinet/server.mjs", port: 4400, env: { FG_A3_PORT: "4400" }, expect: "File Cabinet" },
  { name: "Project Guide", entry: "src/v8a4/guide/server.mjs", port: 4500, env: { FG_A4_PORT: "4500" }, expect: "Project Guide" },
];

function portFree(port) {
  return new Promise((res) => {
    const probe = createServer();
    probe.once("error", () => res(false));
    probe.once("listening", () => probe.close(() => res(true)));
    probe.listen(port, "127.0.0.1");
  });
}

// Fetch a port's "/" and check it serves its OWN app (marker present). This is the
// anti-repeat guard for the Run-4 "two ports showed the same page" session defect:
// a crashed server whose port was taken by another app would be CAUGHT here, not
// silently reported ready.
function servesOwnApp(app) {
  return new Promise((res) => {
    const req = httpGet({ hostname: "127.0.0.1", port: app.port, path: "/", timeout: 3000 }, (r) => {
      let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => res({ ok: b.includes(app.expect), body: b }));
    });
    req.on("error", () => res({ ok: false, body: "" }));
    req.on("timeout", () => { req.destroy(); res({ ok: false, body: "" }); });
  });
}

const children = [];
function startAll(sessionRoot) {
  for (const app of APPS) {
    const child = spawn(process.execPath, [join(REPO, app.entry)], {
      cwd: REPO,
      env: { ...process.env, ...app.env, FG_PROJECT_ROOT: sessionRoot },
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("exit", (code) => { if (code && code !== 0 && !stopping) console.error(`[${app.name}] exited with code ${code}`); });
    children.push({ app, child });
  }
}

let stopping = false;
function stopAll() {
  if (stopping) return;
  stopping = true;
  console.log("\nStopping all servers…");
  for (const { child } of children) { try { child.kill("SIGTERM"); } catch { /* already gone */ } }
  setTimeout(() => process.exit(0), 300);
}

async function main() {
  const line = "─".repeat(56);

  // GATE: no parked defect on the stranger script's critical path. Mechanical —
  // refuse to start a session if any critical-path parked note is unwaived.
  const blockers = criticalPathBlockers(loadJson(MANIFEST_PATH), loadJson(PARKED_NOTES_PATH));
  if (blockers.length) {
    console.error(`\n${line}`);
    console.error("  ⛔  SESSION BLOCKED — a parked defect sits on the stranger script's critical path.");
    console.error("     A stranger cannot be asked to run a step that is known-broken. Fix it (or");
    console.error("     explicitly waive the note in parked-notes.json) before starting a session:");
    for (const b of blockers) console.error(`   • [${b.stepKey}] ${b.id}: ${b.summary}`);
    console.error(`${line}\n`);
    process.exit(1);
  }

  // never point servers at the committed fixture — copy it to a throwaway temp dir.
  const FIXTURE = join(REPO, "src", "v8a1", "fixture", "mock-project");
  const SESSION_ROOT = mkdtempSync(join(tmpdir(), "fg-stranger-"));
  cpSync(FIXTURE, SESSION_ROOT, { recursive: true });

  const busy = [];
  for (const app of APPS) if (!(await portFree(app.port))) busy.push(app);
  if (busy.length) {
    console.error("\n⚠  FounderGate can't start — these addresses are already in use:");
    for (const app of busy) console.error(`   • ${app.name} (http://localhost:${app.port})`);
    console.error("\n   FounderGate is probably already running. Close the other windows/tabs and try again.\n");
    process.exit(1);
  }

  process.on("SIGINT", stopAll);
  process.on("SIGTERM", stopAll);
  startAll(SESSION_ROOT);

  // wait for each app to bind AND to serve its OWN page (retry up to ~10s).
  const deadline = Date.now() + 10000;
  const status = {};
  while (Date.now() < deadline) {
    let allGood = true;
    for (const app of APPS) { const r = await servesOwnApp(app); status[app.port] = r.ok; if (!r.ok) allGood = false; }
    if (allGood) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const bad = APPS.filter((a) => !status[a.port]);
  if (bad.length) {
    console.error(`\n${line}`);
    console.error("  ⚠  SESSION DEFECT — an app is NOT serving its own page. Do NOT start the test:");
    for (const app of bad) console.error(`   • :${app.port} should be "${app.name}" (marker "${app.expect}") — not found`);
    console.error("  Stop everything (Ctrl-C) and relaunch. Nothing here is a stranger-ready session.");
    console.error(`${line}\n`);
    return;
  }

  console.log(`\n${line}`);
  console.log("  FounderGate — Stranger Test is ready. Each address serves its OWN app:");
  console.log(line);
  for (const app of APPS) console.log(`  ✓ ${app.name.padEnd(30)} http://localhost:${app.port}`);
  console.log(line);
  console.log("  Give the stranger docs/lanes/stranger-test-script.md.");
  console.log("  Running on a throwaway copy of the mock data — the committed fixture is never changed.");
  console.log("  Press Ctrl-C to stop.");
  console.log(`${line}\n`);
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) await main();
