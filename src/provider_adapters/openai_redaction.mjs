// FounderGate — OpenAI redaction + secret safety (LOCAL / DETERMINISTIC). Never lets a secret into evidence.
import { createHash } from 'node:crypto';
export function sha256(s){return createHash('sha256').update(typeof s==='string'?s:JSON.stringify(s)).digest('hex');}

// patterns that must never appear in evidence
const PATTERNS = [
  [/sk-[A-Za-z0-9_\-]{20,}/g, '[REDACTED_OPENAI_KEY]'],
  [/Bearer\s+[A-Za-z0-9_\-\.=]+/gi, 'Bearer [REDACTED_TOKEN]'],
  [/Authorization\s*:\s*[^\n"]+/gi, 'Authorization: [REDACTED]'],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]'],
  [/\b(?:\+?\d[\d\-\s().]{7,}\d)\b/g, '[REDACTED_PHONE]'],
  [/\/Users\/[A-Za-z0-9._\-]+/g, '/Users/[REDACTED_USER]'],
];
export function redact(input){
  let s = typeof input==='string' ? input : JSON.stringify(input);
  for(const [re,rep] of PATTERNS) s = s.replace(re, rep);
  return s;
}
// secret scan: returns clean=false if any raw secret pattern survives
export function secretScan(text){
  const s = typeof text==='string'?text:JSON.stringify(text);
  const hits = [];
  if(/sk-[A-Za-z0-9_\-]{20,}/.test(s)) hits.push('openai_key');
  if(/Bearer\s+[A-Za-z0-9_\-\.=]{10,}/.test(s)) hits.push('bearer_token');
  if(/Authorization\s*:\s*Bearer/i.test(s)) hits.push('authorization_header');
  return { record_type:'secret_scan', clean: hits.length===0, hits };
}
export function fingerprint(x){ return 'fp_'+sha256(x).slice(0,24); }
