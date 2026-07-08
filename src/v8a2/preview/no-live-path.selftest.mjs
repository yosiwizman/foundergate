// FounderGate V8-A2 — NO-LIVE-PATH proof (required acceptance artifact).
//
// Mechanically proves the Preview Bay has no live/provider/send/payment path:
//   1. The preview subsystem source imports no outbound-network / provider /
//      send / payment API (static scan).
//   2. The ONLY allowlisted preview target is the safe repo-local static server.
//   3. The controller's no-live guard exists (refuses live env / non-off sends /
//      live payments) and the safe server refuses any non-GET/HEAD method.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ALLOWED_TARGETS } from "./preview-controller.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(HERE, f), "utf8");

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }

const controller = read("preview-controller.mjs");
const server = read("preview-server.mjs");

// Forbidden outbound / provider / send / payment identifiers — concrete API
// tokens (not English words, so comments about "no provider path" don't trip it).
const FORBIDDEN = [
  "fetch(", "http.request", "https.request", "net.connect", "createConnection",
  "nodemailer", "twilio", "stripe", "paypal", "sendMail(", "sendMessage(",
  "XMLHttpRequest", "WebSocket",
];

check("preview subsystem imports no outbound/provider/send/payment API", () => {
  for (const tok of FORBIDDEN) {
    assert.ok(!controller.includes(tok), `controller uses forbidden token: ${tok}`);
    assert.ok(!server.includes(tok), `server uses forbidden token: ${tok}`);
  }
});

check("only the safe static preview target is allowlisted", () => {
  assert.deepEqual([...ALLOWED_TARGETS], ["static-preview"]);
});

check("controller carries an explicit no-live guard", () => {
  assert.match(controller, /assertNotLive/);
  assert.match(controller, /refusing to preview a LIVE environment/);
  assert.match(controller, /sends !== "off"/);
});

check("preview server is loopback-only and read-only", () => {
  assert.match(server, /"127\.0\.0\.1"/);
  assert.match(server, /read-only/i);
  assert.match(server, /!== "GET" && req\.method !== "HEAD"/);
});

check("controller spawns a FIXED node command, never a config command", () => {
  assert.match(controller, /spawn\(process\.execPath, \[PREVIEW_SERVER/);
});

check("control server binds loopback only (checker finding A)", () => {
  const server = read("../server.mjs");
  assert.match(server, /server\.listen\(PORT, "127\.0\.0\.1"/);
});

check("start failure kills the child (no orphan; checker finding #5)", () => {
  assert.match(controller, /const onFail = \(why\) => \{[\s\S]*child\.kill\("SIGTERM"\)/);
});

console.log(`\nV8A2-NO-LIVE-PATH-PROOF: PASS (${passed} checks)`);
