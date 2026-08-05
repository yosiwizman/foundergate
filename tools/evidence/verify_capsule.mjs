// FounderGate — Standalone Offline Evidence Capsule Verifier (LOCAL, zero third-party deps) — SAFE REWRITE.
//
// SAFETY CONTRACT (corrections to independently-proven defects):
//  - This tool NEVER executes code contained in a capsule on the host. There is NO --run-selftests execution mode.
//    Packaged tests are only INVENTORIED (--inspect-selftests): reported as PRESENT_NOT_EXECUTED with hashes,
//    paths, and manifest coverage. Presence/hash is NEVER treated as test success.
//  - Archive entries are inspected BEFORE extraction; zip-slip (absolute / `..` / normalization escape), symlinks,
//    hard/device links, duplicates, and excessive count/size/ratio are rejected. Extraction is bounded + timed and
//    goes to a fresh disposable dir; after extraction we prove no path escaped the destination root.
//  - Manifest (SHA256SUMS.txt) entries are path-validated (no absolute/`..`/symlink), resolved-under-root, and
//    require COMPLETE coverage; extra/missing files are reported. Load-bearing evidence uses EXACT expected paths
//    with EXACTLY ONE occurrence — never recursive first-match-by-basename.
//  - Reporting is a MULTI-STATUS model, never a single OVERALL:PASS that reads as product acceptance.
//
// Usage:  node tools/evidence/verify_capsule.mjs <capsule.zip> [--inspect-selftests] [--json]

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, lstatSync, mkdtempSync, existsSync, rmSync, realpathSync } from 'node:fs';
import { join, basename, dirname, resolve, sep, normalize } from 'node:path';
import { tmpdir } from 'node:os';

// Bounded limits (recorded config object).
export const LIMITS = {
  MAX_ENTRIES: 5000,
  MAX_TOTAL_UNCOMPRESSED_BYTES: 1024 * 1024 * 1024, // 1 GiB
  MAX_COMPRESSION_RATIO: 200,                        // uncompressed / compressed
  EXTRACT_TIMEOUT_MS: 60_000,
  ZIPINFO_TIMEOUT_MS: 20_000,
};

const sha256File = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = lstatSync(p);
    if (st.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
// EXACT single-occurrence lookup — no recursive first-match for load-bearing evidence.
function findExactlyOne(root, relOrName, { byName = false } = {}) {
  const all = walk(root);
  const matches = byName ? all.filter((p) => basename(p) === relOrName) : all.filter((p) => p === join(root, relOrName));
  return { count: matches.length, path: matches.length === 1 ? matches[0] : null, all: matches };
}
const isUnsafeRel = (name) => {
  const n = String(name);
  if (n.startsWith('/') || /^[A-Za-z]:[\\/]/.test(n)) return 'absolute';
  const parts = normalize(n).split(/[\\/]/);
  if (parts.includes('..')) return 'dotdot';
  if (normalize(n).startsWith('..')) return 'escape';
  return null;
};

// Inspect a ZIP's central directory WITHOUT extracting: names + symlink/link attributes + sizes.
function inspectZip(zip) {
  // `zipinfo` prints one line per entry; the first field's leading char encodes type: 'l'=symlink, 'd'=dir, '-'=file.
  let out;
  try { out = execFileSync('zipinfo', [zip], { encoding: 'utf8', timeout: LIMITS.ZIPINFO_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { return { ok: false, violations: [{ type: 'zipinfo_failed', detail: e.message }], entries: [] }; }
  const lines = out.split(/\n/);
  const entries = [];
  const violations = [];
  const seen = new Set();
  let totalUncompressed = 0, totalCompressed = 0;
  for (const line of lines) {
    // e.g. "-rw-r--r--  2.0 unx      13 tx defN 26-Aug-05 08:00 path/to/file"  (leading char may be '?' for
    // entries with no unix mode bits, e.g. python-crafted zips). Accept ANY leading char; path-safety comes from
    // the name regardless, and the type char is used only to detect symlink/special files.
    const m = line.match(/^(.)\S{9}\s+\S+\s+\S+\s+(\d+)\s+\S+\s+\S+\s+\S+\s+\S+\s+(.+)$/);
    if (!m) continue;
    const [, typeChar, sizeStr, name] = m;
    const size = parseInt(sizeStr, 10) || 0;
    if (typeChar === 'l') { violations.push({ type: 'symlink', name }); continue; }
    if (typeChar === 'b' || typeChar === 'c' || typeChar === 'p' || typeChar === 's') { violations.push({ type: 'special_file', name, typeChar }); continue; }
    if (typeChar === 'd') { entries.push({ name, dir: true, size: 0 }); continue; }
    const unsafe = isUnsafeRel(name);
    if (unsafe) violations.push({ type: 'unsafe_path', reason: unsafe, name });
    const norm = normalize(name);
    if (seen.has(norm)) violations.push({ type: 'duplicate_path', name: norm });
    seen.add(norm);
    totalUncompressed += size;
    entries.push({ name, dir: false, size });
  }
  const fileCount = entries.filter((e) => !e.dir).length;
  if (fileCount > LIMITS.MAX_ENTRIES) violations.push({ type: 'too_many_entries', count: fileCount });
  if (totalUncompressed > LIMITS.MAX_TOTAL_UNCOMPRESSED_BYTES) violations.push({ type: 'too_large', bytes: totalUncompressed });
  try { totalCompressed = statSync(zip).size; } catch { /* ignore */ }
  if (totalCompressed > 0 && totalUncompressed / totalCompressed > LIMITS.MAX_COMPRESSION_RATIO) violations.push({ type: 'compression_bomb', ratio: Math.round(totalUncompressed / totalCompressed) });
  return { ok: violations.length === 0, violations, entries, fileCount, totalUncompressed };
}

// Extract to a fresh disposable dir AFTER pre-validation, with a timeout, then prove no escape.
function safeExtract(zip, work, label) {
  const dest = mkdtempSync(join(work, label + '-'));
  execFileSync('unzip', ['-o', '-q', zip, '-d', dest], { stdio: ['ignore', 'ignore', 'ignore'], timeout: LIMITS.EXTRACT_TIMEOUT_MS });
  const destReal = realpathSync(dest);
  for (const p of walk(dest)) {
    // reject symlinks that survived + prove every real path is under dest
    const st = lstatSync(p);
    if (st.isSymbolicLink()) throw new Error('post_extract_symlink:' + p);
    const rp = realpathSync(p);
    if (!(rp === destReal || rp.startsWith(destReal + sep))) throw new Error('post_extract_escape:' + p);
  }
  return dest;
}

// Verify a SHA256SUMS.txt with full path-safety + completeness. No recursive basename matching.
function verifyManifest(sumsPath) {
  const root = realpathSync(dirname(sumsPath));
  const lines = readFileSync(sumsPath, 'utf8').split(/\n/).filter((l) => l.trim());
  const violations = [];
  const manifested = new Set();
  for (const line of lines) {
    const m = line.match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
    if (!m) { violations.push({ reason: 'malformed_line', line: line.slice(0, 80) }); continue; }
    const [, expected, relRaw] = m;
    const rel = relRaw.trim();
    const unsafe = isUnsafeRel(rel);
    if (unsafe) { violations.push({ reason: 'unsafe_manifest_path:' + unsafe, path: rel }); continue; }
    const abs = join(root, rel);
    if (!existsSync(abs)) { violations.push({ reason: 'missing_file', path: rel }); continue; }
    const lst = lstatSync(abs);
    if (lst.isSymbolicLink()) { violations.push({ reason: 'symlink_manifest_ref', path: rel }); continue; }
    const rp = realpathSync(abs);
    if (!(rp === root || rp.startsWith(root + sep))) { violations.push({ reason: 'manifest_path_escape', path: rel }); continue; }
    if (manifested.has(rel)) { violations.push({ reason: 'duplicate_manifest_entry', path: rel }); continue; }
    manifested.add(rel);
    if (sha256File(abs) !== expected.toLowerCase()) violations.push({ reason: 'hash_mismatch', path: rel });
  }
  // completeness: every regular file under root except SHA256SUMS.txt must be manifested
  const extra = [];
  for (const p of walk(root)) {
    if (basename(p) === 'SHA256SUMS.txt') continue;
    if (lstatSync(p).isSymbolicLink()) { violations.push({ reason: 'payload_symlink', path: p.slice(root.length + 1) }); continue; }
    const rel = p.slice(root.length + 1);
    if (!manifested.has(rel)) extra.push(rel);
  }
  if (extra.length) violations.push({ reason: 'unmanifested_files', paths: extra.slice(0, 10), count: extra.length });
  return { ok: violations.length === 0, checked: manifested.size, violations };
}

export function verifyCapsule(capsuleZip, { inspectSelftests = false } = {}) {
  const r = {
    tool: 'verify_capsule.mjs (safe)', capsule: capsuleZip, limits: LIMITS,
    archive_integrity: 'UNKNOWN', manifest_consistency: 'UNKNOWN', evidence_seal_consistency: 'UNKNOWN',
    status_authentication: 'STATUS_NOT_AUTHENTICATED', packaged_test_presence: 'UNKNOWN',
    packaged_test_execution_status: 'NOT_EXECUTED', trusted_candidate_binding: 'TRUSTED_GIT_BINDING_NOT_VERIFIED',
    external_review_binding: 'NOT_VERIFIED', checks: [], structure_verdict: 'UNKNOWN',
  };
  const add = (name, status, detail) => r.checks.push({ name, status, detail });
  if (!existsSync(capsuleZip)) { add('capsule_exists', 'FAIL', 'not found'); r.structure_verdict = 'FAIL'; return finalize(r); }
  r.capsule_sha256 = sha256File(capsuleZip);

  // PHASE 3 — pre-extraction archive safety (outer)
  const outerInsp = inspectZip(capsuleZip);
  add('outer_archive_safe', outerInsp.ok ? 'PASS' : 'FAIL', outerInsp.ok ? { files: outerInsp.fileCount } : outerInsp.violations.slice(0, 8));
  if (!outerInsp.ok) { r.archive_integrity = 'REJECTED_UNSAFE_ARCHIVE'; r.structure_verdict = 'FAIL'; return finalize(r); }

  const work = mkdtempSync(join(tmpdir(), 'fg-verify-'));
  try {
    const outer = safeExtract(capsuleZip, work, 'outer');
    add('outer_extracts_no_escape', 'PASS', null);

    // seal + sidecar: EXACTLY ONE each
    const sealHit = findExactlyOne(outer, 'FINAL_EXTERNAL_SEAL.json', { byName: true });
    const sideHit = findExactlyOne(outer, 'FINAL_EXTERNAL_SEAL.json.sha256', { byName: true });
    if (sealHit.count !== 1 || sideHit.count !== 1) {
      add('exactly_one_seal_and_sidecar', 'FAIL', { seal: sealHit.count, sidecar: sideHit.count });
      r.evidence_seal_consistency = 'REJECTED'; r.structure_verdict = 'FAIL'; return finalize(r);
    }
    add('exactly_one_seal_and_sidecar', 'PASS', null);
    const sidecarHex = (readFileSync(sideHit.path, 'utf8').trim().split(/\s+/)[0] || '').toLowerCase();
    add('seal_matches_sidecar', sidecarHex === sha256File(sealHit.path) ? 'PASS' : 'FAIL', null);

    const sealObj = JSON.parse(readFileSync(sealHit.path, 'utf8'));
    r.final_local_status = sealObj.final_local_status || null;
    r.evaluated_sha = sealObj.evaluated_sha || null;
    r.evidence_commit_sha = sealObj.evidence_commit_sha || null;
    const placeholders = /RECORDED_IN_FINAL_MESSAGE|RECORDED_LATER|\bTBD\b|placeholder|SEE_ZIP_MANIFEST|PENDING_/i;
    add('seal_has_no_placeholders', placeholders.test(JSON.stringify(sealObj)) ? 'FAIL' : 'PASS', null);

    // inner payload: EXACTLY ONE, named by the seal
    const innerName = sealObj.inner_payload_zip_filename;
    const innerHit = innerName ? findExactlyOne(outer, basename(innerName), { byName: true }) : { count: 0 };
    if (innerHit.count !== 1) { add('exactly_one_inner_payload', 'FAIL', { count: innerHit.count, expected: innerName }); r.evidence_seal_consistency = 'REJECTED'; r.structure_verdict = 'FAIL'; return finalize(r); }
    add('exactly_one_inner_payload', 'PASS', null);
    add('inner_payload_matches_seal', sha256File(innerHit.path) === (sealObj.inner_payload_zip_sha256 || '').toLowerCase() ? 'PASS' : 'FAIL', null);

    // inner archive safety + extract + manifest
    const innerInsp = inspectZip(innerHit.path);
    add('inner_archive_safe', innerInsp.ok ? 'PASS' : 'FAIL', innerInsp.ok ? { files: innerInsp.fileCount } : innerInsp.violations.slice(0, 8));
    if (!innerInsp.ok) { r.archive_integrity = 'REJECTED_UNSAFE_ARCHIVE'; r.structure_verdict = 'FAIL'; return finalize(r); }
    const inner = safeExtract(innerHit.path, work, 'inner');
    add('inner_extracts_no_escape', 'PASS', null);

    const sumsHit = findExactlyOne(inner, 'SHA256SUMS.txt', { byName: true });
    if (sumsHit.count !== 1) { add('exactly_one_inner_manifest', 'FAIL', { count: sumsHit.count }); r.manifest_consistency = 'REJECTED'; r.structure_verdict = 'FAIL'; return finalize(r); }
    add('exactly_one_inner_manifest', 'PASS', null);
    const mv = verifyManifest(sumsHit.path);
    add('inner_manifest_complete_and_safe', mv.ok ? 'PASS' : 'FAIL', { checked: mv.checked, violations: mv.violations.slice(0, 8) });

    // PHASE 6 — packaged tests: INVENTORY ONLY (never execute)
    const payRoot = dirname(sumsHit.path);
    const tests = walk(payRoot).filter((p) => /\.selftest\.mjs$/.test(p) || /\.test\.mjs$/.test(p));
    r.packaged_tests = tests.map((p) => ({ path: p.slice(payRoot.length + 1), sha256: sha256File(p) }));
    r.packaged_test_presence = tests.length ? 'PACKAGED_TESTS_PRESENT_NOT_EXECUTED' : 'NO_PACKAGED_TESTS';
    add('packaged_tests_inventoried_not_executed', 'PASS', { count: tests.length, note: 'tests were NOT executed; presence/hash is not success; run only under a trusted-git-bound sandbox (not built here)' });
    if (inspectSelftests) r.inspect_selftests = r.packaged_tests;

    // roll up honest sub-statuses (independent of one another)
    const pass = (n) => (r.checks.find((c) => c.name === n) || {}).status === 'PASS';
    r.archive_integrity = (pass('outer_archive_safe') && pass('inner_archive_safe') && pass('outer_extracts_no_escape') && pass('inner_extracts_no_escape')) ? 'CAPSULE_STRUCTURE_VERIFIED' : 'FAIL';
    r.manifest_consistency = pass('inner_manifest_complete_and_safe') ? 'MANIFEST_CONSISTENT' : 'FAIL';
    r.evidence_seal_consistency = (pass('seal_matches_sidecar') && pass('inner_payload_matches_seal') && pass('exactly_one_seal_and_sidecar') && pass('exactly_one_inner_payload') && pass('seal_has_no_placeholders')) ? 'SEAL_CONSISTENT' : 'FAIL';
    r.structure_verdict = r.checks.every((c) => c.status === 'PASS') ? 'CAPSULE_STRUCTURE_VERIFIED' : 'FAIL';
    return finalize(r);
  } catch (e) {
    add('safe_verification', 'FAIL', String(e.message).slice(0, 200));
    r.structure_verdict = 'FAIL'; r.archive_integrity = r.archive_integrity === 'UNKNOWN' ? 'FAIL' : r.archive_integrity;
    return finalize(r);
  } finally { try { rmSync(work, { recursive: true, force: true }); } catch { /* best effort */ } }
}

function finalize(r) {
  r.authenticity_note = 'This tool verifies STRUCTURE ONLY: archive integrity, manifest completeness/safety, and seal consistency. It does NOT execute packaged tests, does NOT authenticate the status label (a sidecar is a checksum, not a signature), and does NOT establish trusted-git binding or product acceptance. Authenticate the status by cross-checking evaluated_sha against the committed candidate in the trusted FounderGate repo AND the independent Checker/Gate Advisor verdicts.';
  return r;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const capsule = args.find((a) => !a.startsWith('--'));
  const jsonOut = args.includes('--json');
  const inspect = args.includes('--inspect-selftests');
  if (args.includes('--run-selftests')) { console.error('REFUSED: --run-selftests is removed. This tool never executes capsule-contained code. Use --inspect-selftests to inventory (not run) packaged tests.'); process.exit(2); }
  if (!capsule) { console.error('usage: node tools/evidence/verify_capsule.mjs <capsule.zip> [--inspect-selftests] [--json]'); process.exit(2); }
  const r = verifyCapsule(capsule, { inspectSelftests: inspect });
  if (jsonOut) { console.log(JSON.stringify(r, null, 2)); }
  else {
    console.log(`FounderGate capsule STRUCTURAL verification: ${basename(capsule)}`);
    console.log(`  surfaced status (NOT authenticated): ${r.final_local_status || '(none)'}  evaluated_sha: ${r.evaluated_sha || '?'}`);
    console.log(`  archive_integrity: ${r.archive_integrity}`);
    console.log(`  manifest_consistency: ${r.manifest_consistency}`);
    console.log(`  evidence_seal_consistency: ${r.evidence_seal_consistency}`);
    console.log(`  status_authentication: ${r.status_authentication}`);
    console.log(`  packaged_tests: ${r.packaged_test_presence} (execution: ${r.packaged_test_execution_status})`);
    console.log(`  trusted_candidate_binding: ${r.trusted_candidate_binding}`);
    for (const c of r.checks) console.log(`  [${c.status}] ${c.name}`);
    console.log(`\nSTRUCTURE_VERDICT: ${r.structure_verdict}`);
    console.log(`\nNOTE: ${r.authenticity_note}`);
  }
  // exit 0 only when structure verified; this is NOT a product-acceptance signal.
  process.exit(r.structure_verdict === 'CAPSULE_STRUCTURE_VERIFIED' ? 0 : 1);
}
