// Self-test for the SAFE capsule verifier (structural, non-executing). Proves the positive path + FINDING 2 fix
// (packaged tests are inventoried regardless of their directory — not only under repo_intake). Zero third-party deps.
import { verifyCapsule } from '../../tools/evidence/verify_capsule.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

let p = 0, f = 0; const ok = (c, m) => { if (c) { p++; console.log('OK   ' + m); } else { f++; console.log('BAD  ' + m); } };
const sha = (b) => createHash('sha256').update(b).digest('hex');
const ditto = (src, name, out) => execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', join(src, name), out]);

// build a valid capsule whose packaged tests live under tests/tools (the exact layout FINDING 2 mishandled)
function buildCapsule(work, { status = 'LOCAL_TEST_ROUTE_READY_WITH_LIMITS' } = {}) {
  const innerName = 'InnerPayload';
  const iRoot = join(work, 'i'); const iDir = join(iRoot, innerName);
  mkdirSync(join(iDir, 'tests', 'tools'), { recursive: true });
  writeFileSync(join(iDir, 'tests', 'tools', 'thing.selftest.mjs'), 'process.exit(0);');
  writeFileSync(join(iDir, 'note.txt'), 'hi');
  const files = ['note.txt', 'tests/tools/thing.selftest.mjs'];
  writeFileSync(join(iDir, 'SHA256SUMS.txt'), files.map((r) => `${sha(readFileSync(join(iDir, r)))}  ${r}`).join('\n') + '\n');
  const innerZip = join(work, innerName + '.zip'); ditto(iRoot, innerName, innerZip);
  const innerHex = sha(readFileSync(innerZip));
  const capName = 'Capsule'; const cRoot = join(work, 'c'); const cDir = join(cRoot, capName); mkdirSync(cDir, { recursive: true });
  execFileSync('cp', [innerZip, join(cDir, innerName + '.zip')]);
  const seal = { final_local_status: status, evaluated_sha: 'deadbeef', evidence_commit_sha: 'cafe', inner_payload_zip_filename: innerName + '.zip', inner_payload_zip_sha256: innerHex };
  writeFileSync(join(cDir, 'FINAL_EXTERNAL_SEAL.json'), JSON.stringify(seal, null, 2));
  writeFileSync(join(cDir, 'FINAL_EXTERNAL_SEAL.json.sha256'), sha(readFileSync(join(cDir, 'FINAL_EXTERNAL_SEAL.json'))) + '  FINAL_EXTERNAL_SEAL.json\n');
  const capZip = join(work, capName + '.zip'); ditto(cRoot, capName, capZip); return capZip;
}

const work = mkdtempSync(join(tmpdir(), 'fg-verify-'));
try {
  const r = verifyCapsule(buildCapsule(work, {}), { inspectSelftests: true });
  ok(r.structure_verdict === 'CAPSULE_STRUCTURE_VERIFIED', 'valid capsule → CAPSULE_STRUCTURE_VERIFIED');
  ok(r.archive_integrity === 'CAPSULE_STRUCTURE_VERIFIED' && r.manifest_consistency === 'MANIFEST_CONSISTENT' && r.evidence_seal_consistency === 'SEAL_CONSISTENT', 'archive + manifest + seal sub-statuses all consistent');
  // FINDING 2 FIX: a test under tests/tools is inventoried (old tool only searched repo_intake)
  ok(r.packaged_test_presence === 'PACKAGED_TESTS_PRESENT_NOT_EXECUTED', 'packaged tests under tests/tools ARE inventoried (finding 2 fix)');
  ok((r.packaged_tests || []).some((t) => t.path === 'tests/tools/thing.selftest.mjs'), 'the tests/tools selftest is listed with its path + hash');
  ok(r.packaged_test_execution_status === 'NOT_EXECUTED', 'packaged tests NOT executed');
  // honest: never a single product-acceptance PASS; status never authenticated
  ok(r.status_authentication === 'STATUS_NOT_AUTHENTICATED', 'status label never authenticated');
  ok(r.trusted_candidate_binding === 'TRUSTED_GIT_BINDING_NOT_VERIFIED', 'trusted-git binding reported as NOT verified');
  ok(r.surfaced_status !== 'PASS' && !('overall' in r), 'no single OVERALL:PASS field (multi-status model)');
  // negative: missing capsule
  ok(verifyCapsule('/no/such.zip').structure_verdict === 'FAIL', 'missing capsule → FAIL');
  // negative: placeholder seal
  const ph = mkdtempSync(join(tmpdir(), 'fg-ph-'));
  ok(verifyCapsule(buildCapsule(ph, { status: 'X' })).final_local_status === 'X', 'seal status surfaced verbatim (unauthenticated)');
  rmSync(ph, { recursive: true, force: true });
} finally { try { rmSync(work, { recursive: true, force: true }); } catch {} }
console.log(f === 0 ? `\nALL GREEN: ${p}/${p}` : `\nRED: ${f}/${p + f}`);
process.exit(f === 0 ? 0 : 1);
