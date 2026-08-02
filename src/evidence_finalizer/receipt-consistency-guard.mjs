// Receipt Consistency Guard — extends the final-head guard with METRIC consistency.
// Verifies that all metric-bearing receipt files agree (no stale numbers) and that
// the safety counters are all zero. Pure/read-only. Catches the "TEST_REPORT still
// says out-of-path=2 while FINAL_STATUS says 0" defect class.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { verifyFinalHead } from './final-head-guard.mjs';

function readIf(p){ return existsSync(p) ? readFileSync(p,'utf8') : ''; }
function walk(dir, acc=[]) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    const p = join(dir,e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(md|json|txt)$/.test(e)) acc.push(p);
  }
  return acc;
}

// verifyReceipt(receiptDir, headSha, {docDirs=[], demoDir}) -> {checks, allPass}
export function verifyReceiptConsistency(receiptDir, headSha, opts = {}) {
  const checks = [];
  const add = (name, pass, detail='') => checks.push({ name, pass: !!pass, detail });

  // A) final-head binding (reuse)
  const fh = verifyFinalHead(receiptDir, headSha, opts);
  add('A final-head binding all-pass', fh.allPass);

  // B) metric consistency: NO file claims a stale out-of-path of 2 (scannable metric forms)
  const dirs = [receiptDir, ...(opts.docDirs||[])];
  const files = dirs.flatMap(d => walk(d));
  const staleHits = [];
  for (const f of files) {
    const s = readIf(f);
    if (/out[_-]of[_-]path( added\/modified)?\s*[=|:]\s*2\b/i.test(s) || /Out-of-path added\/modified \| 2 \|/.test(s)) staleHits.push(f);
  }
  add('B no stale out-of-path=2 metric in any receipt/doc file', staleHits.length === 0, staleHits.join(','));

  // C) the metric-bearing receipt files each affirm out-of-path = 0
  const fs = readIf(join(receiptDir,'FINAL_STATUS.md'));
  const vs = readIf(join(receiptDir,'evidence','verify_summary.txt'));
  let fv=null; try{ fv=JSON.parse(readIf(join(receiptDir,'FINAL_VERDICT.json'))||'{}'); }catch{}
  const att = readIf(join(receiptDir,'PROHIBITED_ACTION_ATTESTATION.md'));
  add('C1 FINAL_STATUS states out-of-path 0', /out-of-path\D*0/i.test(fs));
  add('C2 FINAL_VERDICT out_of_path 0', fv && (fv.scans && (fv.scans.out_of_path === 0 || fv.scans.out_of_path_added_modified === 0)));
  add('C3 verify_summary out_of_path_AM=0', /out_of_path_AM=0/.test(vs) || /out_of_path=0/.test(vs));
  add('C4 ATTESTATION out-of-path 0', /0 out-of-path|out-of-path\D*0/i.test(att));

  // D) safety counters all zero in verify_summary
  add('D provider/spend/contact/publish/deploy all 0', /provider=0/.test(vs) && /spend=0/.test(vs) && /contact=0/.test(vs) && /publish=0/.test(vs) && /deploy=0/.test(vs));

  // E) no stale LOCAL_SIMULATION contradiction in the demo UI (if a demoDir given)
  if (opts.demoDir) {
    const dash = readIf(join(opts.demoDir,'founder_operator_dashboard','index.html'));
    add('E no stale LOCAL_SIMULATION dashboard copy', !/work locally via LOCAL_SIMULATION|falls back to a clearly-labeled LOCAL_SIMULATION/.test(dash));
  } else add('E no stale LOCAL_SIMULATION (n/a)', true);

  const allPass = checks.every(c => c.pass);
  return { checks, allPass };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, head] = process.argv.slice(2);
  const r = verifyReceiptConsistency(dir, head, { docDirs: [], demoDir: process.argv[4] });
  for (const c of r.checks) console.log(`${c.pass?'PASS':'FAIL'}  ${c.name}${c.detail?(' :: '+c.detail):''}`);
  console.log(r.allPass ? 'ALL PASS (receipt consistent)' : 'FAIL — receipt metric inconsistency');
  process.exit(r.allPass ? 0 : 1);
}
