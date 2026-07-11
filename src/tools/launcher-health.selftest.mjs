// FounderGate — LAUNCHER-HEALTH guard (anti-repeat for the Run-4 session defect).
//
// During Run 4 the founder found two ports appearing to serve the same page (the
// Project Guide was not visibly on :4500). Root cause class: the stranger-test
// launcher printed "ready" after any 200, never checking each port served its OWN
// app. This guard locks the fix: the launcher config must have distinct ports,
// distinct per-app identity markers, distinct port env vars, and the launcher must
// verify each port serves its own app (marker), not merely return 200.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { APPS } from "../../scripts/start-stranger-test.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const SRC = readFileSync(join(REPO, "scripts", "start-stranger-test.mjs"), "utf8");

let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };

console.log("== launcher-health guard ==");

check("exactly four apps, all fields present", () => {
  assert.equal(APPS.length, 4);
  for (const a of APPS) for (const f of ["name", "entry", "port", "env", "expect"]) assert.ok(a[f] != null, `app "${a.name}" missing ${f}`);
});

check("ports are DISTINCT (no two apps share a port)", () => {
  const ports = APPS.map((a) => a.port);
  assert.equal(new Set(ports).size, ports.length, `duplicate port in ${JSON.stringify(ports)}`);
});

check("port env vars are DISTINCT (no copy-paste of the same FG_*_PORT)", () => {
  const keys = APPS.map((a) => Object.keys(a.env).join(","));
  assert.equal(new Set(keys).size, keys.length, `duplicate/blank port env among ${JSON.stringify(keys)}`);
  for (const a of APPS) assert.ok(String(a.env[Object.keys(a.env)[0]]) === String(a.port), `${a.name} env port != its port`);
});

check("identity markers are DISTINCT (each app is uniquely recognisable)", () => {
  const marks = APPS.map((a) => a.expect);
  assert.equal(new Set(marks).size, marks.length, `duplicate identity marker in ${JSON.stringify(marks)}`);
  // no marker is a substring of another (would make two apps confusable)
  for (const a of APPS) for (const b of APPS) if (a !== b) assert.ok(!b.expect.includes(a.expect), `marker "${a.expect}" is inside "${b.expect}"`);
});

check("each app's UI page actually contains its own marker on disk", () => {
  const ui = {
    "Truth Dashboard": "src/v8a1/dashboard/index.html",
    "Preview Bay": "src/v8a2/preview/ui/preview-bay.html",
    "File Cabinet": "src/v8a3/filecabinet/ui/filecabinet.html",
    "Project Guide": "src/v8a4/guide/ui/guide.html",
  };
  for (const a of APPS) {
    const html = readFileSync(join(REPO, ui[a.expect]), "utf8");
    assert.ok(html.includes(a.expect), `${ui[a.expect]} must contain its marker "${a.expect}"`);
  }
});

check("the launcher VERIFIES each port serves its own app (marker), not just a 200", () => {
  assert.ok(/servesOwnApp/.test(SRC), "launcher must have a per-app health check (servesOwnApp)");
  assert.ok(/includes\(app\.expect\)/.test(SRC), "the health check must match on the app's expect marker");
  assert.ok(/SESSION DEFECT/.test(SRC), "the launcher must refuse to declare ready on a marker mismatch");
});

console.log(`\nV8-LAUNCHER-HEALTH-GUARD: PASS ${pass}`);
