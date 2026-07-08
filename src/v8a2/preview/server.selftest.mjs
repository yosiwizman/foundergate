// FounderGate V8-A2 — Preview Bay server integration selftest (loopback only).
//
// Exercises the server's preview-control API against a temp project copy: status
// (idle) → start (running + run_state tracked) → stop (idle). Loopback only; no
// external network. Always stops the child; never mutates the committed fixture.

import assert from "node:assert/strict";
import { request } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createA2Server } from "../server.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "..", "..", "v8a1", "fixture", "mock-project");

let passed = 0;
function ok(name) { passed++; console.log(`  PASS: ${name}`); }

function call(port, path, method = "GET") {
  return new Promise((res, rej) => {
    const r = request({ host: "127.0.0.1", port, path, method }, (resp) => {
      let d = ""; resp.on("data", (c) => (d += c)); resp.on("end", () => res(JSON.parse(d || "{}")));
    });
    r.on("error", rej); r.end();
  });
}

// temp project copy so the committed fixture is never mutated
const proj = mkdtempSync(join(tmpdir(), "v8a2-srv-"));
cpSync(FIXTURE, proj, { recursive: true });
const server = createA2Server(proj);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

try {
  let s = await call(port, "/api/preview/status");
  assert.equal(s.status, "stopped");
  assert.equal(s.labels.sends, "off");
  ok("status is stopped + labels honest (sends off) before start");

  s = await call(port, "/api/preview/start", "POST");
  assert.equal(s.status, "running");
  assert.ok(s.url && s.url.startsWith("http://127.0.0.1:"));
  ok("start → running with a loopback preview url");

  const rs = JSON.parse(readFileSync(join(proj, ".foundergate", "run_state.json"), "utf8"));
  assert.equal(rs.mode, "running");
  assert.equal(rs.tracked_processes.length, 1);
  ok("start registers the preview as a tracked process in run_state.json");

  s = await call(port, "/api/preview/stop", "POST");
  assert.equal(s.status, "stopped");
  const rs2 = JSON.parse(readFileSync(join(proj, ".foundergate", "run_state.json"), "utf8"));
  assert.equal(rs2.tracked_processes.length, 0);
  ok("stop → stopped + tracked cleared");

  console.log(`\nV8A2-SERVER-SELFTEST: PASS (${passed} checks)`);
} finally {
  await new Promise((r) => server.close(r));
  rmSync(proj, { recursive: true, force: true });
}
