#!/usr/bin/env node
// FounderGate — Held Action Sink selftest (zero-dependency, offline). SCAFFOLD ONLY.
//
// Proves the held-action cage contract:
//   1. holdAction() yields a schema-valid HELD record (status held, sent/live/
//      dispatchable false, transport_call_count 0).
//   2. attemptSend() — the "send" seam — deterministically yields HELD, not sent.
//   3. An injected transport SPY is called 0 times across both entry points.
//   4. Every fixture under fixtures/ is ACCEPTED by the validator; the
//      over-claiming record under fixtures/invalid/ is REJECTED.
//   5. A mutated record that flips sent/live/dispatchable/transport_call_count is
//      REJECTED (the const invariants actually bite).
//   6. writeHeldAction() records to a LOCAL harness outbox only, and REFUSES a
//      protected-store / absolute-outside / tree-escaping path.
//
// HELD is NOT SENT and is NOT live proof. This selftest exercises harness logic
// only — no provider, no network, no secret, no protected-store write. Final cage claims
// still require independent Checker + Advisor verification and are NOT
// self-certified here.
//
// Run: node src/held-actions/hold-action.selftest.mjs
// Exit 0 = PASS (prints HELD-ACTION-SELFTEST: PASS); non-zero on first failure.

import { readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  holdAction,
  attemptSend,
  writeHeldAction,
  validateHeldAction,
  HELD_ACTION_SCHEMA_VERSION,
} from './hold-action.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, 'fixtures');
const INVALID = join(FIX, 'invalid');
const TMP_OUTBOX = join(HERE, 'fixtures', '_selftest_tmp_outbox');

let failures = 0;
function ok(cond, msg) {
  if (cond) {
    console.log(`  PASS: ${msg}`);
  } else {
    failures += 1;
    console.log(`  FAIL: ${msg}`);
  }
}

// A transport spy that records every call. The sink must NEVER call it.
let transportCalls = 0;
const transportSpy = (...args) => { transportCalls += 1; return { sentFakely: true, args }; };

// 1. holdAction yields a schema-valid HELD record.
const held = holdAction(
  { channel: 'email-gmail', intent: 'reply to a thread', payload: 'secret body text' },
  { transport: transportSpy },
);
ok(held.status === 'held', 'holdAction status is "held"');
ok(held.sent === false, 'holdAction sent is false');
ok(held.live === false, 'holdAction live is false');
ok(held.dispatchable === false, 'holdAction dispatchable is false');
ok(held.transport_call_count === 0, 'holdAction transport_call_count is 0');
ok(held.schema_version === HELD_ACTION_SCHEMA_VERSION, 'holdAction stamps the schema version');
ok(/^[0-9a-f]{64}$/.test(held.payload_digest), 'payload recorded as a sha256 digest, never raw');
ok(!JSON.stringify(held).includes('secret body text'), 'raw payload never appears in the record');
ok(validateHeldAction(held).valid, 'holdAction record is schema-valid');

// 2. attemptSend — the "send" seam — yields HELD, not sent.
const attempted = attemptSend(
  { channel: 'whatsapp', intent: 'send a message' },
  { transport: transportSpy },
);
ok(attempted.status === 'held' && attempted.sent === false,
  'attemptSend yields HELD (status held, sent false) — a send attempt cannot send');
ok(validateHeldAction(attempted).valid, 'attemptSend record is schema-valid');

// 3. The injected transport spy was called 0 times across BOTH entry points.
ok(transportCalls === 0, 'injected transport spy invoked 0 times (sink has no send path)');

// 4. Fixtures accept / invalid reject.
const goodFixtures = readdirSync(FIX).filter((f) => f.endsWith('.json'));
ok(goodFixtures.length >= 2, `found ${goodFixtures.length} valid fixture(s) (>=2 expected)`);
for (const f of goodFixtures) {
  const rec = JSON.parse(readFileSync(join(FIX, f), 'utf8'));
  ok(validateHeldAction(rec).valid, `ACCEPT fixture ${f}`);
}
const badFixtures = existsSync(INVALID)
  ? readdirSync(INVALID).filter((f) => f.endsWith('.json'))
  : [];
ok(badFixtures.length >= 1, `found ${badFixtures.length} invalid fixture(s) (>=1 expected)`);
for (const f of badFixtures) {
  const rec = JSON.parse(readFileSync(join(INVALID, f), 'utf8'));
  ok(!validateHeldAction(rec).valid, `REJECT invalid fixture ${f}`);
}

// 5. Const invariants actually bite: flipping any of them is rejected.
for (const flip of [
  { sent: true },
  { live: true },
  { dispatchable: true },
  { status: 'sent' },
  { transport_call_count: 1 },
]) {
  const mutant = { ...held, ...flip };
  ok(!validateHeldAction(mutant).valid,
    `MUTATION-REJECT: ${JSON.stringify(flip)} is rejected by the schema`);
}

// 6. writeHeldAction records LOCAL only, and refuses forbidden paths.
try {
  const written = writeHeldAction(held, { outboxDir: TMP_OUTBOX });
  ok(existsSync(written), `writeHeldAction records to a LOCAL harness outbox (${written.replace(HERE, '<harness>')})`);
  const roundtrip = JSON.parse(readFileSync(written, 'utf8'));
  ok(validateHeldAction(roundtrip).valid && roundtrip.sent === false,
    'round-tripped file is still HELD and schema-valid');
} finally {
  if (existsSync(TMP_OUTBOX)) rmSync(TMP_OUTBOX, { recursive: true, force: true });
}

function refuses(outboxDir, label) {
  let threw = false;
  try { writeHeldAction(held, { outboxDir }); } catch { threw = true; }
  ok(threw, `writeHeldAction REFUSES ${label}`);
}
refuses('/etc/some-outbox', 'an absolute path outside the harness tree');
refuses('.private-store/outbox', 'a relative protected-store path');
refuses('provider-connect/outbox', 'a provider-connect path');
refuses('../../secrets', 'a tree-escaping (..) path');
refuses('../provider-store/outbox', 'a provider-store path (tree-escaping + protected)');

console.log('');
if (failures === 0) {
  console.log('HELD-ACTION-SELFTEST: PASS');
  process.exit(0);
} else {
  console.log(`HELD-ACTION-SELFTEST: FAIL (${failures})`);
  process.exit(1);
}
