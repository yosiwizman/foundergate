// FounderGate V8-A3 — File Cabinet server integration selftest (loopback only).
//
// Proves the API serves the tree with badges and enforces access through the
// checker-approved cabinet: a safe founder doc previews with content; a SECRET
// and an UNKNOWN file return blocked with NO content. Loopback only; no fixture
// mutation.

import assert from "node:assert/strict";
import { request } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createCabinetServer } from "./server.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "..", "..", "v8a1", "fixture", "mock-project");

let passed = 0;
function ok(name) { passed++; console.log(`  PASS: ${name}`); }
function get(port, path) {
  return new Promise((res, rej) => {
    const r = request({ host: "127.0.0.1", port, path, method: "GET" }, (resp) => {
      let d = ""; resp.on("data", (c) => (d += c)); resp.on("end", () => res(JSON.parse(d || "{}")));
    });
    r.on("error", rej); r.end();
  });
}

const server = createCabinetServer(FIXTURE);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
try {
  const tree = await get(port, "/api/cabinet/tree");
  assert.ok(tree.count >= 8);
  const byPath = Object.fromEntries(tree.files.map((f) => [f.path, f]));
  assert.equal(byPath["mock-config.txt"].data_class, "SECRET");
  assert.equal(byPath["mystery.dat"].data_class, "UNKNOWN");
  ok("tree served with a data-class on every file (SECRET + UNKNOWN present)");

  const doc = await get(port, "/api/cabinet/file?action=preview&path=" + encodeURIComponent("docs/CURRENT_STATUS.md"));
  assert.equal(doc.allowed, true);
  assert.match(doc.content, /MOCK_ONLY founder document/);
  ok("safe founder document previews with content");

  for (const rel of ["mock-config.txt", "mystery.dat"]) {
    for (const action of ["preview", "copy", "download"]) {
      const r = await get(port, `/api/cabinet/file?action=${action}&path=${encodeURIComponent(rel)}`);
      assert.equal(r.allowed, false, `${rel} ${action} must be blocked`);
      assert.ok(!("content" in r), `${rel} ${action}: no content`);
    }
  }
  ok("SECRET + UNKNOWN files return blocked (no content) for preview/copy/download");

  const trav = await get(port, "/api/cabinet/file?action=preview&path=" + encodeURIComponent("../../../etc/passwd"));
  assert.equal(trav.allowed, false);
  assert.ok(!("content" in trav));
  ok("traversal via the API is blocked (no content)");

  console.log(`\nV8A3-CABINET-SERVER-SELFTEST: PASS (${passed} checks)`);
} finally {
  await new Promise((r) => server.close(r));
}
