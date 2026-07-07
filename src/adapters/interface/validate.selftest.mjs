#!/usr/bin/env node
// FounderGate — Worker Adapter Descriptor validator selftest (zero-dependency).
//
// Proves the H7 acceptance criteria:
//   1. the validator ACCEPTS every descriptor under examples/ (real + planned),
//   2. the validator REJECTS every malformed descriptor under examples/invalid/,
//   3. the REAL adapter (Claude Code) is status:real + installed:true,
//   4. the PLANNED adapters (Aider, OpenHands) are status:planned + installed:false
//      (anti-fake-state: an unbuilt integration can never claim to be installed),
//   5. the no-self-merge invariant is enforced (a descriptor with pr_handoff.merges:true is rejected),
//   6. the no-privileged-execution invariant is enforced,
//   7. the real-vs-planned invariant is enforced (planned + installed:true is rejected).
//
// Run: node harness/adapters/interface/validate.selftest.mjs
// Exit 0 = PASS (prints WORKER-ADAPTER-SELFTEST: PASS); non-zero on first failure.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateDescriptor, validateFile } from './validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EX = join(HERE, 'examples');
const INVALID = join(EX, 'invalid');

let failures = 0;
function ok(cond, msg) {
  if (cond) {
    console.log(`  PASS: ${msg}`);
  } else {
    failures += 1;
    console.log(`  FAIL: ${msg}`);
  }
}

const validFiles = readdirSync(EX).filter((f) => f.endsWith('.json'));
const invalidFiles = readdirSync(INVALID).filter((f) => f.endsWith('.json'));

// 1. every top-level example is VALID
ok(validFiles.length >= 3, `found ${validFiles.length} valid example(s) (>=3 expected)`);
for (const f of validFiles) {
  const { valid, errors } = validateFile(join(EX, f));
  ok(valid, `ACCEPT ${f}${valid ? '' : ' — ' + errors.join('; ')}`);
}

// 2. every invalid example is REJECTED
ok(invalidFiles.length >= 5, `found ${invalidFiles.length} malformed example(s) (>=5 expected)`);
for (const f of invalidFiles) {
  const { valid } = validateFile(join(INVALID, f));
  ok(!valid, `REJECT ${f}`);
}

// 3. the REAL adapter is status:real + installed:true
const claude = JSON.parse(readFileSync(join(EX, 'claude-code.real.json'), 'utf8'));
ok(claude.status === 'real' && claude.installed === true && claude.worker_name === 'Claude Code',
  'REAL adapter Claude Code is status:real, installed:true');
ok(claude.pr_handoff.merges === false && claude.privileged_execution === false && claude.activates_runtime === false,
  'REAL adapter never merges, never privileged-executes, never activates runtime');

// 4. the PLANNED adapters are status:planned + installed:false (anti-fake-state)
for (const f of ['aider.planned.json', 'openhands.planned.json']) {
  const d = JSON.parse(readFileSync(join(EX, f), 'utf8'));
  ok(d.status === 'planned' && d.installed === false, `PLANNED adapter ${f} is status:planned, installed:false`);
}

// 5. MUTATION-REJECT: a descriptor that claims to self-merge is rejected
const selfMerge = { ...claude, pr_handoff: { ...claude.pr_handoff, merges: true } };
ok(!validateDescriptor(selfMerge).valid, 'MUTATION-REJECT: pr_handoff.merges:true (self-merge) is rejected');

// 6. MUTATION-REJECT: a descriptor claiming privileged execution is rejected
const priv = { ...claude, privileged_execution: true };
ok(!validateDescriptor(priv).valid, 'MUTATION-REJECT: privileged_execution:true is rejected');

// 7. MUTATION-REJECT: real-vs-planned invariant — planned + installed:true is rejected
const fakeInstalled = { ...claude, status: 'planned', installed: true };
ok(!validateDescriptor(fakeInstalled).valid, 'MUTATION-REJECT: status:planned + installed:true (fake state) is rejected');

// 8. MUTATION-REJECT: docs counted as runtime is rejected
const docsRuntime = { ...claude, proof_packet: { ...claude.proof_packet, docs_never_runtime: false } };
ok(!validateDescriptor(docsRuntime).valid, 'MUTATION-REJECT: proof_packet.docs_never_runtime:false is rejected');

console.log('');
if (failures === 0) {
  console.log('WORKER-ADAPTER-SELFTEST: PASS');
  process.exit(0);
} else {
  console.log(`WORKER-ADAPTER-SELFTEST: FAIL (${failures})`);
  process.exit(1);
}
