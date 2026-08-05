// Adversarial self-test for the SAFE capsule verifier. Proves (Phase 5) that a checksum-consistent malicious
// capsule NEVER executes code on the host, and that zip-slip / symlink / duplicate / manifest attacks are rejected.
// The TEST HARNESS may use extra tools (python3 to craft malicious zip entry names, zip -y for symlinks) — the
// DELIVERABLE (verify_capsule.mjs) remains zero-third-party-dep and never executes capsule code.
import { verifyCapsule, LIMITS } from '../../tools/evidence/verify_capsule.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

let p = 0, f = 0; const ok = (c, m) => { if (c) { p++; console.log('OK   ' + m); } else { f++; console.log('BAD  ' + m); } };
const sha = (b) => createHash('sha256').update(b).digest('hex');
const ditto = (src, name, out) => execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', join(src, name), out]);

// Build a well-formed capsule; opts let us inject specific attacks.
function buildCapsule(work, opts = {}) {
  const innerName = 'InnerPayload';
  const iRoot = join(work, 'i'); const iDir = join(iRoot, innerName);
  mkdirSync(join(iDir, 'tests'), { recursive: true });
  writeFileSync(join(iDir, 'note.txt'), 'hello');
  // a packaged "self-test" that WOULD write a marker if executed
  const marker = join(work, 'PWNED_MARKER_' + Math.floor(opts.n || 0));
  writeFileSync(join(iDir, 'tests', 'evil.selftest.mjs'), `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'pwned'); process.exit(0);`);
  const files = ['note.txt', 'tests/evil.selftest.mjs'];
  let sums = files.map((r) => `${sha(readFileSync(join(iDir, r)))}  ${r}`).join('\n') + '\n';
  if (opts.manifest_traversal) sums += `${'a'.repeat(64)}  ../evil\n`;
  if (opts.manifest_missing) sums += `${'a'.repeat(64)}  ghost.txt\n`;
  if (opts.unmanifested) writeFileSync(join(iDir, 'extra_unlisted.txt'), 'x'); // present but not in sums
  writeFileSync(join(iDir, 'SHA256SUMS.txt'), sums);
  const innerZip = join(work, innerName + '_' + (opts.n || 0) + '.zip'); ditto(iRoot, innerName, innerZip);
  const innerHex = sha(readFileSync(innerZip));

  const capName = 'Capsule';
  const cRoot = join(work, 'c' + (opts.n || 0)); const cDir = join(cRoot, capName);
  mkdirSync(cDir, { recursive: true });
  execFileSync('cp', [innerZip, join(cDir, innerName + '.zip')]);
  const seal = { final_local_status: 'LOCAL_TEST_ROUTE_READY_WITH_LIMITS', evaluated_sha: 'deadbeef', inner_payload_zip_filename: innerName + '.zip', inner_payload_zip_sha256: innerHex };
  writeFileSync(join(cDir, 'FINAL_EXTERNAL_SEAL.json'), JSON.stringify(seal, null, 2));
  writeFileSync(join(cDir, 'FINAL_EXTERNAL_SEAL.json.sha256'), sha(readFileSync(join(cDir, 'FINAL_EXTERNAL_SEAL.json'))) + '  FINAL_EXTERNAL_SEAL.json\n');
  if (opts.dup_seal) { mkdirSync(join(cDir, 'nested'), { recursive: true }); writeFileSync(join(cDir, 'nested', 'FINAL_EXTERNAL_SEAL.json'), '{}'); }
  if (opts.dup_sidecar) { mkdirSync(join(cDir, 'n2'), { recursive: true }); writeFileSync(join(cDir, 'n2', 'FINAL_EXTERNAL_SEAL.json.sha256'), 'x\n'); }
  if (opts.dup_inner) { mkdirSync(join(cDir, 'dup'), { recursive: true }); execFileSync('cp', [innerZip, join(cDir, 'dup', innerName + '.zip')]); } // second file with SAME basename
  const capZip = join(work, capName + '_' + (opts.n || 0) + '.zip'); ditto(cRoot, capName, capZip);
  return { capZip, marker };
}

// Craft a zip whose stored entry name is a zip-slip / absolute path (python3 zipfile).
function craftEntryZip(work, entryName, tag) {
  const out = join(work, tag + '.zip');
  execFileSync('python3', ['-c', `import zipfile,sys\nz=zipfile.ZipFile(${JSON.stringify(out)},'w')\nz.writestr(${JSON.stringify(entryName)}, b'x')\nz.close()`]);
  return out;
}

const work = mkdtempSync(join(tmpdir(), 'fg-adv-'));
try {
  // 1/2/3/18 — NON-EXECUTION: a packaged self-test that would write a marker must NEVER run.
  const { capZip, marker } = buildCapsule(work, { n: 1 });
  const res = verifyCapsule(capZip, { inspectSelftests: true });
  ok(!existsSync(marker), '(1/2/18) packaged self-test did NOT execute — no marker written outside extraction');
  ok(res.packaged_test_execution_status === 'NOT_EXECUTED', '(3) packaged_test_execution_status = NOT_EXECUTED (hash presence != success)');
  ok(res.packaged_test_presence === 'PACKAGED_TESTS_PRESENT_NOT_EXECUTED', '(17) packaged tests reported PRESENT_NOT_EXECUTED');
  ok(res.structure_verdict === 'CAPSULE_STRUCTURE_VERIFIED', '(16) a clean capsule verifies STRUCTURALLY');
  // no --run-selftests execution mode exists
  let refused = false;
  try { execFileSync('node', ['tools/evidence/verify_capsule.mjs', capZip, '--run-selftests'], { stdio: ['ignore', 'ignore', 'ignore'] }); }
  catch (e) { refused = e.status === 2; }
  ok(refused, 'CLI refuses --run-selftests (exit 2) — no host execution mode');

  // 4/5 — zip-slip + absolute entry names rejected at inspection
  ok(verifyCapsule(craftEntryZip(work, '../escaped.txt', 'zipslip')).archive_integrity === 'REJECTED_UNSAFE_ARCHIVE', '(4) ../ zip entry rejected');
  ok(verifyCapsule(craftEntryZip(work, '/tmp/abs_escaped.txt', 'abspath')).archive_integrity === 'REJECTED_UNSAFE_ARCHIVE', '(5) absolute zip entry rejected');
  ok(verifyCapsule(craftEntryZip(work, 'a/../../b.txt', 'nested')).archive_integrity === 'REJECTED_UNSAFE_ARCHIVE', 'nested ../ zip entry rejected');

  // 6 — symlink entry rejected (zip -y stores symlinks)
  const slDir = join(work, 'sl'); mkdirSync(slDir, { recursive: true }); writeFileSync(join(slDir, 'real.txt'), 'x');
  try { symlinkSync('/etc/hosts', join(slDir, 'link')); } catch {}
  const slZip = join(work, 'symlink.zip');
  execFileSync('zip', ['-y', '-q', slZip, 'real.txt', 'link'], { cwd: slDir });
  ok(verifyCapsule(slZip).archive_integrity === 'REJECTED_UNSAFE_ARCHIVE', '(6) symlink zip entry rejected');

  // 7/8/9 — duplicate seal / sidecar / inner payload rejected
  ok(verifyCapsule(buildCapsule(work, { n: 7, dup_seal: true }).capZip).structure_verdict === 'FAIL', '(7) duplicate seal rejected');
  ok(verifyCapsule(buildCapsule(work, { n: 8, dup_sidecar: true }).capZip).structure_verdict === 'FAIL', '(8) duplicate sidecar rejected');
  ok(verifyCapsule(buildCapsule(work, { n: 9, dup_inner: true }).capZip).structure_verdict === 'FAIL', '(9) duplicate inner payload rejected');

  // 10/11 — manifest path traversal / symlink refs; 12 unmanifested; 13 missing
  ok(verifyCapsule(buildCapsule(work, { n: 10, manifest_traversal: true }).capZip).manifest_consistency === 'FAIL', '(10) manifest ../ path rejected');
  ok(verifyCapsule(buildCapsule(work, { n: 12, unmanifested: true }).capZip).manifest_consistency === 'FAIL', '(12) unmanifested payload file rejected');
  ok(verifyCapsule(buildCapsule(work, { n: 13, manifest_missing: true }).capZip).manifest_consistency === 'FAIL', '(13) missing manifested file rejected');

  // 14 — file-count limit config present + enforced path exists
  ok(LIMITS.MAX_ENTRIES > 0 && LIMITS.MAX_TOTAL_UNCOMPRESSED_BYTES > 0 && LIMITS.MAX_COMPRESSION_RATIO > 0 && LIMITS.EXTRACT_TIMEOUT_MS > 0, '(14/15) bounded limits + extract timeout configured');

  // honest multi-status: never a single product-acceptance PASS
  ok(res.status_authentication === 'STATUS_NOT_AUTHENTICATED' && res.trusted_candidate_binding === 'TRUSTED_GIT_BINDING_NOT_VERIFIED', '(6-status) status NOT authenticated + trusted-git binding NOT verified reported separately');
  ok(/does NOT execute packaged tests/i.test(res.authenticity_note) && /not a signature/i.test(res.authenticity_note), 'authenticity note states non-execution + non-authentication');
} finally { try { rmSync(work, { recursive: true, force: true }); } catch {} }
console.log(f === 0 ? `\nALL GREEN: ${p}/${p}` : `\nRED: ${f}/${p + f}`);
process.exit(f === 0 ? 0 : 1);
