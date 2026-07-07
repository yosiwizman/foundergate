#!/usr/bin/env node
// FounderGate — PRIVATE proof-package SELFTEST (hermetic, offline; generic sample).
//
// Proves the generator assembles the package offline and that the emitted
// package carries NO secret and NO PII shape, every item is labeled, the
// no-overclaim invariants hold, and the on-disk data/proof-package.json matches
// a fresh build (deterministic). Also fires the scanners against KNOWN-BAD
// probes to prove they actually bite (a scanner that never rejects is useless).
//
// Zero dependencies, no network, no gh, no provider. Exit 0 = PASS.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assemble } from './build-proof-package.mjs';
import { assertNoSecret, assertNoPii, scan } from './redact.mjs';
import { LABELS } from './proof-package.model.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let n = 0;
const fails = [];
function ok(cond, msg) {
  n++;
  if (!cond) fails.push(msg);
}
function throws(fn, msg) {
  n++;
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) fails.push('expected throw: ' + msg);
}

// --- build offline -----------------------------------------------------------
const { pkg, rollup, itemCount, scan: rep } = assemble();

ok(pkg && typeof pkg === 'object', 'package assembled');
ok(pkg.package.classification === 'PRIVATE', 'classification PRIVATE');
ok(pkg.package.private === true, 'private flag true');
ok(pkg.package.no_public_sharing === true, 'no_public_sharing true');
ok(pkg.package.no_external_publication === true, 'no_external_publication true');
ok(rep.clean === true, 'assemble scan clean');

// --- every PR + item is labeled with an allowed label ------------------------
const ALLOWED = new Set(Object.keys(LABELS));
ok(pkg.merged_prs.total === 10, 'exactly 10 PRs in window');
ok(pkg.merged_prs.rows.length === 10, '10 rows present');
for (const r of pkg.merged_prs.rows) {
  ok(ALLOWED.has(r.label), `pr#${r.pr} label allowed (${r.label})`);
  ok(r.pr >= 1 && r.pr <= 10, `pr#${r.pr} in window`);
  ok(/^[0-9a-f]{12}$/.test(r.mergeCommit), `pr#${r.pr} mergeCommit is 12-hex`);
}
for (const e of pkg.runtime_evidence) ok(ALLOWED.has(e.label), `evidence ${e.id} label allowed`);
for (const g of pkg.gate_reports) ok(ALLOWED.has(g.label), `gate ${g.id} label allowed`);

// --- rollup arithmetic -------------------------------------------------------
const sum = Object.values(rollup).reduce((a, b) => a + b, 0);
ok(sum === 10, 'rollup sums to 10');
ok(rollup['docs/spec'] === 6, 'docs/spec count = 6');
ok(rollup['preview-only'] === 3, 'preview-only count = 3');
ok(rollup['gated'] === 1, 'gated count = 1');
ok((rollup['working-runtime'] || 0) === 0, 'zero PRs claim working-runtime (honest: no live runtime shipped this sample window)');

// --- no-overclaim: working-runtime only on doctor + ci-safety diagnostics ----
const wrEvidence = pkg.runtime_evidence.filter((e) => e.label === 'working-runtime').map((e) => e.id).sort();
ok(JSON.stringify(wrEvidence) === JSON.stringify(['ci-safety', 'doctor']), 'working-runtime evidence is exactly doctor + ci-safety');
ok(pkg.ci_copilot_advisor.ci.label === 'working-runtime', 'ci gate labeled working-runtime');
ok(pkg.ci_copilot_advisor.reviewer.label === 'docs/spec', 'reviewer posture is docs/spec (not runtime)');
ok(pkg.ci_copilot_advisor.advisor.label === 'docs/spec', 'advisor posture is docs/spec (not runtime)');
// local-action must be preview-only + carry a fail-closed note.
const la = pkg.runtime_evidence.find((e) => e.id === 'local-action-fail-closed');
ok(la && la.label === 'preview-only', 'local-action labeled preview-only (not live)');
ok(la && /fail-closed/i.test(la.capabilityNote), 'local-action carries fail-closed note');
ok(/no provider send|preview != live/i.test(JSON.stringify(pkg.package)), 'package disclaimer states preview != live / no provider send');

// --- the emitted package is genuinely clean (fail-closed) --------------------
ok(assertNoSecret(pkg) === true, 'assertNoSecret passes on package');
ok(assertNoPii(pkg) === true, 'assertNoPii passes on package');

// --- the scanners actually BITE on known-bad probes --------------------------
// (probes are constructed at runtime so this file holds no literal secret/PII)
const fakeGh = 'gh' + 'p_' + 'A'.repeat(30);
const fakeBearer = 'Bearer ' + 'x'.repeat(24);
throws(() => assertNoSecret({ leak: fakeGh }), 'gh token probe rejected');
throws(() => assertNoSecret({ auth: fakeBearer }), 'bearer probe rejected');
const fakeEmail = 'someone' + '@' + 'example.com';
const fakePhone = '305' + '-' + '555' + '-' + '0142';
throws(() => assertNoPii({ e: fakeEmail }), 'email probe rejected');
throws(() => assertNoPii({ p: fakePhone }), 'phone probe rejected');
ok(scan({ e: fakeEmail }).clean === false, 'scan flags email probe (non-throwing)');
ok(scan({ ok: 'branch feature/x head 28bdd336d78d pr 7' }).clean === true, 'scan passes clean SHA/branch/PR text');

// --- determinism: on-disk file matches a fresh build -------------------------
const disk = readFileSync(join(HERE, 'data', 'proof-package.json'), 'utf8');
const fresh = JSON.stringify(pkg, null, 2) + '\n';
ok(disk === fresh, 'data/proof-package.json is up to date (deterministic build)');

// --- report ------------------------------------------------------------------
if (fails.length) {
  console.error(`PROOF-PACKAGE-SELFTEST: FAIL (${fails.length}/${n})`);
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log(`PROOF-PACKAGE-SELFTEST: PASS (${n} assertions; 10 PRs labeled; secret+PII scanners bite; package CLEAN + PRIVATE; deterministic build; ${itemCount} labeled items)`);
