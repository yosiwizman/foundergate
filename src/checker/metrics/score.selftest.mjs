#!/usr/bin/env node
// FounderGate — Checker Reliability Scorer selftest (zero-dependency, offline).
//
// Proves the H34 acceptance criteria:
//   0. the scoring MODEL weights sum to 1.0;
//   1. every top-level fixtures/*.json is schema-VALID and scores;
//   2. every fixtures/invalid/*.json is schema-REJECTED (and does not score);
//   3. all shipped fixtures are label='illustrative' — no real measured checker
//      sample is claimed (honesty: we have not yet measured a live checker);
//   4. the six named metrics drive the expected bands (gold=green/RELIABLE,
//      noisy=yellow/RELIABLE with the two friction warnings);
//   5. the ANTI-TRUST veto layer bites — a checker whose raw number is green/yellow
//      is FORCED to UNRELIABLE/red when a disqualifier (a real miss, a flapping
//      verdict, an alarm storm, a review-thrash loop) hides underneath;
//   6. the human checklist (reliability-vetoes.json) id-set exactly matches the
//      enforced code (VETOES/WARNINGS) — the copy cannot silently drift;
//   7. scoring is deterministic, and raising the miss_rate lowers the score and
//      (past the threshold) trips the HIGH_MISS_RATE veto.
//
// Run: node harness/checker/metrics/score.selftest.mjs
// Exit 0 = PASS (prints CHECKER-RELIABILITY-SELFTEST: PASS); non-zero on failure.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  computeScore, scoreFile, validateScorecard, VETOES, WARNINGS, MODEL,
} from './score.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FX = join(HERE, 'fixtures');
const INVALID = join(FX, 'invalid');

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`  PASS: ${msg}`);
  else { failures += 1; console.log(`  FAIL: ${msg}`); }
}

// --- 0. model sanity: weights sum to 1.0 -----------------------------------
const weightSum = Object.values(MODEL.weights).reduce((a, b) => a + b, 0);
ok(Math.abs(weightSum - 1.0) < 1e-9, `MODEL weights sum to 1.0 (got ${weightSum.toFixed(4)})`);

// --- 1. every top-level fixture is VALID and scores ------------------------
const validFiles = readdirSync(FX).filter((f) => f.endsWith('.json'));
ok(validFiles.length >= 6, `found ${validFiles.length} top-level fixture(s) (>=6 expected)`);
for (const f of validFiles) {
  const { valid, errors } = validateScorecard(JSON.parse(readFileSync(join(FX, f), 'utf8')));
  ok(valid, `VALID ${f}${valid ? '' : ' — ' + errors.join('; ')}`);
}

// --- 2. every invalid fixture is REJECTED ----------------------------------
const invalidFiles = readdirSync(INVALID).filter((f) => f.endsWith('.json'));
ok(invalidFiles.length >= 5, `found ${invalidFiles.length} malformed fixture(s) (>=5 expected)`);
for (const f of invalidFiles) {
  const r = scoreFile(join(INVALID, f));
  ok(r.valid === false, `REJECT ${f}`);
}

// --- 3. honesty: no shipped fixture claims a real measured sample ----------
for (const f of validFiles) {
  const r = scoreFile(join(FX, f));
  ok(r.label === 'illustrative', `fixture ${f} is honestly labelled illustrative (not a claimed real measurement)`);
}

// --- 4. the six named metrics drive the expected bands ---------------------
const gold = scoreFile(join(FX, 'gold-checker.illustrative.json'));
ok(gold.score === 99 && gold.effective_band === 'green' && gold.disposition === 'RELIABLE',
  `gold-checker = 99/green/RELIABLE (got ${gold.score}/${gold.effective_band}/${gold.disposition})`);
ok(gold.vetoes.length === 0 && gold.warnings.length === 0, 'gold-checker has no veto and no warning');

const noisy = scoreFile(join(FX, 'noisy-but-safe.illustrative.json'));
ok(noisy.score === 76 && noisy.effective_band === 'yellow' && noisy.disposition === 'RELIABLE',
  `noisy-but-safe = 76/yellow/RELIABLE (got ${noisy.score}/${noisy.effective_band}/${noisy.disposition})`);
ok(noisy.vetoes.length === 0
   && noisy.warnings.includes('ELEVATED_FALSE_POSITIVE') && noisy.warnings.includes('VERDICT_DRIFT'),
  'noisy-but-safe passes with ELEVATED_FALSE_POSITIVE + VERDICT_DRIFT warnings, no veto');

// --- 5. the ANTI-TRUST veto layer actually bites ---------------------------
// 5a. A raw-GREEN checker is forced to UNRELIABLE/red by a hidden real miss.
const missed = scoreFile(join(FX, 'missed-breach.illustrative.json'));
ok(missed.numeric_band === 'green',
  `missed-breach raw number is GREEN (numeric_band=${missed.numeric_band}) — a high number alone would pass`);
ok(missed.disposition === 'UNRELIABLE' && missed.effective_band === 'red'
   && missed.vetoes.includes('HIGH_MISS_RATE'),
  'missed-breach is FORCED to UNRELIABLE/red by HIGH_MISS_RATE despite the green number');

// 5b. A flapping verdict is untrustable no matter the rates.
const flapping = scoreFile(join(FX, 'flapping-checker.illustrative.json'));
ok(flapping.disposition === 'UNRELIABLE' && flapping.vetoes.includes('FLAPPING_VERDICT'),
  'flapping-checker is VETOED by FLAPPING_VERDICT');
ok(flapping.warnings.includes('ANY_MISS'), 'flapping-checker separately surfaces the single miss as ANY_MISS');

// 5c. An alarm storm (crying wolf) is vetoed even with zero misses.
const alarm = scoreFile(join(FX, 'alarm-storm.illustrative.json'));
ok(alarm.disposition === 'UNRELIABLE' && alarm.vetoes.includes('ALARM_STORM'),
  'alarm-storm is VETOED by ALARM_STORM despite missing no real defect');
ok(alarm.warnings.includes('SLOW_REVIEW') && alarm.warnings.includes('MULTI_LOOP')
   && alarm.warnings.includes('VERDICT_DRIFT'),
  'alarm-storm carries SLOW_REVIEW + MULTI_LOOP + VERDICT_DRIFT warnings');

// 5d. A review-thrash loop is vetoed; a tiny sample is warned as provisional.
const thrash = scoreFile(join(FX, 'thrash-lowsample.illustrative.json'));
ok(thrash.numeric_band === 'green' && thrash.disposition === 'UNRELIABLE'
   && thrash.vetoes.includes('REVIEW_THRASH'),
  'thrash-lowsample raw-green is FORCED UNRELIABLE by REVIEW_THRASH');
ok(thrash.warnings.includes('LOW_SAMPLE'),
  'thrash-lowsample is warned LOW_SAMPLE (5 episodes < 20 — score is provisional)');

// --- 6. human checklist matches enforced code (drift guard) ----------------
const checklist = JSON.parse(readFileSync(join(HERE, 'reliability-vetoes.json'), 'utf8'));
const codeVetoIds = new Set(VETOES.map((v) => v.id));
const docVetoIds = new Set(checklist.vetoes.map((v) => v.id));
ok(codeVetoIds.size === docVetoIds.size && [...codeVetoIds].every((id) => docVetoIds.has(id)),
  `checklist veto ids match code VETOES (${[...codeVetoIds].sort().join(',')})`);
const codeWarnIds = new Set(WARNINGS.map((w) => w.id));
const docWarnIds = new Set(checklist.warnings.map((w) => w.id));
ok(codeWarnIds.size === docWarnIds.size && [...codeWarnIds].every((id) => docWarnIds.has(id)),
  `checklist warning ids match code WARNINGS (${[...codeWarnIds].sort().join(',')})`);

// --- 7. determinism + monotonicity -----------------------------------------
const card = JSON.parse(readFileSync(join(FX, 'gold-checker.illustrative.json'), 'utf8'));
ok(computeScore(card).score === computeScore(card).score, 'scoring is deterministic');
const worse = { ...card, metrics: { ...card.metrics, miss_rate: 0.30 } };
const worseR = computeScore(worse);
ok(worseR.score < gold.score, 'raising miss_rate lowers the score');
ok(worseR.vetoes.includes('HIGH_MISS_RATE'), 'miss_rate>=0.2 trips the HIGH_MISS_RATE veto');

console.log('');
if (failures === 0) {
  console.log('CHECKER-RELIABILITY-SELFTEST: PASS');
  process.exit(0);
} else {
  console.log(`CHECKER-RELIABILITY-SELFTEST: FAIL (${failures})`);
  process.exit(1);
}
