// V8-A1 — FIXTURE-PRISTINE guard (anti-repeat; locks the Run-1 corruption class).
//
// During Stranger Test Run 1 the live Preview Bay wrote a tracked process into the
// COMMITTED mock fixture's run_state.json and the Bug Collector saved a bug file
// into it; a `git add -A` swept both in and turned main red. The launcher now runs
// on a throwaway copy (so it can't happen again), and THIS guard is the belt-and-
// braces: it recomputes a content hash of every file in the canonical fixture and
// compares it to the blessed manifest. Any unintended change (a swept-in session
// artifact) fails CI. An INTENTIONAL fixture change updates the manifest in the
// same PR (run: `node src/v8a1/fixture-pristine.selftest.mjs --write`).

import { readdirSync, statSync, lstatSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "fixture", "mock-project");
const MANIFEST = resolve(HERE, "fixture", "fixture.manifest.json");

function computeManifest(root) {
  const files = {};
  (function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      const abs = join(dir, name);
      const st = lstatSync(abs);
      if (st.isDirectory()) walk(abs);
      else if (st.isFile()) files[relative(root, abs)] = createHash("sha256").update(readFileSync(abs)).digest("hex");
    }
  })(root);
  // return an ordered object (sorted keys) for a stable manifest
  return Object.fromEntries(Object.keys(files).sort().map((k) => [k, files[k]]));
}

// `--write` regenerates the blessed manifest (use ONLY when the fixture change is intentional).
if (process.argv.includes("--write")) {
  const m = computeManifest(FIXTURE);
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");
  console.log(`wrote blessed manifest: ${Object.keys(m).length} files -> ${relative(resolve(HERE, "..", ".."), MANIFEST)}`);
  process.exit(0);
}

const problems = [];
let checked = 0;

if (!existsSync(MANIFEST)) {
  problems.push("missing blessed fixture manifest — run: node src/v8a1/fixture-pristine.selftest.mjs --write");
} else {
  const blessed = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const current = computeManifest(FIXTURE);
  const blessedKeys = new Set(Object.keys(blessed));
  const currentKeys = new Set(Object.keys(current));
  for (const k of currentKeys) {
    checked++;
    if (!blessedKeys.has(k)) problems.push(`UNEXPECTED file swept into the fixture: ${k} (a live session artifact?)`);
    else if (blessed[k] !== current[k]) problems.push(`fixture file MUTATED from blessed state: ${k}`);
  }
  for (const k of blessedKeys) if (!currentKeys.has(k)) problems.push(`fixture file MISSING vs blessed: ${k}`);
}

if (problems.length) {
  console.error(`FIXTURE-PRISTINE-GUARD: FAIL (${problems.length}) — checked ${checked} fixture files`);
  for (const p of problems) console.error("  - " + p);
  console.error("  If this change was INTENTIONAL, refresh the manifest: node src/v8a1/fixture-pristine.selftest.mjs --write");
  process.exit(1);
}
console.log(`FIXTURE-PRISTINE-GUARD: PASS (${checked} fixture files match the blessed manifest)`);
