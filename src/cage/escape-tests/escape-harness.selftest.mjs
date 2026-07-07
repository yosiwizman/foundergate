#!/usr/bin/env node
// FounderGate — Cage escape-test harness + selftest (zero-dependency, offline, hermetic).
//
// SCAFFOLD ONLY — red-team fixtures/spec, NOT a live-cage proof; final cage claims require
// independent Checker + Advisor verification. A hermetic/mock deny is NEVER live proof that a real
// network, host path, container socket, secret store, or provider is actually blocked.
//
// WHAT THIS RUNS (the SAFE/hermetic subset only):
//   For each red-team fixture under ./fixtures, this harness drives the PURE mock cage model
//   (cage-escape-model.mjs) and asserts:
//     1. the OFF (deny-by-default) posture DENIES/REFUSES the adversarial request, and
//     2. the "teeth" probe — an explicit founder allow-rule — routes ONLY to HELD (never live),
//        proving the deny is conditional logic, not a stub that always throws.
//   The secrets-absent class additionally scans a controlled env fixture (value-free) and does a
//   read-only, advisory, value-free scan of the REAL process.env (never fails CI; never prints a
//   value).
//
// WHAT THIS DOES **NOT** RUN (privileged; delivered as fixture + spec + GATE):
//   The real mechanical checks — opening a socket, reading a real host path, connecting to the
//   real container-engine socket, booting the real secret store, or firing a real provider — are
//   privileged/live and OUT OF SCOPE here. Each fixture carries a privileged_mechanical_check with
//   gate:true; this harness prints a GATE REPORT line for each and asserts the gate is declared.
//
// Run: node harness/cage/escape-tests/escape-harness.selftest.mjs
// Exit 0 = PASS (prints CAGE-ESCAPE-SELFTEST: PASS); non-zero on first failure.
//
// Programmatic: import { runHermeticChecks } from './escape-harness.selftest.mjs'

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { evaluate, offPolicy, scanForSecretNames, DECISION } from './cage-escape-model.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');

const REQUIRED_CLASSES = [
  'network-denied',
  'secrets-absent',
  'host-path-denied',
  'docker-socket-denied',
  'live-provider-denied',
];

function loadFixtures() {
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.fixture.json'));
  return files.map((f) => ({ file: f, doc: JSON.parse(readFileSync(join(FIXTURES, f), 'utf8')) }));
}

// The hermetic SAFE check for one fixture. Returns { checks: [{ok,msg}], gate: {...} }.
export function runHermeticChecks(fx) {
  const doc = fx.doc;
  const checks = [];
  const push = (ok, msg) => checks.push({ ok, msg });

  switch (doc.class) {
    case 'network-denied': {
      const off = evaluate(doc.request, offPolicy());
      push(off.decision === DECISION.DENIED && off.reason === doc.expected.reason_code,
        `${fx.file}: OFF posture DENIES egress (${off.decision}/${off.reason})`);
      const armed = evaluate(doc.request, offPolicy({ allowlist: doc.teeth_probe.armed_allowlist }));
      push(armed.decision === DECISION.HELD,
        `${fx.file}: teeth — an allow-rule routes egress only to HELD, never live (${armed.decision})`);
      break;
    }
    case 'host-path-denied': {
      const off = evaluate(doc.request, offPolicy());
      push(off.decision === DECISION.DENIED && off.reason === doc.expected.reason_code,
        `${fx.file}: OFF posture DENIES out-of-cage-root read (${off.decision}/${off.reason})`);
      const armedReq = { action_class: 'host-path-read', target: doc.teeth_probe.armed_target };
      const armed = evaluate(armedReq, offPolicy({ allowlist: doc.teeth_probe.armed_allowlist }));
      push(armed.decision === DECISION.HELD,
        `${fx.file}: teeth — an in-root allow-listed path routes only to HELD (${armed.decision})`);
      break;
    }
    case 'docker-socket-denied': {
      const off = evaluate(doc.request, offPolicy());
      push(off.decision === DECISION.DENIED && off.reason === doc.expected.reason_code,
        `${fx.file}: OFF posture DENIES control-socket connect (${off.decision}/${off.reason})`);
      const armed = evaluate(doc.request, offPolicy({ allowlist: doc.teeth_probe.armed_allowlist }));
      push(armed.decision === DECISION.HELD,
        `${fx.file}: teeth — an allow-rule routes control-socket only to HELD (${armed.decision})`);
      break;
    }
    case 'live-provider-denied': {
      const off = evaluate(doc.request, offPolicy());
      push(off.decision === DECISION.REFUSED && off.reason === doc.expected.reason_code,
        `${fx.file}: OFF posture REFUSES provider dispatch into the sink (${off.decision}/${off.reason})`);
      const armed = evaluate(doc.request, offPolicy({
        posture: doc.teeth_probe.armed_posture,
        allowlist: doc.teeth_probe.armed_allowlist,
      }));
      push(armed.decision === DECISION.HELD,
        `${fx.file}: teeth — ARMED + allow-listed dispatch reaches only HELD, never fired (${armed.decision})`);
      break;
    }
    case 'secrets-absent': {
      const r = scanForSecretNames(doc.hermetic_env_fixture, doc.secret_shaped_names);
      push(r.absent,
        `${fx.file}: controlled env fixture holds NO secret-shaped name` +
        (r.absent ? '' : ` (present: ${r.present.join(',')})`));
      // Advisory-only, value-free scan of the REAL environment. Never fails; never prints a value.
      const real = scanForSecretNames(process.env, doc.secret_shaped_names);
      push(true,
        `${fx.file}: advisory real-env scan (value-free) — matched secret-shaped NAMES: ` +
        (real.present.length ? real.present.join(',') : '(none)') +
        ' [advisory only; presence of a name is not a cage breach and never fails this check]');
      break;
    }
    default:
      push(false, `${fx.file}: unknown fixture class "${doc.class}"`);
  }

  return { checks, gate: doc.privileged_mechanical_check };
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  let failures = 0;
  const ok = (cond, msg) => {
    if (cond) console.log(`  PASS: ${msg}`);
    else { failures += 1; console.log(`  FAIL: ${msg}`); }
  };

  console.log('== H45 cage escape-tests — HERMETIC (SAFE) subset ==');
  const fixtures = loadFixtures();
  ok(fixtures.length >= 5, `found ${fixtures.length} red-team fixture(s) (>=5 expected)`);

  const seenClasses = new Set();
  const gates = [];
  for (const fx of fixtures) {
    const doc = fx.doc;
    // Every fixture must self-declare it is a scaffold/describes-only, and carry a gated
    // privileged check + a truth note (honesty invariants — mirrors the H38 pattern).
    ok(doc.describes_only === true, `${fx.file}: describes_only:true (fixture is a scaffold, not a live cage)`);
    ok(doc.privileged_mechanical_check && doc.privileged_mechanical_check.gate === true,
      `${fx.file}: privileged_mechanical_check.gate:true (real mechanical check is founder-gated)`);
    ok(doc.privileged_mechanical_check &&
       doc.privileged_mechanical_check.independent_verification === 'independent-checker-and-advisor-required',
      `${fx.file}: requires independent-checker-and-advisor verification (not self-certified)`);
    ok(typeof doc.truth_note === 'string' &&
       /\b(not|never)\b/i.test(doc.truth_note) && /\b(live|proof|sent|delivered)\b/i.test(doc.truth_note),
      `${fx.file}: truth_note states a hermetic result is NOT live proof`);

    const { checks, gate } = runHermeticChecks(fx);
    for (const c of checks) ok(c.ok, c.msg);
    if (gate) gates.push({ class: doc.class, what: gate.what, requires: gate.requires });
    seenClasses.add(doc.class);
  }

  for (const c of REQUIRED_CLASSES) ok(seenClasses.has(c), `escape class covered by a fixture: ${c}`);

  console.log('');
  console.log('== GATE REPORT — privileged mechanical checks NOT run here (founder-gated) ==');
  for (const g of gates) {
    console.log(`  GATE [${g.class}] requires ${g.requires}: ${g.what}`);
  }
  console.log('  GATE: every mechanical (live-cage) check above requires founder-gated privileged');
  console.log('        execution AND independent Checker + Advisor verification before any');
  console.log('        "cage blocks X" claim. This harness proves only the HERMETIC deny-logic shape.');

  console.log('');
  if (failures === 0) {
    console.log('CAGE-ESCAPE-SELFTEST: PASS');
    console.log('NOTE: SCAFFOLD ONLY — hermetic deny-logic shape only; NOT self-certified; caged/held/mocked is NOT live proof.');
    process.exit(0);
  } else {
    console.log(`CAGE-ESCAPE-SELFTEST: FAIL (${failures})`);
    process.exit(1);
  }
}
