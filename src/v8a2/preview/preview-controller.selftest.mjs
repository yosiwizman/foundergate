// FounderGate V8-A2 — Preview Bay controller selftest (hermetic, offline).
//
// Proves the SEMI-SENSITIVE process-control contract, both directions:
//   - start() runs ONLY the allowlisted safe static preview on loopback, and
//     registers a tracked process in run_state.json (mode running).
//   - stop() clears the tracked process (mode idle).
//   - restart() works.
//   - a non-allowlisted target is REFUSED.
//   - a LIVE environment / non-off sends / live payments are REFUSED (no-live).
//   - app_dir traversal/absolute is REFUSED.
//   - a start failure yields a plain-English C7 object, never a fabricated success.
// It writes only into a throwaway temp project; it always stops the child.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PreviewController, PreviewError } from "./preview-controller.mjs";

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }
async function acheck(name, fn) { await fn(); passed++; console.log(`  PASS: ${name}`); }

function makeProject(preview) {
  const root = mkdtempSync(join(tmpdir(), "v8a2-preview-"));
  mkdirSync(join(root, ".foundergate"), { recursive: true });
  mkdirSync(join(root, "app"), { recursive: true });
  writeFileSync(join(root, "app", "index.html"), "<!doctype html><title>t</title><h1>preview</h1>");
  writeFileSync(join(root, ".foundergate", "preview.json"), JSON.stringify(preview));
  return root;
}
const SAFE = {
  schema_version: "1.0.0", target: "static-preview", app_dir: "app",
  environment: "preview", data: "mock", sends: "off", payments: "mock",
  build: "t", release_label: "dev", data_classification: "MOCK_ONLY",
};
const readRunState = (root) => JSON.parse(readFileSync(join(root, ".foundergate", "run_state.json"), "utf8"));

const cleanups = [];
try {
  // 1. start → running + tracked in run_state.
  await acheck("start() runs the safe preview and registers a tracked process", async () => {
    const root = makeProject(SAFE); cleanups.push(root);
    const pc = new PreviewController(root);
    const r = await pc.start();
    try {
      assert.equal(r.status, "running");
      assert.ok(r.port > 0 && r.url.startsWith("http://127.0.0.1:"));
      const rs = readRunState(root);
      assert.equal(rs.mode, "running");
      assert.equal(rs.tracked_processes.length, 1);
      assert.match(rs.tracked_processes[0], /preview server/);
      // labels are honest and never live
      assert.equal(r.labels.environment, "preview");
      assert.equal(r.labels.sends, "off");
    } finally { pc.stop(); }
  });

  // 2. stop → tracked cleared.
  await acheck("stop() clears the tracked process (mode idle)", async () => {
    const root = makeProject(SAFE); cleanups.push(root);
    const pc = new PreviewController(root);
    await pc.start();
    pc.stop();
    const rs = readRunState(root);
    assert.equal(rs.mode, "idle");
    assert.equal(rs.tracked_processes.length, 0);
  });

  // 3. restart works.
  await acheck("restart() brings the preview back up", async () => {
    const root = makeProject(SAFE); cleanups.push(root);
    const pc = new PreviewController(root);
    await pc.start();
    const r = await pc.restart();
    try { assert.equal(r.status, "running"); assert.ok(r.port > 0); } finally { pc.stop(); }
  });

  // 4. non-allowlisted target refused.
  await acheck("non-allowlisted target is REFUSED", async () => {
    const root = makeProject({ ...SAFE, target: "static-preview" }); cleanups.push(root);
    // hand-craft an invalid target that bypasses schema by writing raw
    writeFileSync(join(root, ".foundergate", "preview.json"), JSON.stringify({ ...SAFE, target: "shell-command" }));
    const pc = new PreviewController(root);
    await assert.rejects(() => pc.start(), (e) => e instanceof PreviewError);
  });

  // 5. no-live guard: live env / non-off sends / live payments refused.
  for (const bad of [{ environment: "live" }, { sends: "live" }, { payments: "live" }]) {
    await acheck(`no-live guard refuses ${JSON.stringify(bad)}`, async () => {
      const root = makeProject({ ...SAFE, ...bad }); cleanups.push(root);
      const pc = new PreviewController(root);
      await assert.rejects(() => pc.start(), (e) => e instanceof PreviewError && /live|sends/.test(e.message));
    });
  }

  // 6. app_dir traversal / absolute refused.
  await acheck("app_dir traversal is REFUSED", async () => {
    const root = makeProject({ ...SAFE, app_dir: "../escape" }); cleanups.push(root);
    const pc = new PreviewController(root);
    await assert.rejects(() => pc.start(), (e) => e instanceof PreviewError);
  });

  // 6b. an unexpected child exit clears the running state (no stale "running").
  await acheck("unexpected child exit clears running state (checker finding #6)", async () => {
    const root = makeProject(SAFE); cleanups.push(root);
    const pc = new PreviewController(root);
    await pc.start();
    const pid = pc.child.pid;
    process.kill(pid, "SIGKILL"); // simulate a crash / external kill
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(pc.status().status, "stopped", "controller must not report stale running");
    assert.equal(readRunState(root).mode, "idle");
  });

  // 7. C7 failure description is plain-English, never fabricated success.
  check("describeFailure() gives plain-English C7, fabricated_success false", () => {
    const f = PreviewController.describeFailure(new PreviewError("target not allowlisted"));
    assert.equal(f.failed, true);
    assert.equal(f.fabricated_success, false);
    assert.match(f.next_action, /preview\.json/);
  });

  console.log(`\nV8A2-PREVIEW-CONTROLLER-SELFTEST: PASS (${passed} checks)`);
} finally {
  for (const r of cleanups) { try { rmSync(r, { recursive: true, force: true }); } catch {} }
}
