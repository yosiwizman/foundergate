// FounderGate claim-blocker (read-only). Scans given files for FORBIDDEN positive claims and flags
// only NON-negated assertions. Negated / disclaimer forms ("not production-ready", "no SaaS claims",
// "NOT AUTHORIZED", "REQUIRED") are allowed. Exits non-zero if any positive claim survives.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = [
  /production[- ]ready/i, /secure\s*\/\s*compliant/i, /security\/compliance ready/i,
  /saas[- ]ready/i, /customer[- ]ready/i, /commercially validated/i, /commercial readiness/i,
  /paid proof/i, /market validat(ed|ion)/i, /deploy[- ]ready/i, /calendar integration live/i,
  /private repo ready/i,
];
// negation / disclaimer markers that make a line safe
const NEG = /\b(not|no|never|without|n't|blocked|forbidden|required|pause[ds]?|paused|remain|remains|remaining|awaits?)\b|NOT[_ ]|not claimed|not authorized|display[- ]only|planning only/i;

function walk(dir, acc=[]) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) { const p = join(dir, e); const st = statSync(p);
    if (st.isDirectory()) walk(p, acc); else if (/\.(md|html|mjs|js|txt|json)$/.test(e)) acc.push(p); }
  return acc;
}

const targets = process.argv.slice(2);
const files = targets.flatMap(t => { const st = existsSync(t) && statSync(t); return st && st.isDirectory() ? walk(t) : (existsSync(t) ? [t] : []); });
const violations = [];
for (const f of files) {
  if (/claim-blocker\.mjs$/.test(f)) continue; // skip the blocker's own source (it enumerates the blocklist)
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    if (FORBIDDEN.some(r => r.test(ln)) && !NEG.test(ln)) violations.push(`${f}:${i+1}: ${ln.trim().slice(0,120)}`);
  });
}
const report = { kind: 'foundergate-claim-blocker', files_scanned: files.length, violations, clean: violations.length === 0 };
console.log(JSON.stringify(report, null, 2));
process.exit(violations.length === 0 ? 0 : 1);
