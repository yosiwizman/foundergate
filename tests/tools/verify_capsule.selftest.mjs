// Self-test for the standalone capsule verifier. Builds a synthetic VALID capsule (expect PASS) and several
// TAMPERED capsules (expect FAIL), using only Node built-ins + OS zip tools. Zero third-party deps.
import { verifyCapsule } from '../../tools/evidence/verify_capsule.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

let p = 0, f = 0; const ok = (c, m) => { if (c) { p++; console.log('OK   ' + m); } else { f++; console.log('BAD  ' + m); } };
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const zip = (dir, name, out) => execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', join(dir, name), out]);

function buildCapsule(work, { tamper } = {}) {
  // inner payload with a trivial passing selftest + SHA256SUMS
  const innerName = 'InnerPayload_test';
  const innerDir = join(work, 'i'); mkdirSync(join(innerDir, innerName, 'tests', 'repo_intake'), { recursive: true });
  writeFileSync(join(innerDir, innerName, 'tests', 'repo_intake', 'ok.selftest.mjs'), 'process.exit(0);');
  writeFileSync(join(innerDir, innerName, 'note.txt'), 'hello');
  // SHA256SUMS relative to innerName root
  const rel = ['note.txt', 'tests/repo_intake/ok.selftest.mjs'];
  let sums = rel.map((r) => `${sha(readFileSync(join(innerDir, innerName, r)))}  ${r}`).join('\n') + '\n';
  if (tamper === 'inner_sums') sums = sums.replace(/^[0-9a-f]{64}/, 'f'.repeat(64));
  writeFileSync(join(innerDir, innerName, 'SHA256SUMS.txt'), sums);
  const innerZip = join(work, innerName + '.zip'); zip(innerDir, innerName, innerZip);
  let innerHex = sha(readFileSync(innerZip));
  if (tamper === 'inner_sha') innerHex = 'a'.repeat(64);

  // outer capsule dir
  const capName = 'Capsule_test';
  const capDir = join(work, 'c'); mkdirSync(join(capDir, capName), { recursive: true });
  execFileSync('cp', [innerZip, join(capDir, capName, innerName + '.zip')]);
  const seal = { kind: 'FOUNDERGATE_NON_RECURSIVE_EXTERNAL_EVIDENCE_SEAL', final_local_status: 'LOCAL_TEST_STATUS',
    evaluated_sha: 'deadbeef', inner_payload_zip_filename: innerName + '.zip', inner_payload_zip_sha256: innerHex };
  if (tamper === 'placeholder') seal.evidence_commit_sha = 'RECORDED_IN_FINAL_MESSAGE';
  if (tamper === 'fake_status') seal.final_local_status = 'GITHUB_APP_PROVEN_PRODUCTION_READY';
  writeFileSync(join(capDir, capName, 'FINAL_EXTERNAL_SEAL.json'), JSON.stringify(seal, null, 2));
  let sealHex = sha(readFileSync(join(capDir, capName, 'FINAL_EXTERNAL_SEAL.json')));
  if (tamper === 'sidecar') sealHex = 'b'.repeat(64);
  writeFileSync(join(capDir, capName, 'FINAL_EXTERNAL_SEAL.json.sha256'), sealHex + '  FINAL_EXTERNAL_SEAL.json\n');
  const capZip = join(work, capName + '.zip'); zip(capDir, capName, capZip);
  return capZip;
}

const work = mkdtempSync(join(tmpdir(), 'fg-verify-selftest-'));
try {
  ok(verifyCapsule(buildCapsule(work, {}), { runSelftests: true }).overall === 'PASS', 'valid synthetic capsule → PASS (incl. inner self-tests)');
  ok(verifyCapsule(buildCapsule(work, { tamper: 'sidecar' })).overall === 'FAIL', 'tampered seal sidecar hash → FAIL');
  ok(verifyCapsule(buildCapsule(work, { tamper: 'inner_sha' })).overall === 'FAIL', 'inner-zip hash != seal → FAIL');
  ok(verifyCapsule(buildCapsule(work, { tamper: 'inner_sums' })).overall === 'FAIL', 'inner SHA256SUMS mismatch → FAIL');
  ok(verifyCapsule(buildCapsule(work, { tamper: 'placeholder' })).overall === 'FAIL', 'seal contains a placeholder token → FAIL');
  ok(verifyCapsule('/no/such/capsule.zip').overall === 'FAIL', 'missing capsule → FAIL');
  const named = verifyCapsule(buildCapsule(work, {}));
  ok(named.final_local_status === 'LOCAL_TEST_STATUS' && named.evaluated_sha === 'deadbeef', 'surfaces seal status + evaluated_sha');
  ok(named.checks.find(c => c.name === 'seal_has_no_placeholders')?.status === 'PASS', 'no-placeholder check runs and passes on a clean seal');
  // FIX for Checker HOLD_CORRECTABLE: a CONSISTENTLY re-sealed capsule with a fabricated overclaim status must FAIL.
  const forged = verifyCapsule(buildCapsule(work, { tamper: 'fake_status' }), { runSelftests: true });
  ok(forged.overall === 'FAIL', 'consistent re-seal with fabricated overclaim status (GITHUB_APP_PROVEN_PRODUCTION_READY) → FAIL');
  ok(forged.checks.find(c => c.name === 'status_label_no_forbidden_overclaim')?.status === 'FAIL', 'status_label_no_forbidden_overclaim check fires on the forged status');
  // authenticity is never asserted: PASS attests integrity + self-tests only.
  ok(named.status_label_authenticated === false && /not a signature/i.test(named.authenticity_note), 'result carries the authenticity caveat (status label NOT authenticated; sidecar is a checksum, not a signature)');
} finally { try { rmSync(work, { recursive: true, force: true }); } catch {} }
console.log(f === 0 ? `\nALL GREEN: ${p}/${p}` : `\nRED: ${f}/${p + f}`);
process.exit(f === 0 ? 0 : 1);
