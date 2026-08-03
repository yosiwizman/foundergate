// Evidence Packet v1 validator self-test (zero-dep, deterministic).
import { validateEvidencePacket } from '../../src/evidence_packet/evidence-packet-v1.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL: ' + m); } };

for (const f of ['safe.sample.json', 'risky.sample.json', 'blocked.sample.json']) {
  const r = validateEvidencePacket(JSON.parse(readFileSync(join(here, f), 'utf8')));
  ok(r.valid, `${f} valid (${r.errors.join('; ')})`);
}
// malformed rejected
ok(!validateEvidencePacket({}).valid, 'empty object rejected');
ok(!validateEvidencePacket({ packet_version: 'v1', checker_verdict: 'SHIP' }).valid, 'SHIP verdict rejected');
// never_ship enforced
const bad = JSON.parse(readFileSync(join(here, 'safe.sample.json'), 'utf8')); bad.owner_gate.never_ship = false;
ok(!validateEvidencePacket(bad).valid, 'never_ship=false rejected');
// forbidden real content rejected
const leak = JSON.parse(readFileSync(join(here, 'safe.sample.json'), 'utf8')); leak.task_intent = 'includes real customer data';
ok(!validateEvidencePacket(leak).valid, 'real customer content rejected');

const total = pass + fail;
if (fail === 0) { console.log(`ALL GREEN: ${pass}/${total} evidence-packet self-test(s) passed.`); process.exit(0); }
else { console.error(`RED: ${fail}/${total} failed.`); process.exit(1); }
