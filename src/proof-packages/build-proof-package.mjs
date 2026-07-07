#!/usr/bin/env node
// FounderGate — PRIVATE proof-package GENERATOR (generic sample).
//
// Assembles the normalized proof package from proof-package.model.mjs entirely
// OFFLINE (no network, no gh, no provider). It:
//   1. loads the source MODEL,
//   2. validates every item carries an allowed label + the no-overclaim rules,
//   3. computes the by-label PR rollup,
//   4. runs the secret + PII scanner (fail-closed) over the whole package,
//   5. writes data/proof-package.json (deterministic, sorted keys off).
//
// Usage:
//   node build-proof-package.mjs           # build + write data/proof-package.json
//   node build-proof-package.mjs --check   # build in memory, assert clean, DO NOT write
//
// Exit non-zero (fail-closed) on any label violation, overclaim, or secret/PII
// hit. Prints only pattern NAMES on a hit, never the offending value.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MODEL, LABELS } from './proof-package.model.mjs';
import { assertNoSecret, assertNoPii, scan } from './redact.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'data', 'proof-package.json');
const ALLOWED = new Set(Object.keys(LABELS));

function fail(msg) {
  console.error('BUILD_FAIL: ' + msg);
  process.exit(1);
}

// --- 1. collect every labeled item and validate the label vocabulary --------
function collectLabels(model) {
  const items = [];
  for (const r of model.merged_prs.rows) items.push({ where: `pr#${r.pr}`, label: r.label });
  for (const k of Object.keys(model.ci_copilot_advisor)) items.push({ where: `ci_copilot_advisor.${k}`, label: model.ci_copilot_advisor[k].label });
  for (const g of model.gate_reports) items.push({ where: `gate.${g.id}`, label: g.label });
  for (const e of model.runtime_evidence) items.push({ where: `evidence.${e.id}`, label: e.label });
  items.push({ where: 'run_closeout', label: model.run_closeout.label });
  return items;
}

function validateLabels(items) {
  for (const it of items) {
    if (!ALLOWED.has(it.label)) fail(`item ${it.where} has non-allowed label "${it.label}"`);
  }
}

// --- 2. no-overclaim invariants ---------------------------------------------
function validateNoOverclaim(model) {
  // The package must never assert a live provider send / live enact.
  const flat = JSON.stringify(model).toLowerCase();
  // These phrases would be overclaims if paired with a positive assertion; the
  // package instead asserts the OPPOSITE. Assert the negations are present.
  const mustState = ['no provider send', 'preview != live', 'fail-closed'];
  for (const phrase of mustState) {
    if (!flat.includes(phrase.toLowerCase())) fail(`missing required honesty statement: "${phrase}"`);
  }
  // working-runtime is only allowed for the doctor + ci-safety diagnostics.
  const wr = model.runtime_evidence.filter((e) => e.label === 'working-runtime').map((e) => e.id).sort();
  const wrCi = Object.entries(model.ci_copilot_advisor).filter(([, v]) => v.label === 'working-runtime').map(([k]) => k);
  const allowedWr = new Set(['doctor', 'ci-safety', 'ci']);
  for (const id of [...wr, ...wrCi]) {
    if (!allowedWr.has(id)) fail(`working-runtime claimed for "${id}" — only the doctor + ci-safety diagnostics may claim working-runtime (no provider send)`);
  }
  // The package must be marked PRIVATE.
  if (model.package.private !== true || model.package.no_public_sharing !== true) {
    fail('package is not marked PRIVATE / no_public_sharing');
  }
}

// --- 3. by-label rollup ------------------------------------------------------
function byLabel(rows) {
  const out = {};
  for (const l of Object.keys(LABELS)) out[l] = 0;
  for (const r of rows) out[r.label] = (out[r.label] || 0) + 1;
  return out;
}

// --- assemble ----------------------------------------------------------------
export function assemble() {
  const model = MODEL;
  const items = collectLabels(model);
  validateLabels(items);
  validateNoOverclaim(model);

  const rollup = byLabel(model.merged_prs.rows);
  const pkg = JSON.parse(JSON.stringify(model)); // deep clone
  pkg.merged_prs.total = model.merged_prs.rows.length;
  pkg.merged_prs.by_label = rollup;
  pkg.run_summary.byLabel = rollup;
  pkg.generated = {
    generator: 'src/proof-packages/build-proof-package.mjs',
    offline: true,
    label_count: items.length,
    note: 'Deterministic offline build. No network, no gh, no provider. See REDACTION_CHECKLIST.md.',
  };

  // 4. fail-closed secret + PII scan over the WHOLE package.
  assertNoSecret(pkg);
  assertNoPii(pkg);
  const report = scan(pkg);
  if (!report.clean) fail(`scan reported hits: secrets=${report.secretHits.join(',')} pii=${report.piiHits.join(',')}`);

  return { pkg, rollup, itemCount: items.length, scan: report };
}

function main() {
  const check = process.argv.includes('--check');
  const { pkg, rollup, itemCount, scan: rep } = assemble();
  const json = JSON.stringify(pkg, null, 2) + '\n';
  if (!check) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, json);
  }
  const total = pkg.merged_prs.total;
  const rollupStr = Object.entries(rollup).filter(([, n]) => n > 0).map(([l, n]) => `${l}:${n}`).join(' ');
  console.log(`PROOF-PACKAGE: ${check ? 'CHECK' : 'BUILD'} OK — ${total} PRs (${rollupStr}); ${itemCount} labeled items; secret/PII scan CLEAN; PRIVATE`);
  // Verify the on-disk copy matches in non-check mode (idempotence guard).
  if (!check) {
    const disk = readFileSync(OUT, 'utf8');
    if (disk !== json) fail('written file does not match assembled package (non-deterministic build)');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
