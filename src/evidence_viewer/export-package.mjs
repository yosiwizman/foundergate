#!/usr/bin/env node
// REAL local sealed-package export. Takes a run evidence JSON, assembles a package
// dir with the run + a SHA256SUMS.txt, seals it with `ditto` into a ZIP, and verifies
// with `unzip -t`. Produces a real sealed ZIP + its SHA-256. No provider, no network.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const runJsonPath = process.argv[2] || join(repoRoot, 'demo', 'founder_operator_dashboard', 'runs', 'last-run.json');
const outZip = process.argv[3] || join(repoRoot, 'demo', 'founder_operator_dashboard', 'runs', 'sealed_export.zip');

function sha256File(p){ return createHash('sha256').update(readFileSync(p)).digest('hex'); }

export function exportSealedPackage(runPath = runJsonPath, zipPath = outZip) {
  if (!existsSync(runPath)) throw new Error(`run JSON not found: ${runPath}`);
  const run = JSON.parse(readFileSync(runPath, 'utf8'));
  if (run.decision === 'SHIP') throw new Error('refusing to seal a SHIP decision (forbidden)');
  const stage = mkdtempSync(join(tmpdir(), 'fg-export-'));
  const pkg = join(stage, 'evidence_package'); mkdirSync(pkg);
  // evidence note (plain), the run JSON, and a manifest
  writeFileSync(join(pkg, 'RUN_EVIDENCE.json'), JSON.stringify(run, null, 2));
  const note = [
    '# Local Evidence Note (REAL_LOCAL_RUN)',
    `- objective: ${run.objective}`,
    `- exact commit: ${run.commit}`,
    `- tests: ${run.tests.result} (failures: ${run.tests.failures})`,
    `- decision: ${run.decision} (never SHIP)`,
    `- limitations: ${(run.limitations||[]).join('; ')}`,
    '', 'This is an internal-demo-grade local evidence package. Not production/secure/compliant.',
  ].join('\n');
  writeFileSync(join(pkg, 'EVIDENCE_NOTE.md'), note);
  // SHA256SUMS over package files
  const files = ['EVIDENCE_NOTE.md', 'RUN_EVIDENCE.json'];
  const sums = files.map(f => `${sha256File(join(pkg, f))}  ${f}`).join('\n') + '\n';
  writeFileSync(join(pkg, 'SHA256SUMS.txt'), sums);
  // seal with ditto, verify with unzip -t
  execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', pkg, zipPath]);
  const verify = execFileSync('unzip', ['-tq', zipPath]).toString();
  const zipSha = sha256File(zipPath);
  return { sealed: true, zip: zipPath, zip_sha256: zipSha, unzip_ok: /No errors detected/.test(verify), files, decision: run.decision };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = exportSealedPackage();
  console.log(`SEALED_EXPORT_LOCAL: zip=${basename(res.zip)} sha256=${res.zip_sha256.slice(0,16)}… unzip_ok=${res.unzip_ok} files=${res.files.length}`);
}
