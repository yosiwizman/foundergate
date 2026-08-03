// Aggregated batch evidence + last-evidence summary. Server-owned: the batch buffer is filled from
// REAL fixture executions (runFixture), then sealed into a genuine aggregate ZIP (ditto) and verified
// with `unzip -t`. No fake aggregate. Founder-safe summaries only (no raw logs, no full SHA, no secrets).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'demo', 'founder_operator_dashboard', 'runs');
const BATCH_DIR = join(OUT_DIR, 'batch_evidence');
const BATCH_ZIP = join(OUT_DIR, 'batch_evidence.zip');

let batch = [];            // server-owned buffer of real results
let lastEvidence = null;   // founder-safe summary of the most recent sealed package

export function batchReset(){ batch = []; return { status:'complete', size: 0 }; }
export function batchAppend(entry){
  // entry is the founder-safe normalized result the server itself produced for a fixture
  const safe = {
    fixture: String(entry.fixture||'').slice(0,64),
    objective: String(entry.objective||'').slice(0,200),
    status: String(entry.status||'UNKNOWN').slice(0,32),
    decision: String(entry.decision||'UNKNOWN').slice(0,32),
    explanation: String(entry.explanation||'').slice(0,200),
  };
  batch.push(safe);
  return { status:'complete', size: batch.length };
}

export function batchSummary(){
  const total = batch.length;
  const pass = batch.filter(b=>/^(SCENARIO_)?PASS$/.test(b.status)).length; // counts PASS and SCENARIO_PASS
  const refused = batch.filter(b=>/REFUSED/.test(b.status)).length;
  const other = total - pass - refused;
  return {
    total, pass, refused, other,
    decision_ceiling: 'INTERNAL_DEMO_ONLY',
    never_ship: true,
    aggregate_conclusion: total===0 ? 'No runs in this batch yet.' :
      `${pass}/${total} fixtures passed; ${refused} refused; ${other} other. Internal demo only — never ship.`,
    limitations: 'Local-only, internal, synthetic/self-owned fixtures. Not production, not secure, not SaaS, not customer-ready.',
    not_proven: 'production readiness, security/compliance, customer/market/paid validation, commercial readiness.',
    runs: batch.slice(),
  };
}

// Seal a REAL aggregate ZIP from the server-owned buffer.
export function batchExport(){
  if (batch.length === 0) return { status:'UNKNOWN', reason:'no batch runs to export' };
  try {
    if (existsSync(BATCH_DIR)) execFileSync('rm', ['-rf', BATCH_DIR]);
    mkdirSync(BATCH_DIR, { recursive: true });
    const summary = batchSummary();
    writeFileSync(join(BATCH_DIR, 'BATCH_SUMMARY.json'), JSON.stringify(summary, null, 2));
    const lines = ['# FounderGate — Aggregated Batch Evidence (local, synthetic)','',
      `Aggregate: ${summary.aggregate_conclusion}`, `Decision ceiling: INTERNAL_DEMO_ONLY (never SHIP)`,
      `Limitations: ${summary.limitations}`, `What was NOT proven: ${summary.not_proven}`, '', '## Individual runs'];
    summary.runs.forEach((r,i)=> lines.push(`${i+1}. ${r.fixture} · objective "${r.objective}" · ${r.status} · ${r.decision} · ${r.explanation}`));
    writeFileSync(join(BATCH_DIR, 'BATCH_REPORT.md'), lines.join('\n')+'\n');
    if (existsSync(BATCH_ZIP)) execFileSync('rm', ['-f', BATCH_ZIP]);
    execFileSync('ditto', ['-c','-k','--sequesterRsrc','--keepParent', BATCH_DIR, BATCH_ZIP]);
    const verify = execFileSync('unzip', ['-tq', BATCH_ZIP]).toString();
    const unzip_ok = /No errors detected/.test(verify);
    if (!unzip_ok) return { status:'EXPORT_FAILED', reason:'aggregate unzip -t failed' };
    lastEvidence = { kind:'aggregate-batch', ...summary, zip:'runs/batch_evidence.zip', zip_verified:true };
    return { status:'complete', zip:'runs/batch_evidence.zip', unzip_ok:true, entries: summary.total, aggregate: summary.aggregate_conclusion };
  } catch (e) { return { status:'EXPORT_FAILED', reason: String(e && e.message||'').slice(0,200) }; }
}

// Record a founder-safe summary when a single-run export is sealed (called from server-core export path).
export function setLastSingleEvidence(summary){ lastEvidence = { kind:'single-run', zip_verified:true, ...summary }; }
export function getLastEvidence(){
  if (!lastEvidence) return { status:'UNKNOWN', reason:'no sealed evidence yet' };
  return { status:'complete', evidence: lastEvidence };
}
