#!/usr/bin/env node
// FounderGate — Worker Adapter Registry selftest (zero-dependency, offline).
//
// Research/data only: running this selftest installs nothing, fetches nothing,
// holds no credentials, and activates no application runtime.
//
// Proves the H35 acceptance criteria:
//   1. the registry envelope validates against registry.schema.json,
//   2. every embedded adapter descriptor validates against the LOCAL copy of the
//      H7 worker-adapter schema (registry conforms to the H7 shape),
//   3. the registry carries research_only/no_install/no_credentials/no_network_fetch = true,
//   4. lifecycle invariants: research|planned => status:planned + installed:false;
//      installed => status:real + installed:true (anti-fake-state; research != installed),
//   5. every descriptor is non-privileged, non-activating, and never self-merges
//      or self-clears a gate (constitution hard exclusions),
//   6. every NOT-installed worker keeps at least one founder gate + a stated install blocker,
//   7. the five surveyed workers are present and their ids line up with their descriptors,
//   8. NEGATIVE: a planned-but-installed registry is REJECTED, and a self-merge
//      descriptor is REJECTED (the validator actually bites).
//
// Run: node harness/adapters/registry/validate-registry.selftest.mjs
// Exit 0 = PASS (prints WORKER-ADAPTER-REGISTRY-SELFTEST: PASS); non-zero on any failure.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateRegistry, validateRegistryFile } from './validate-registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(HERE, 'worker-adapters.json');
const EMBEDDED_SCHEMA_PATH = join(HERE, 'worker-adapter.embedded.schema.json');

let failures = 0;
function ok(cond, msg) {
  if (cond) {
    console.log(`  PASS: ${msg}`);
  } else {
    failures += 1;
    console.log(`  FAIL: ${msg}`);
  }
}

const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
const embeddedSchema = JSON.parse(readFileSync(EMBEDDED_SCHEMA_PATH, 'utf8'));

// 1. envelope validates
{
  const { valid, errors } = validateRegistryFile(REGISTRY_PATH);
  ok(valid, `registry envelope validates${valid ? '' : ' — ' + errors.join('; ')}`);
}

// 2. every embedded descriptor validates against the local H7 schema copy
for (const entry of registry.adapters) {
  const errors = [];
  // Direct check against the embedded schema (independent of the envelope $ref).
  const probe = validateRegistry(entry.descriptor, embeddedSchema, HERE);
  ok(probe.valid, `descriptor '${entry.adapter_id}' conforms to the H7 shape${probe.valid ? '' : ' — ' + probe.errors.join('; ')}`);
  void errors;
}

// 3. registry-level research/no-install/no-credentials/no-network flags
ok(registry.research_only === true, 'registry.research_only === true');
ok(registry.no_install === true, 'registry.no_install === true');
ok(registry.no_credentials === true, 'registry.no_credentials === true');
ok(registry.no_network_fetch === true, 'registry.no_network_fetch === true');

// 4. lifecycle <-> status/installed invariant (anti-fake-state: research != installed)
for (const e of registry.adapters) {
  const d = e.descriptor;
  if (e.lifecycle === 'installed') {
    ok(d.status === 'real' && d.installed === true,
      `'${e.adapter_id}' installed lifecycle => status:real + installed:true`);
  } else {
    // research OR planned
    ok(d.status === 'planned' && d.installed === false,
      `'${e.adapter_id}' ${e.lifecycle} lifecycle => status:planned + installed:false (not-installed)`);
  }
}

// 5. hard-exclusion invariants on every descriptor
for (const e of registry.adapters) {
  const d = e.descriptor;
  ok(d.privileged_execution === false, `'${e.adapter_id}' privileged_execution === false`);
  ok(d.activates_runtime === false, `'${e.adapter_id}' activates_runtime === false`);
  ok(d.pr_handoff.merges === false, `'${e.adapter_id}' never self-merges`);
  ok(d.gate_report.never_self_clears === true, `'${e.adapter_id}' never self-clears a founder gate`);
  ok(d.proof_packet.docs_never_runtime === true, `'${e.adapter_id}' docs never counted as runtime`);
}

// 6. every NOT-installed worker keeps >=1 founder gate + a stated blocker
for (const e of registry.adapters) {
  ok(Array.isArray(e.founder_gates_before_install) && e.founder_gates_before_install.length >= 1,
    `'${e.adapter_id}' declares at least one founder gate before install`);
  if (e.lifecycle !== 'installed') {
    ok(Array.isArray(e.install_blockers) && e.install_blockers.length >= 1,
      `'${e.adapter_id}' (not-installed) states at least one honest install blocker`);
    ok(e.founder_gates_before_install.includes('install-approval'),
      `'${e.adapter_id}' (not-installed) requires an install-approval gate`);
  }
}

// 7. the five surveyed workers are present and ids line up
const ids = registry.adapters.map((e) => e.adapter_id).sort();
const expected = ['aider', 'claude-code', 'codex-style', 'openhands', 'swe-agent'];
ok(JSON.stringify(ids) === JSON.stringify(expected),
  `exactly the 5 surveyed workers present: [${ids.join(', ')}]`);
for (const e of registry.adapters) {
  ok(e.adapter_id === e.descriptor.adapter_id,
    `'${e.adapter_id}' entry id matches its descriptor id`);
}
// exactly one installed lifecycle (Claude Code, which is genuinely in-use here)
const installed = registry.adapters.filter((e) => e.lifecycle === 'installed');
ok(installed.length === 1 && installed[0].adapter_id === 'claude-code',
  'exactly one installed worker: claude-code');

// 8. NEGATIVE — the validator actually bites
{
  // 8a. planned-but-installed must be rejected (registry-level invariant via embedded schema)
  const bad = JSON.parse(JSON.stringify(registry));
  const aider = bad.adapters.find((e) => e.adapter_id === 'aider');
  aider.descriptor.installed = true; // planned + installed:true => schema invariant #2 violation
  const r1 = validateRegistry(bad);
  ok(!r1.valid, 'NEGATIVE: planned-but-installed descriptor is REJECTED');

  // 8b. self-merge must be rejected
  const bad2 = JSON.parse(JSON.stringify(registry));
  bad2.adapters[0].descriptor.pr_handoff.merges = true; // const:false violation
  const r2 = validateRegistry(bad2);
  ok(!r2.valid, 'NEGATIVE: self-merge (pr_handoff.merges:true) descriptor is REJECTED');

  // 8c. privileged execution must be rejected
  const bad3 = JSON.parse(JSON.stringify(registry));
  bad3.adapters[0].descriptor.privileged_execution = true;
  const r3 = validateRegistry(bad3);
  ok(!r3.valid, 'NEGATIVE: privileged_execution:true descriptor is REJECTED');

  // 8d. flipping research_only:false must be rejected
  const bad4 = JSON.parse(JSON.stringify(registry));
  bad4.research_only = false;
  const r4 = validateRegistry(bad4);
  ok(!r4.valid, 'NEGATIVE: research_only:false registry is REJECTED');
}

if (failures === 0) {
  console.log('WORKER-ADAPTER-REGISTRY-SELFTEST: PASS');
  process.exit(0);
}
console.log(`WORKER-ADAPTER-REGISTRY-SELFTEST: FAIL (${failures} failure(s))`);
process.exit(1);
