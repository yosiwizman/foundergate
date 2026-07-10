// FounderGate — Stranger Test launcher (one command starts every founder-facing app).
//
// Starts all four V8-A servers on loopback and prints the URLs the stranger will use.
// Read-only against the MOCK_ONLY fixture; no live/provider/send/payment path. Press
// Ctrl-C to stop them all.
//
//   node scripts/start-stranger-test.mjs
//   npm run stranger-test        (same thing)

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

// The four founder-facing apps, in the order the stranger visits them.
const APPS = [
  { name: "Truth Dashboard", entry: "src/v8a1/dashboard/server.mjs", port: 4173, env: { FG_PORT: "4173" } },
  { name: "Preview Bay + Bug Collector", entry: "src/v8a2/server.mjs", port: 4300, env: { FG_A2_PORT: "4300" } },
  { name: "File Cabinet", entry: "src/v8a3/filecabinet/server.mjs", port: 4400, env: { FG_A3_PORT: "4400" } },
  { name: "Project Guide", entry: "src/v8a4/guide/server.mjs", port: 4500, env: { FG_A4_PORT: "4500" } },
];

// Pre-check a port so we never spawn onto a busy one (which would crash a child
// with a scary stack trace). Resolves true if the port is FREE.
function portFree(port) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port, "127.0.0.1");
  });
}

async function preflight() {
  const busy = [];
  for (const app of APPS) if (!(await portFree(app.port))) busy.push(app);
  if (busy.length) {
    console.error("\n⚠  FounderGate can't start — these addresses are already in use:");
    for (const app of busy) console.error(`   • ${app.name} (http://localhost:${app.port})`);
    console.error("\n   FounderGate is probably already running. Close the other windows/tabs");
    console.error("   (or the earlier run) and try again. Nothing was started.\n");
    process.exit(1);
  }
}

const children = [];
function startAll() {
  for (const app of APPS) {
    const child = spawn(process.execPath, [join(REPO, app.entry)], {
      cwd: REPO,
      env: { ...process.env, ...app.env },
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("exit", (code) => {
      if (code && code !== 0 && !stopping) console.error(`[${app.name}] exited with code ${code}`);
    });
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
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

await preflight();
startAll();

// give the servers a moment to bind, then print the stranger's URL card.
setTimeout(() => {
  const line = "─".repeat(52);
  console.log(`\n${line}`);
  console.log("  FounderGate — Stranger Test is ready. Open these:");
  console.log(line);
  for (const app of APPS) console.log(`  ${app.name.padEnd(30)} http://localhost:${app.port}`);
  console.log(line);
  console.log("  Give the stranger docs/lanes/stranger-test-script.md.");
  console.log("  Observer: capture notes in docs/lanes/stranger-test-evidence-template.md.");
  console.log("  Everything is read-only on mock data. Press Ctrl-C to stop.");
  console.log(`${line}\n`);
}, 1200);
