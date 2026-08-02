// Final-Head Guard — mechanically verifies a receipt's final-head bindings match the
// actual branch head AFTER all follow-up commits. Prevents the stale-head defect class.
// Pure/read-only: reads receipt files, returns a structured verdict. No git writes.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function readIf(p){ return existsSync(p) ? readFileSync(p, 'utf8') : null; }

// verifyFinalHead(receiptDir, headSha, {earlierCandidate}) -> {checks, allPass}
export function verifyFinalHead(receiptDir, headSha, opts = {}) {
  const full = String(headSha); const short = full.slice(0, 12);
  const earlier = opts.earlierCandidate ? String(opts.earlierCandidate) : null;
  const eShort = earlier ? earlier.slice(0, 12) : null;
  const checks = [];
  const add = (name, pass, detail='') => checks.push({ name, pass: !!pass, detail });

  const fs = readIf(join(receiptDir, 'FINAL_STATUS.md'));
  const fvRaw = readIf(join(receiptDir, 'FINAL_VERDICT.json'));
  const bk = readIf(join(receiptDir, 'BACKUP_AND_GITHUB_SYNC_REPORT.md'));
  const cf = readIf(join(receiptDir, 'CHANGED_FILES_REPORT.md'));
  const fh = readIf(join(receiptDir, 'evidence', 'final_head.txt'));
  let fv = null; try { fv = fvRaw ? JSON.parse(fvRaw) : null; } catch {}

  add('1 FINAL_STATUS binds head', fs && fs.includes(short));
  add('2 FINAL_VERDICT.head == head', fv && (fv.head === full || (fv.head||'').startsWith(short)));
  add('3 FINAL_VERDICT.final_head == head', fv && fv.final_head === full);
  add('4 BACKUP identifies head', bk && bk.includes(short));
  // 5 CHANGED_FILES distinguishes primary build vs final head IF they differ
  if (earlier && earlier !== full) add('5 CHANGED_FILES distinguishes primary vs final', cf && cf.includes(short) && cf.includes(eShort));
  else add('5 CHANGED_FILES (primary==final, n/a)', true);
  add('6 evidence/final_head.txt == head', fh && fh.trim() === full);
  // 7 no prior frozen candidate labeled final (FINAL_STATUS must not present earlier as final)
  const stale = earlier ? (fs && fs.includes('head `'+eShort+'`') && !fs.includes('earlier frozen candidate')) : false;
  add('7 no frozen candidate labeled final', !stale);
  const allPass = checks.every(c => c.pass);
  return { headSha: full, checks, allPass };
}

// CLI: node final-head-guard.mjs <receiptDir> <headSha> [earlierCandidate]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, head, earlier] = process.argv.slice(2);
  const r = verifyFinalHead(dir, head, { earlierCandidate: earlier });
  for (const c of r.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}`);
  console.log(r.allPass ? `ALL PASS (head ${head.slice(0,12)})` : `FAIL — stale-head defect present`);
  process.exit(r.allPass ? 0 : 1);
}
