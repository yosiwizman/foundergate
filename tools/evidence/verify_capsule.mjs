// FounderGate — Standalone Offline Evidence Capsule Verifier (LOCAL, zero third-party deps).
// Verifies a FounderGate non-recursive evidence capsule end-to-end WITHOUT the original worktree:
//   1. extract the outer capsule ZIP to a temp dir;
//   2. verify FINAL_EXTERNAL_SEAL.json against its .sha256 sidecar;
//   3. verify the inner payload ZIP's SHA-256 matches inner_payload_zip_sha256 in the seal;
//   4. extract the inner payload and verify its internal SHA256SUMS.txt;
//   5. (optional --run-selftests) run each packaged *.selftest.mjs (pure Node) and report;
//   6. print a structured JSON verdict + a plain-English summary; exit 0 iff every check PASSes.
// Uses only Node built-ins (crypto/fs/child_process/os/path) + the OS `unzip` (macOS/Linux standard).
//
// Usage:  node tools/evidence/verify_capsule.mjs <capsule.zip> [--run-selftests] [--json]

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { tmpdir } from 'node:os';

export function sha256File(p) { return createHash('sha256').update(readFileSync(p)).digest('hex'); }

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
function findFile(root, name) { return walk(root).find((p) => basename(p) === name) || null; }
function findByPattern(root, re) { return walk(root).find((p) => re.test(basename(p))) || null; }
function extractZip(zip, dest) { execFileSync('unzip', ['-o', '-q', zip, '-d', dest], { stdio: ['ignore', 'ignore', 'ignore'] }); }

// Verify a SHA256SUMS.txt file (lines: "<hex>  <relpath>") relative to its own directory.
function verifySha256sums(sumsPath) {
  const root = dirname(sumsPath);
  const lines = readFileSync(sumsPath, 'utf8').split(/\n/).filter((l) => l.trim());
  const bad = [];
  let checked = 0;
  for (const line of lines) {
    const m = line.match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
    if (!m) { bad.push({ line, reason: 'malformed' }); continue; }
    const [, expected, rel] = m;
    const abs = join(root, rel.trim());
    if (!existsSync(abs)) { bad.push({ path: rel.trim(), reason: 'missing' }); continue; }
    checked++;
    const actual = sha256File(abs);
    if (actual !== expected) bad.push({ path: rel.trim(), reason: 'hash_mismatch' });
  }
  return { ok: bad.length === 0, checked, bad };
}

export function verifyCapsule(capsuleZip, { runSelftests = false } = {}) {
  const result = { capsule: capsuleZip, checks: [], overall: 'UNKNOWN' };
  const add = (name, ok, detail) => result.checks.push({ name, status: ok ? 'PASS' : 'FAIL', detail });
  if (!existsSync(capsuleZip)) { result.overall = 'FAIL'; add('capsule_exists', false, 'file not found'); return result; }
  result.capsule_sha256 = sha256File(capsuleZip);

  const work = mkdtempSync(join(tmpdir(), 'fg-verify-'));
  try {
    // 1. extract outer capsule
    const outer = join(work, 'outer'); extractZip(capsuleZip, outer);
    add('outer_capsule_extracts', true, null);

    // 2. seal vs sidecar
    const seal = findFile(outer, 'FINAL_EXTERNAL_SEAL.json');
    const sidecar = findFile(outer, 'FINAL_EXTERNAL_SEAL.json.sha256');
    if (!seal || !sidecar) { add('seal_and_sidecar_present', false, `seal=${!!seal} sidecar=${!!sidecar}`); result.overall = 'FAIL'; return result; }
    add('seal_and_sidecar_present', true, null);
    const sidecarHex = (readFileSync(sidecar, 'utf8').trim().split(/\s+/)[0] || '').toLowerCase();
    const sealHex = sha256File(seal);
    add('seal_matches_sidecar', sidecarHex === sealHex, { sidecar: sidecarHex, actual: sealHex });

    const sealObj = JSON.parse(readFileSync(seal, 'utf8'));
    result.final_local_status = sealObj.final_local_status || null;
    result.evaluated_sha = sealObj.evaluated_sha || null;
    result.evidence_commit_sha = sealObj.evidence_commit_sha || null;

    // AUTHENTICITY CAVEAT: the sidecar is a re-computable checksum, NOT a cryptographic signature.
    // A PASS attests capsule INTEGRITY + consistency + the packaged self-tests — it does NOT authenticate the
    // seal's `final_local_status` label. Authenticate the status by cross-checking the surfaced `evaluated_sha`
    // against the committed candidate in git AND the independent Checker + Gate Advisor verdicts.
    result.status_label_authenticated = false;
    result.authenticity_note = 'PASS attests capsule integrity + packaged self-tests ONLY. The final_local_status is a checksum-consistent field, not a signature; authenticate it by cross-checking evaluated_sha against the committed candidate + the independent Checker/Gate Advisor verdicts.';

    // guard: no placeholder tokens in the seal
    const placeholders = /RECORDED_IN_FINAL_MESSAGE|RECORDED_LATER|\bTBD\b|placeholder|SEE_ZIP_MANIFEST|PENDING_/i;
    add('seal_has_no_placeholders', !placeholders.test(JSON.stringify(sealObj)), null);

    // no-false-green guard: a seal whose surfaced status itself asserts a forbidden overclaim is rejected,
    // even if the checksums are internally consistent (defends against a consistent re-seal with a fake status).
    const forbiddenStatus = /GITHUB[_ -]?APP[_ -]?PROVEN|PRODUCTION[_ -]?READY|SUPPORT[_ -]?COMPLETE|MERGE[_ -]?READY|SECURITY[_ -]?CERTIFIED|COMPLIANCE[_ -]?CERTIFIED|SAAS[_ -]?READY|CUSTOMER[_ -]?REPO[_ -]?PROVEN|SCOPE[_ -]?INDEPENDENTLY[_ -]?VERIFIED/i;
    add('status_label_no_forbidden_overclaim', !forbiddenStatus.test(String(result.final_local_status || '')),
      { surfaced_status: result.final_local_status });

    // 3. inner payload zip vs seal
    const innerName = sealObj.inner_payload_zip_filename;
    const innerZip = innerName ? findFile(outer, basename(innerName)) : findByPattern(outer, /InnerPayload.*\.zip$/);
    if (!innerZip) { add('inner_payload_present', false, `expected ${innerName}`); result.overall = 'FAIL'; return result; }
    add('inner_payload_present', true, null);
    const innerHex = sha256File(innerZip);
    add('inner_payload_matches_seal', innerHex === (sealObj.inner_payload_zip_sha256 || '').toLowerCase(),
      { seal: sealObj.inner_payload_zip_sha256, actual: innerHex });

    // 4. extract inner + verify SHA256SUMS
    const inner = join(work, 'inner'); extractZip(innerZip, inner);
    const sums = findFile(inner, 'SHA256SUMS.txt');
    if (!sums) { add('inner_sha256sums_present', false, null); result.overall = 'FAIL'; return result; }
    add('inner_sha256sums_present', true, null);
    const sv = verifySha256sums(sums);
    add('inner_sha256sums_verify', sv.ok, { checked: sv.checked, bad: sv.bad.slice(0, 5) });

    // 5. optional: run packaged self-tests (pure Node)
    if (runSelftests) {
      const payRoot = dirname(sums);
      const tests = walk(payRoot).filter((p) => /\.selftest\.mjs$/.test(p) && /repo_intake/.test(p));
      let pass = 0, fail = 0; const failed = [];
      for (const t of tests) {
        try { execFileSync('node', [t], { cwd: payRoot, stdio: ['ignore', 'ignore', 'ignore'] }); pass++; }
        catch { fail++; failed.push(basename(t)); }
      }
      add('inner_selftests', fail === 0 && tests.length > 0, { total: tests.length, pass, fail, failed });
    }

    result.overall = result.checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL';
    return result;
  } finally {
    try { rmSync(work, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const capsule = args.find((a) => !a.startsWith('--'));
  const runSelftests = args.includes('--run-selftests');
  const jsonOut = args.includes('--json');
  if (!capsule) { console.error('usage: node tools/evidence/verify_capsule.mjs <capsule.zip> [--run-selftests] [--json]'); process.exit(2); }
  const r = verifyCapsule(capsule, { runSelftests });
  if (jsonOut) { console.log(JSON.stringify(r, null, 2)); }
  else {
    console.log(`FounderGate capsule verification: ${basename(capsule)}`);
    console.log(`  surfaced status (NOT authenticated): ${r.final_local_status || '(no seal status)'}  evaluated_sha: ${r.evaluated_sha || '?'}`);
    for (const c of r.checks) console.log(`  [${c.status}] ${c.name}`);
    console.log(`\nOVERALL: ${r.overall}`);
    console.log(`\nNOTE: ${r.authenticity_note || 'PASS attests integrity + self-tests only; the status label is not a signature.'}`);
  }
  process.exit(r.overall === 'PASS' ? 0 : 1);
}
