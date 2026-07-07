#!/usr/bin/env node
// FounderGate — Checker Reliability Scorer (zero-dependency, offline).
//
// Answers a question NO other harness layer asks: given a checker (an advisor
// verdict producer, a Copilot review pass, a proof-verifier lane), how much can
// we TRUST it? H11 scores how good the WRITER lane's process was; H6 records the
// advisor's verdict. Neither asks whether the reviewer ITSELF is any good. Two
// checkers can both look busy and green while one quietly misses real breaches
// or flips its verdict on re-run. This scorer turns checker behaviour over a
// labelled sample into one number, a band, and — crucially — an anti-trust VETO
// layer so a checker cannot look reliable by nailing the cheap metrics (fast,
// few loops, low false-positive) while a disqualifier (real misses, a flapping
// verdict) hides beneath.
//
// It is harness data tooling only. It never touches application runtime, never runs a
// provider, never installs anything, never hits the network. A scorecard / doc
// is never counted as runtime capability (Wave-6 gate-to-gate contract §3).
//
// Usage:
//   node score.mjs <scorecard.json> [more.json ...]   -> score given files
//   node score.mjs                                     -> score all fixtures/*.json
//   import { computeScore, scoreFile, MODEL } from './score.mjs'
//
// Source of truth: MODEL (weights + sub-score curves) and VETOES/WARNINGS below.
// checker-reliability.schema.json constrains SHAPE; reliability-vetoes.json is
// the human-auditable copy of VETOES/WARNINGS (the selftest asserts they match).

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(HERE, 'checker-reliability.schema.json');

// ---------------------------------------------------------------------------
// Minimal JSON-Schema-subset validator (type/enum/const/required/properties/
// additionalProperties/pattern/minLength/maxLength/minimum/maximum). Kept inline
// so the scorer has zero dependencies, matching a static/offline posture.
// ---------------------------------------------------------------------------
function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}
function typeMatches(value, type) {
  const t = typeOf(value);
  if (type === 'number') return t === 'number' || t === 'integer';
  if (type === 'integer') return t === 'integer';
  return t === type;
}
function check(value, s, path, errors) {
  if (s === true || s === undefined) return;
  if (s === false) { errors.push(`${path}: schema is false`); return; }
  if (s.type !== undefined) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    if (!types.some((t) => typeMatches(value, t))) {
      errors.push(`${path}: expected type ${types.join('|')}, got ${typeOf(value)}`);
      return;
    }
  }
  if (Object.prototype.hasOwnProperty.call(s, 'const') &&
      JSON.stringify(value) !== JSON.stringify(s.const)) {
    errors.push(`${path}: must equal const ${JSON.stringify(s.const)}`);
  }
  if (Array.isArray(s.enum) &&
      !s.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push(`${path}: ${JSON.stringify(value)} not in enum [${s.enum.join(', ')}]`);
  }
  const t = typeOf(value);
  if (t === 'string') {
    if (typeof s.minLength === 'number' && value.length < s.minLength)
      errors.push(`${path}: shorter than minLength ${s.minLength}`);
    if (typeof s.maxLength === 'number' && value.length > s.maxLength)
      errors.push(`${path}: longer than maxLength ${s.maxLength}`);
    if (typeof s.pattern === 'string' && !new RegExp(s.pattern).test(value))
      errors.push(`${path}: does not match /${s.pattern}/`);
  }
  if (t === 'number' || t === 'integer') {
    if (typeof s.minimum === 'number' && value < s.minimum)
      errors.push(`${path}: ${value} < minimum ${s.minimum}`);
    if (typeof s.maximum === 'number' && value > s.maximum)
      errors.push(`${path}: ${value} > maximum ${s.maximum}`);
  }
  if (t === 'object') {
    if (Array.isArray(s.required))
      for (const req of s.required)
        if (!Object.prototype.hasOwnProperty.call(value, req))
          errors.push(`${path}: missing required property '${req}'`);
    const props = s.properties || {};
    if (s.additionalProperties === false)
      for (const key of Object.keys(value))
        if (!Object.prototype.hasOwnProperty.call(props, key))
          errors.push(`${path}: additional property '${key}' is not allowed`);
    for (const [key, subschema] of Object.entries(props))
      if (Object.prototype.hasOwnProperty.call(value, key))
        check(value[key], subschema, `${path}.${key}`, errors);
  }
}
export function validateScorecard(card, schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))) {
  const errors = [];
  check(card, schema, '$', errors);
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Scoring model. Each metric maps a raw value -> sub-score in [0,1] via a curve,
// then the weighted sum (weights total 1.0) -> a 0..100 score. miss_rate carries
// the most weight because a checker that passes real defects is the most
// dangerous kind of checker; the cheap "looks busy" metrics carry the least.
// ---------------------------------------------------------------------------
// Piecewise "lower is better" step curve: raw <= bound[i] -> value[i].
function stepDown(raw, bounds, values, floor) {
  for (let i = 0; i < bounds.length; i += 1) if (raw <= bounds[i]) return values[i];
  return floor;
}
function mapEnum(value, table, fallback = 0) {
  return Object.prototype.hasOwnProperty.call(table, value) ? table[value] : fallback;
}
// Linear "lower is better" over a [0,1] rate: 0 -> 1.0, 1 -> 0.0, clamped.
function invRate(raw) { return Math.max(0, Math.min(1, 1 - raw)); }

export const MODEL = {
  weights: {
    miss_rate: 0.35,
    false_positive_rate: 0.25,
    verdict_stability: 0.20,
    loop_count: 0.12,
    review_latency: 0.08,
  },
  bands: { green: 85, yellow: 70 }, // >=green green; >=yellow yellow; else red
  sub: {
    // A missed real defect is the gravest checker failure — square the penalty so
    // even a modest miss_rate bleeds sub-score faster than a linear curve would.
    miss_rate: (m) => invRate(m.miss_rate) ** 2,
    false_positive_rate: (m) => invRate(m.false_positive_rate),
    verdict_stability: (m) => mapEnum(m.verdict_stability,
      { deterministic: 1.0, mostly_stable: 0.6, flapping: 0.1 }),
    loop_count: (m) => stepDown(m.loop_count, [0, 1, 2, 3], [1.0, 0.8, 0.55, 0.3], 0.1),
    review_latency: (m) => stepDown(m.review_latency, [5, 30, 120, 300], [1.0, 0.85, 0.6, 0.35], 0.15),
  },
};

// ---------------------------------------------------------------------------
// Anti-trust VETOES (hard) + WARNINGS (soft). Mirrors reliability-vetoes.json;
// the selftest asserts the id sets match so the human copy cannot silently drift
// from the enforced code. A single veto forces the disposition to UNRELIABLE and
// the effective band to red, no matter how high the number climbed on the cheap
// "fast and quiet" metrics.
// ---------------------------------------------------------------------------
export const VETOES = [
  { id: 'HIGH_MISS_RATE', test: (m) => m.miss_rate >= 0.2 },
  { id: 'FLAPPING_VERDICT', test: (m) => m.verdict_stability === 'flapping' },
  { id: 'ALARM_STORM', test: (m) => m.false_positive_rate >= 0.5 },
  { id: 'REVIEW_THRASH', test: (m) => m.loop_count >= 5 },
];
export const WARNINGS = [
  { id: 'ELEVATED_FALSE_POSITIVE', test: (m) => m.false_positive_rate >= 0.25 && m.false_positive_rate < 0.5 },
  { id: 'ANY_MISS', test: (m) => m.miss_rate > 0 && m.miss_rate < 0.2 },
  { id: 'VERDICT_DRIFT', test: (m) => m.verdict_stability === 'mostly_stable' },
  { id: 'SLOW_REVIEW', test: (m) => m.review_latency > 120 },
  { id: 'MULTI_LOOP', test: (m) => m.loop_count >= 3 && m.loop_count < 5 },
  { id: 'LOW_SAMPLE', test: (m, card) => card.sample.episodes < 20 },
];

function bandFor(score) {
  if (score >= MODEL.bands.green) return 'green';
  if (score >= MODEL.bands.yellow) return 'yellow';
  return 'red';
}

export function computeScore(card) {
  const { valid, errors } = validateScorecard(card);
  if (!valid) return { valid: false, errors };
  const m = card.metrics;
  const subscores = {};
  let weighted = 0;
  for (const [metric, weight] of Object.entries(MODEL.weights)) {
    const s = MODEL.sub[metric](m);
    subscores[metric] = Number(s.toFixed(4));
    weighted += weight * s;
  }
  const score = Math.round(weighted * 100);
  const numeric_band = bandFor(score);
  const vetoes = VETOES.filter((v) => v.test(m, card)).map((v) => v.id);
  const warnings = WARNINGS.filter((w) => w.test(m, card)).map((w) => w.id);
  const disposition = vetoes.length > 0 ? 'UNRELIABLE' : (numeric_band === 'red' ? 'BELOW_BAR' : 'RELIABLE');
  const effective_band = vetoes.length > 0 ? 'red' : numeric_band;
  return {
    valid: true,
    checker_id: card.checker_id,
    sample: card.sample,
    head_sha: card.head_sha,
    label: card.label,
    score,
    numeric_band,
    effective_band,
    disposition,
    vetoes,
    warnings,
    subscores,
  };
}

export function scoreFile(path, schema) {
  let parsed;
  try { parsed = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { return { valid: false, errors: [`$: not parseable JSON — ${e.message}`] }; }
  return computeScore(parsed, schema);
}

// CLI
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  let files = process.argv.slice(2);
  if (files.length === 0) {
    const fxDir = join(HERE, 'fixtures');
    files = readdirSync(fxDir).filter((f) => f.endsWith('.json'))
      .map((f) => join(fxDir, f));
  }
  let bad = 0;
  for (const f of files) {
    const r = scoreFile(f);
    if (!r.valid) {
      bad += 1;
      console.log(`INVALID ${f}`);
      for (const e of r.errors) console.log(`        - ${e}`);
      continue;
    }
    const flags = [
      r.vetoes.length ? `VETO[${r.vetoes.join(',')}]` : '',
      r.warnings.length ? `WARN[${r.warnings.join(',')}]` : '',
    ].filter(Boolean).join(' ');
    console.log(
      `${String(r.score).padStart(3)}/100  ${r.effective_band.toUpperCase().padEnd(6)} ` +
      `${r.disposition.padEnd(10)} ${r.checker_id}` +
      (flags ? `  ${flags}` : ''),
    );
  }
  process.exit(bad === 0 ? 0 : 1);
}
