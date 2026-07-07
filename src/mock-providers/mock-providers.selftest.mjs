#!/usr/bin/env node
// FounderGate — Mock Provider Layer :: hermetic selftest (zero-dependency).
//
// SCAFFOLD ONLY — mock layer, NOT live; final cage claims require independent
// Checker + Advisor verification; mock ≠ live proof.
//
// Proves, with NO network and NO credentials, that the mock provider layer:
//   1. NEVER touches the network — a tripwire wraps every outbound primitive and
//      does not fire across a full sweep of every provider/action; AND the
//      tripwire has teeth (a deliberate fetch WOULD be caught).
//   2. Carries NO secret — the layer's own source files contain no real-looking
//      credential/token/apiKey values (static scan of this very tree).
//   3. Is DETERMINISTIC — the same input yields byte-identical output twice.
//   4. Is ALWAYS mock-labelled — every envelope passes auditEnvelope
//      (mock:true, live:false, sent:false, effect:'none', mock- id, HELD/MOCK_OK).
//   5. Has NO live path — a live:true request is REFUSED (MOCK_LIVE_PATH_ABSENT),
//      and no provider exposes a live:true flag or a real client.
//
// Run: node harness/mock-providers/mock-providers.selftest.mjs
// Exit 0 = PASS (prints MOCK-PROVIDERS-SELFTEST: PASS); non-zero on first failure.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  MOCK_PROVIDERS, PROVIDER_NAMES, dispatch, manifest, getMockProvider,
  installNetworkTripwire, auditEnvelope,
} from './index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let failures = 0;
function ok(cond, msg) {
  if (cond) { console.log(`  PASS: ${msg}`); }
  else { failures += 1; console.log(`  FAIL: ${msg}`); }
}

// A representative request per provider/action — enough to exercise every path.
const SWEEP = {
  email: { send: { to: 'x@example.invalid', subject: 'hi', body: 'b' }, listInbox: { limit: 2 }, createDraft: { to: 'y@example.invalid' } },
  sms: { send: { to: '+15550000', body: 'hello there' }, status: { smsId: 'mock-sms-1' } },
  calendar: { listEvents: { limit: 2 }, createEvent: { title: 'Sync' }, notify: { eventId: 'e1', response: 'yes' } },
  weather: { current: { location: 'Miami' }, forecast: { location: 'Miami', days: 3 } },
  maps: { geocode: { query: '1 Mock St' }, directions: { from: 'A', to: 'B' } },
  payment: { charge: { amount: 42, currency: 'USD' }, pay: { amount: 5 }, balance: { account: 'a1' } },
  notification: { notify: { channel: 'push', title: 'Hey' }, isRegistered: { token: 't' } },
};

// ---------------------------------------------------------------------------
// 0. Registry shape
// ---------------------------------------------------------------------------
const EXPECT = ['email', 'sms', 'calendar', 'weather', 'maps', 'payment', 'notification'];
ok(PROVIDER_NAMES.length === 7 && EXPECT.every((n) => PROVIDER_NAMES.includes(n)),
  `registry exposes all 7 providers (${PROVIDER_NAMES.join(', ')})`);
for (const name of EXPECT) {
  const p = getMockProvider(name);
  ok(p.mock === true && p.live === false, `provider "${name}" is mock:true, live:false`);
}

// ---------------------------------------------------------------------------
// 1. NO NETWORK — full sweep under the tripwire; it must not fire.
// ---------------------------------------------------------------------------
const wire = installNetworkTripwire();
let sweepEnvelopes = [];
try {
  for (const [prov, actions] of Object.entries(SWEEP)) {
    for (const [action, req] of Object.entries(actions)) {
      sweepEnvelopes.push([prov, action, dispatch(prov, action, req)]);
    }
  }
} finally {
  wire.restore();
}
ok(wire.fired() === false, `network tripwire did NOT fire across ${sweepEnvelopes.length} provider/action calls (zero network)`);

// 1b. Tripwire teeth — a deliberate fetch WOULD be caught.
const teeth = installNetworkTripwire();
let caught = false;
try { globalThis.fetch('https://example.invalid'); }
catch (e) { caught = e && e.code === 'MOCK_NETWORK_TRIPWIRE_FIRED'; }
finally { teeth.restore(); }
ok(caught === true, 'network tripwire has teeth (a deliberate fetch is caught)');

// ---------------------------------------------------------------------------
// 2. NO SECRET — static scan of the layer's own source for real-looking creds.
// ---------------------------------------------------------------------------
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.mjs$/.test(entry)) out.push(full);
  }
  return out;
}
const sourceFiles = walk(HERE);
// Real-looking secret assignments: KEY=<8+ non-placeholder chars>. Selftest excludes
// itself (it names the forbidden tokens on purpose, like ci-safety does).
const SECRET_RE = /(client_secret|access_token|refresh_token|api[_-]?key|apiKey|password|bearer)\s*[:=]\s*["']?[A-Za-z0-9._-]{8,}/i;
let secretHit = null;
for (const f of sourceFiles) {
  if (f.endsWith('mock-providers.selftest.mjs')) continue;
  const src = readFileSync(f, 'utf8');
  if (SECRET_RE.test(src)) { secretHit = f; break; }
}
ok(secretHit === null, `no real-looking secret/credential in layer source${secretHit ? ' — ' + secretHit : ''}`);

// ---------------------------------------------------------------------------
// 3. DETERMINISM — same input twice → byte-identical output.
// ---------------------------------------------------------------------------
let nonDeterministic = null;
for (const [prov, actions] of Object.entries(SWEEP)) {
  for (const [action, req] of Object.entries(actions)) {
    const a = JSON.stringify(dispatch(prov, action, req));
    const b = JSON.stringify(dispatch(prov, action, req));
    if (a !== b) { nonDeterministic = `${prov}.${action}`; break; }
  }
}
ok(nonDeterministic === null, `every provider/action is deterministic (same input → same output)${nonDeterministic ? ' — ' + nonDeterministic : ''}`);

// ---------------------------------------------------------------------------
// 4. ALWAYS MOCK-LABELLED — every envelope passes auditEnvelope.
// ---------------------------------------------------------------------------
let badEnvelope = null;
for (const [prov, action, env] of sweepEnvelopes) {
  const problems = auditEnvelope(env);
  if (problems.length) { badEnvelope = `${prov}.${action}: ${problems.join(', ')}`; break; }
}
ok(badEnvelope === null, `every envelope is mock:true/live:false/sent:false/effect:none${badEnvelope ? ' — ' + badEnvelope : ''}`);

// 4b. HELD semantics — send/charge/call/notify/pay/delete are HELD, never enacted.
const held = sweepEnvelopes.filter(([, a]) => ['send', 'charge', 'pay', 'notify'].includes(a));
ok(held.length > 0 && held.every(([, , env]) => env.status === 'HELD' && env.held === true && env.sent === false),
  `all ${held.length} money/message actions are HELD (nothing sent, nothing charged)`);

// ---------------------------------------------------------------------------
// 5. NO LIVE PATH — a live request is REFUSED; no provider offers a live client.
// ---------------------------------------------------------------------------
let refusedCount = 0;
for (const variant of [{ live: true }, { real: true }, { sent: true }, { mode: 'live' }, { mode: 'real' }]) {
  try {
    dispatch('payment', 'charge', { amount: 1, ...variant });
  } catch (e) {
    if (e && e.code === 'MOCK_LIVE_PATH_ABSENT') refusedCount += 1;
  }
}
ok(refusedCount === 5, `every live-effect request is refused with MOCK_LIVE_PATH_ABSENT (${refusedCount}/5)`);

// 5b. No provider descriptor advertises a live client or a truthy live flag.
const anyLive = Object.values(MOCK_PROVIDERS).some(
  (p) => p.live === true || 'client' in p || 'credentials' in p || 'apiKey' in p,
);
ok(anyLive === false, 'no provider advertises live:true / client / credentials / apiKey (live path absent)');

// 5c. Unknown provider/action are surfaced as explicit errors (fail-closed).
let unknownProv = false, unknownAction = false;
try { dispatch('__nope__', 'x', {}); } catch (e) { unknownProv = e.code === 'MOCK_PROVIDER_UNKNOWN'; }
try { dispatch('email', '__nope__', {}); } catch (e) { unknownAction = e.code === 'MOCK_ACTION_UNKNOWN'; }
ok(unknownProv && unknownAction, 'unknown provider/action fail closed with explicit error codes');

// ---------------------------------------------------------------------------
// manifest sanity
// ---------------------------------------------------------------------------
const man = manifest();
ok(man.length === 7 && man.every((m) => m.mock === true && m.live === false && m.actions.length >= 2),
  'manifest reports 7 mock providers, all live:false, each with >=2 actions');

// ---------------------------------------------------------------------------
if (failures === 0) {
  console.log('\nMOCK-PROVIDERS-SELFTEST: PASS');
  process.exit(0);
} else {
  console.log(`\nMOCK-PROVIDERS-SELFTEST: FAIL (${failures} failing assertion(s))`);
  process.exit(1);
}
