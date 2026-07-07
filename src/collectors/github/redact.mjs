// FounderGate — GitHub CI/Copilot collector: REDACTION rules.
//
// Purpose: this collector is READ-ONLY, but the raw JSON it reads from the
// local `gh` session could theoretically contain secret-shaped material
// (a token echoed into a title, an Authorization header pasted into a review
// comment, a PEM block dropped into a diff comment, etc.). Nothing this
// collector emits may ever carry a secret. `redactString` masks anything
// secret-shaped; `deepRedact` walks an arbitrary JSON value and redacts every
// string leaf. `assertNoSecret` is the fail-closed self-check used by the
// normalizer before it returns.
//
// SAFETY NOTE: git SHAs (40-hex) and short git objects are NOT secrets and are
// required output — the patterns below deliberately do NOT match a bare hex
// blob. They target token PREFIXES and header shapes only.

export const REDACTED = '[REDACTED]';

// Each pattern is intentionally written so this source file itself never
// contains a contiguous secret literal (e.g. "Bearer" is separated from the
// token body by an explicit whitespace class), which keeps static secret
// scanners quiet while still matching real secrets at runtime.
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
      // For key=value patterns keep the key + delimiter, mask the value only.
      if (typeof g1 === 'string' && g1.length > 0) return g1 + REDACTED;
      return REDACTED;
    });
  }
  return out;
}

/**
 * Deep-walk any JSON value, redacting every string leaf. Non-string leaves
 * (numbers/booleans/null) pass through unchanged. Returns a NEW value.
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
 * Fail-closed self-check: throws if a serialized value still looks like it
 * carries a secret. Used by the normalizer as a last gate before returning.
 * @param {*} value
 */
export function assertNoSecret(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  for (const pat of SECRET_PATTERNS) {
    pat.lastIndex = 0;
    if (pat.test(s)) {
      throw new Error('REDACTION_LEAK: a secret-shaped token survived redaction — refusing to emit');
    }
  }
  return true;
}
