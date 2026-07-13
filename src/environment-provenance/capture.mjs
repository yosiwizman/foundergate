// L3 — ENVIRONMENT PROVENANCE (evidence-integrity infrastructure, SENSITIVE).
//
// Purpose: capture the environment a run executed in — so a future §29 soak's result is
// interpretable — WITHOUT ever leaking a secret. This module gates every future §29 soak.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 708b034fc87ec2841a7da427e7de2bcb72b18743
//   §26 (append-only evidence + exact-SHA provenance) and Law 54 (honest UNKNOWN — never guess).
//
// PURITY (build brief): the capture path is PURE. Inputs are DATA passed in — `env`, `platform`,
// `now`, etc. are parameters. This module performs ZERO ambient reads (no process.env, no os.*,
// no clock read). Because it is pure and does no heavy work, it needs no SHWL lease guard. Any
// HEAVY entry point built on top of this MUST import + call the accepted src/shwl guard first.
//
// NO-LEAK DISCIPLINE — POSTURE: OVER-REDACT, NEVER UNDER-REDACT.
//   1. The FULL env is NEVER captured. Only names in the explicit `allowlist` are considered.
//   2. ANY secret-shaped NAME is EXCLUDED even if allowlisted (fail-safe, over-exclude).
//   3. A value that LOOKS secret-shaped is REDACTED — the raw secret value is never emitted.
//   4. Unknown / unreadable / unset fields become UNKNOWN — never guessed (Law 54).

export const SCHEMA_VERSION = "env-provenance.v1";

// The honest sentinel for a field we cannot read. Never a guess (Law 54).
export const UNKNOWN = "UNKNOWN";

// The redaction sentinel emitted in place of a secret-shaped value. The raw value never appears.
export const REDACTED = "[REDACTED]";

// A NAME matching this is secret-shaped and is EXCLUDED from capture — even if allowlisted.
// Deliberately broad (fail-safe / over-exclude). F4: extended with passphrase/session/bearer/
// cookie/signature/private/salt/pin.
export const SECRET_NAME_RE =
  /secret|token|key|credential|password|passwd|auth|api[-_]?key|passphrase|session|bearer|cookie|signature|private|salt|pin/i;

// Length at/above which a value is redacted unless it is a plainly-benign shape (F1c: over-redact).
const OVER_REDACT_LEN = 16;

// STRONG positive signals — a value matching ANY of these is a credential regardless of length or
// surrounding punctuation (no ^…$ anchoring; substring match, F1b). The token-prefix patterns are
// deliberately independent so each F5 low-entropy fixture is caught by ONLY its own pattern.
const STRONG_SECRET_PATTERNS = [
  /:\/\/[^/@\s]*:[^/@\s]*@/, // F1a: credential URL — scheme://user:pass@host (or ://:pass@host)
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/, // PEM private key block
  /ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./, // JWT (header.payload.signature) — substring ok
  /\b(sk|pk|rk|ak)[-_][A-Za-z0-9]{3,}/i, // sk-/pk- style API keys (e.g. sk-abc123)
  /\bgh[pousr]_[A-Za-z0-9]{6,}/, // GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_)
  /\bxox[baprs]-[A-Za-z0-9-]{4,}/, // Slack tokens
  /\bAKIA[0-9A-Z]{8,}/, // AWS access key id
  /\bAIza[0-9A-Za-z_-]{6,}/, // Google API key
  /(secret|token|password|passwd|credential|passphrase|bearer)/i, // literal secret words inside value
];

// Plainly-benign shapes that must NEVER be treated as secrets even when long — this protects the
// provenance record's OWN fields under the F2 deep walk (ISO instants, versions, schema id, locales).
const BENIGN_VALUE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/, // ISO-8601 datetime
  /^v?\d+(\.\d+)+([.\-+][A-Za-z0-9]+)*$/, // version / semver (v24.13.1, 1.2.3-rc1)
  /^[a-z][a-z0-9]*(-[a-z0-9]+)*\.v\d+$/i, // schema id (env-provenance.v1)
  /^[a-z]{2,3}([_-][A-Za-z0-9]+)*(\.[A-Za-z0-9-]+)?$/i, // locale (en_US.UTF-8)
];

function isBenignShape(value) {
  for (const re of BENIGN_VALUE_PATTERNS) if (re.test(value)) return true;
  return false;
}

// Does the VALUE look like a credential? POSTURE: over-redact. Credential URLs, known token
// shapes, high-entropy substrings, punctuated mixed-class blobs, and anything long-and-not-benign
// all trigger.
export function looksLikeSecretValue(value) {
  if (typeof value !== "string") return false;
  if (value === REDACTED || value === UNKNOWN) return false; // our own sentinels are safe

  // Strong signals fire regardless of length or surrounding punctuation (F1b: no ^…$ anchoring).
  for (const re of STRONG_SECRET_PATTERNS) if (re.test(value)) return true;

  // High-entropy SUBSTRING (not anchored): a long base64-ish run embedded anywhere.
  const run = value.match(/[A-Za-z0-9+/=_-]{20,}/);
  if (run) {
    const m = run[0];
    const classes =
      (/[a-z]/.test(m) ? 1 : 0) + (/[A-Z]/.test(m) ? 1 : 0) + (/[0-9]/.test(m) ? 1 : 0);
    if (classes >= 2) return true;
  }
  if (/[0-9a-f]{32,}/i.test(value)) return true; // long hex digest substring

  // An all-alphanumeric mixed-class blob (upper + lower + digit, no separators) looks like a
  // password/token even when short (e.g. TigerTiger99).
  if (
    value.length >= 8 &&
    /^[A-Za-z0-9]+$/.test(value) &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value)
  ) {
    return true;
  }

  // Plainly-benign shapes (ISO instants, versions, schema id, locales) are safe even when long.
  if (isBenignShape(value)) return false;

  // F1c — OVER-REDACT: anything at/above the length threshold that isn't plainly benign.
  if (value.length >= OVER_REDACT_LEN) return true;

  return false;
}

// Does the NAME look secret-shaped? Such a name is EXCLUDED entirely (never captured).
export function isSecretName(name) {
  return typeof name === "string" && SECRET_NAME_RE.test(name);
}

// Normalise a caller-supplied `now` (DATA) into an ISO instant, or UNKNOWN if unreadable.
// TOTAL FUNCTION (F3): never throws — an invalid / out-of-range `now` yields UNKNOWN (Law 54).
function normaliseCapturedAt(now) {
  if (now == null) return UNKNOWN;
  let d;
  if (now instanceof Date) d = now;
  else if (typeof now === "number" && Number.isFinite(now)) d = new Date(now);
  else if (typeof now === "string") {
    const parsed = Date.parse(now);
    if (Number.isNaN(parsed)) return UNKNOWN; // unparseable => honest UNKNOWN, not a guess
    d = new Date(parsed);
  } else return UNKNOWN;
  // F3: invalid / out-of-range Date (e.g. new Date(1e300)) => UNKNOWN, never a RangeError throw.
  if (Number.isNaN(d.getTime())) return UNKNOWN;
  return d.toISOString();
}

// A scalar STRING/label field is passed straight through as DATA, or UNKNOWN when absent/empty.
function scalarOrUnknown(v) {
  if (v == null) return UNKNOWN;
  if (typeof v === "string") return v.length === 0 ? UNKNOWN : v;
  if (typeof v === "number") return Number.isFinite(v) ? v : UNKNOWN;
  return UNKNOWN;
}

// A NUMERIC field coerces to a finite number or UNKNOWN (F2): an arbitrary string NEVER passes
// through — so a secret can never ride in via cpu_count / total_mem.
function numberOrUnknown(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : UNKNOWN;
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim())) {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : UNKNOWN;
  }
  return UNKNOWN;
}

/**
 * Capture environment provenance from DATA inputs. PURE — no ambient reads.
 *
 * @param {object}  p
 * @param {object}  [p.env]         env vars to consider — read ONLY through `allowlist`.
 * @param {string}  [p.platform]    e.g. "darwin" (DATA; UNKNOWN if absent).
 * @param {string}  [p.arch]        e.g. "arm64" (DATA; UNKNOWN if absent).
 * @param {number}  [p.cpuCount]    CPU count (number-or-UNKNOWN; strings never pass through).
 * @param {number}  [p.totalMem]    total memory in bytes (number-or-UNKNOWN).
 * @param {string}  [p.nodeVersion] e.g. "v24.0.0" (DATA; UNKNOWN if absent — never read from
 *                                   process.version in the pure path).
 * @param {string|number|Date} [p.now] capture instant (DATA; UNKNOWN if absent/invalid).
 * @param {string[]} [p.allowlist]  the ONLY env names ever considered. Secret-shaped names in
 *                                   this list are still excluded.
 * @returns {object} provenance record. Never contains a secret name or a raw secret value.
 */
export function captureEnvironmentProvenance({
  env = {},
  platform,
  arch,
  cpuCount,
  totalMem,
  nodeVersion,
  now,
  allowlist = [],
} = {}) {
  const safeEnv = env && typeof env === "object" ? env : {};
  const names = Array.isArray(allowlist) ? allowlist : [];

  const env_allowlisted = {};
  for (const name of names) {
    if (typeof name !== "string" || name.length === 0) continue;
    // Rule 2: a secret-shaped NAME is EXCLUDED even if allowlisted — it never enters the output.
    if (isSecretName(name)) continue;
    // Only names on the allowlist are ever considered — the full env is never enumerated.
    if (!Object.prototype.hasOwnProperty.call(safeEnv, name)) {
      // Rule 4: allowlisted but unset/unreadable => honest UNKNOWN (Law 54), never guessed.
      env_allowlisted[name] = UNKNOWN;
      continue;
    }
    const raw = safeEnv[name];
    const value = typeof raw === "string" ? raw : scalarOrUnknown(raw);
    // Rule 3: a value that looks secret-shaped is REDACTED — the raw secret never appears.
    env_allowlisted[name] = looksLikeSecretValue(value) ? REDACTED : value;
  }

  return {
    schema_version: SCHEMA_VERSION,
    node_version: scalarOrUnknown(nodeVersion),
    platform: scalarOrUnknown(platform),
    arch: scalarOrUnknown(arch),
    cpu_count: numberOrUnknown(cpuCount),
    total_mem: numberOrUnknown(totalMem),
    env_allowlisted,
    captured_at: normaliseCapturedAt(now),
  };
}

/**
 * Self-check: DEEP-WALK the entire provenance object and assert it leaks NO secret-shaped name
 * and NO secret-shaped value ANYWHERE (F2). `isSecretName` runs on EVERY key; `looksLikeSecretValue`
 * runs on EVERY string leaf — recursing into nested objects and arrays. No hard-coded field list.
 * Bites on any crafted leak. Throws on any violation; returns a summary on a clean record.
 *
 * @param {object} provenance a record produced by captureEnvironmentProvenance (or hand-crafted).
 * @returns {{ok:true, names_checked:number, values_checked:number}}
 * @throws {Error} if any secret-shaped name or value is present anywhere in the object.
 */
export function verifyNoSecrets(provenance) {
  if (!provenance || typeof provenance !== "object") {
    throw new Error("verifyNoSecrets: provenance is not an object");
  }
  let names_checked = 0;
  let values_checked = 0;
  const seen = new WeakSet();

  const walk = (node, path) => {
    if (typeof node === "string") {
      values_checked++;
      if (looksLikeSecretValue(node)) {
        // Do NOT echo the offending value — that would itself leak it. Name the path only.
        throw new Error(`verifyNoSecrets: LEAK — secret-shaped value at "${path || "<root>"}"`);
      }
      return;
    }
    if (node == null || typeof node !== "object") return; // number/boolean/null: nothing to leak
    if (seen.has(node)) return; // defend against a crafted cyclic object
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      names_checked++;
      if (isSecretName(k)) {
        throw new Error(`verifyNoSecrets: LEAK — secret-shaped name present: "${k}"`);
      }
      walk(v, path ? `${path}.${k}` : k);
    }
  };

  walk(provenance, "");
  return { ok: true, names_checked, values_checked };
}
