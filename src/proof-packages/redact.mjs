// FounderGate — proof-package: SECRET + PII scanner (fail-closed).
//
// Purpose: a FounderGate proof package is assembled from already-safe evidence and is
// marked PRIVATE (no public sharing). Nothing it emits may ever carry a secret,
// a real phone number, an email address, or any other private-PII shape.
// `assertNoSecret` throws if a secret-shaped token survives; `assertNoPii`
// throws if a PII-shaped value is present; `scan` returns a structured report
// (used by the generator/selftest). This module is the last gate before the
// package JSON is written or trusted.
//
// SAFETY NOTE: git SHAs (7-40 hex), PR numbers, ISO timestamps and branch names
// are NOT secrets/PII and are REQUIRED output — the patterns below deliberately
// do NOT match a bare hex object or a plain integer. They target token PREFIXES,
// header shapes, phone/SSN/credit-card shapes, and email addresses only.
//
// Each pattern is written so THIS source file never itself contains a
// contiguous secret literal or a real phone number (token bodies are separated
// from their prefixes by explicit character classes), so a static scanner stays
// quiet while the patterns still match real values at runtime.

export const REDACTED = '[REDACTED]';

const SECRET_PATTERNS = [
  // Authorization: Bearer <jwt/opaque>
  /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi,
  // JWT-shaped tokens (three dot-separated base64url segments starting ey...)
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g,
  // GitHub tokens: gho_ / ghp_ / ghs_ / ghr_ / ghu_ classic + fine-grained PAT.
  /\bgh[opsru]_[A-Za-z0-9]{16,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  // Generic provider tokens.
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, // slack
  /\bAKIA[0-9A-Z]{12,}/g, // aws access key id
  /\bAIza[0-9A-Za-z_-]{20,}/g, // google api key
  /\bsk-[A-Za-z0-9]{20,}/g, // openai-style
  // key=value / "key": "value" secret fields.
  /((?:client_secret|access_token|refresh_token|api[_-]?key|password|secret|token)\b\s*[:=]\s*["']?)[^"'\s,}]{6,}/gi,
  // PEM private key blocks (collapse the whole block).
  /-----BEGIN[A-Z ]+PRIVATE KEY-----[\s\S]*?-----END[A-Z ]+PRIVATE KEY-----/g,
];

const PII_PATTERNS = [
  // Email address (any local@domain.tld). The package must reference accounts
  // by role-word only ("the disposable box"), never a literal address.
  { name: 'email', re: /\b[A-Za-z0-9._%+-]{1,}@[A-Za-z0-9.-]{1,}\.[A-Za-z]{2,}\b/g },
  // North-American phone shapes: +1 XXXXXXXXXX, (XXX) XXX-XXXX, XXX-XXX-XXXX,
  // XXX.XXX.XXXX. Written with explicit separators so this file holds no real
  // number. A bare 7-40 hex SHA cannot match (requires 3 grouped digit runs).
  { name: 'phone', re: /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g },
  // US SSN shape.
  { name: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g },
  // Credit-card-ish 13-16 digit run (grouped or contiguous).
  { name: 'card', re: /\b(?:\d[ -]?){13,16}\b/g },
];

/**
 * Redact every secret-shaped token in a single string.
 * @param {string} value
 * @returns {string}
 */
export function redactString(value) {
  if (typeof value !== 'string') return value;
  let out = value;
  for (const pat of SECRET_PATTERNS) {
    out = out.replace(pat, (m, g1) => {
      if (typeof g1 === 'string' && g1.length > 0) return g1 + REDACTED;
      return REDACTED;
    });
  }
  return out;
}

/**
 * Deep-walk any JSON value, redacting every string leaf.
 * @param {*} value
 * @returns {*}
 */
export function deepRedact(value) {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(deepRedact);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepRedact(v);
    return out;
  }
  return value;
}

/**
 * Fail-closed: throws if a serialized value still looks like it carries a
 * secret. Returns true otherwise.
 * @param {*} value
 */
export function assertNoSecret(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  for (const pat of SECRET_PATTERNS) {
    pat.lastIndex = 0;
    if (pat.test(s)) {
      throw new Error('SECRET_LEAK: a secret-shaped token is present — refusing to emit the private package');
    }
  }
  return true;
}

/**
 * Fail-closed: throws if a serialized value carries a PII shape (email, phone,
 * SSN, card). Returns true otherwise.
 * @param {*} value
 */
export function assertNoPii(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  for (const { name, re } of PII_PATTERNS) {
    re.lastIndex = 0;
    const m = re.exec(s);
    if (m) {
      throw new Error(`PII_LEAK: a ${name}-shaped value is present — refusing to emit the private package`);
    }
  }
  return true;
}

/**
 * Non-throwing structured scan. Returns { clean, secretHits, piiHits } where
 * hits are pattern NAMES only (never the matched value, so the scan report is
 * itself safe to print). Used by the generator to print a summary line.
 * @param {*} value
 * @returns {{clean:boolean, secretHits:string[], piiHits:string[]}}
 */
export function scan(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  const secretHits = [];
  const piiHits = [];
  for (let i = 0; i < SECRET_PATTERNS.length; i++) {
    const pat = SECRET_PATTERNS[i];
    pat.lastIndex = 0;
    if (pat.test(s)) secretHits.push(`secret#${i}`);
  }
  for (const { name, re } of PII_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(s)) piiHits.push(name);
  }
  return { clean: secretHits.length === 0 && piiHits.length === 0, secretHits, piiHits };
}
