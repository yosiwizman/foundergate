// FounderGate — cage-evidence sample builder.
//
// SCAFFOLD ONLY — caged/held is NOT live proof. Reconstructs one caged OUTER-CAGE
// run (open -> deny egress -> hold actions -> serve mocks -> tests -> checker ->
// advisor -> founder -> close) as an append-only, hash-chained cage-evidence
// ledger, running every event through the REAL writer so the schema + source law
// + chain are exercised end to end.
//
// DETERMINISTIC: the sample is built from the committed fixtures/valid/*.json
// (fixed timestamps + fixed policy_hash), so regenerating it yields byte-identical
// output — the committed cage-evidence.sample.jsonl never churns git.
//
// HONESTY CONTRACT: no event grades as "live". Verdicts are caged (checker PASS,
// advisor HOLD, founder PENDING) — the caged record is not, and cannot be, a live
// crossing. Final cage claims require independent Checker + Advisor verification.
//
// Usage:
//   node src/evidence/build-cage-evidence-sample.mjs             # -> cage-evidence.sample.jsonl
//   node src/evidence/build-cage-evidence-sample.mjs --out /tmp/x.jsonl
//
// Writes ONLY to a local harness file, never a protected store.

import { readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writeMany, LOCAL_DEFAULT_PATH } from "./cage-evidence-ledger.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const VALID_DIR = join(HERE, "fixtures", "valid");

// The ordered caged run: every committed valid fixture, in filename order.
export const SAMPLE_EVENTS = readdirSync(VALID_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(VALID_DIR, f), "utf8")));

export function buildSample(outPath = LOCAL_DEFAULT_PATH) {
  const abs = resolve(outPath);
  // Rebuild from scratch so the append-only file is deterministic.
  if (existsSync(abs)) rmSync(abs);
  return writeMany(SAMPLE_EVENTS, { path: abs });
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const i = process.argv.indexOf("--out");
  const out = i !== -1 ? process.argv[i + 1] : LOCAL_DEFAULT_PATH;
  const written = buildSample(out);
  console.log(`wrote ${written.length} cage-evidence events -> ${out}`);
}
