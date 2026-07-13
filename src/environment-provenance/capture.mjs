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
// NO-LEAK DISCIPLINE (this is the no-leak lane — lead by example):
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
// This is the mandated pattern from the build brief; it is deliberately broad (fail-safe).
export const SECRET_NAME_RE = /secret|token|key|credential|password|passwd|auth|api[-_]?key/i;

// VALUE heuristics — a value that looks like a credential is redacted even under an innocuous
// name. Over-redaction is the safe failure mode for the no-leak lane.
const SECRET_VALUE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM private key block
  /^ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./, // JWT (header.payload.signature)
  /^(sk|pk|rk|ak)[-_][A-Za-z0-9]{16,}$/i, // sk-/pk- style API keys
  /^gh[pousr]_[A-Za-z0-9]{20,}$/, // GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_)
  /^xox[baprs]-[A-Za-z0-9-]{10,}$/, // Slack tokens
  /^AKIA[0-9A-Z]{16}$/, // AWS access key id
  /^AIza[0-9A-Za-z_-]{30,}$/, // Google API key
  /(secret|token|password|passwd|credential)/i, // literal secret words inside the value
];

// Does the VALUE look like a credential? Long high-entropy strings and known token shapes.
export function looksLikeSecretValue(value) {
  if (typeof value !== "string") return false;
  if (value === REDACTED || value === UNKNOWN) return false; // our own sentinels are safe
  for (const re of SECRET_VALUE_PATTERNS) {
    if (re.test(value)) return true;
  }
  // Long, high-entropy base64/hex-ish blobs (>= 24 chars, mixed classes) look like secrets.
  if (value.length >= 24 && /^[A-Za-z0-9+/=_-]+$/.test(value)) {
    const classes =
      (/[a-z]/.test(value) ? 1 : 0) +
      (/[A-Z]/.test(value) ? 1 : 0) +
      (/[0-9]/.test(value) ? 1 : 0);
    if (classes >= 2) return true;
  }
  if (value.length >= 32 && /^[0-9a-f]+$/i.test(value)) return true; // long hex digest
  return false;
}

// Does the NAME look secret-shaped? Such a name is EXCLUDED entirely (never captured).
export function isSecretName(name) {
  return typeof name === "string" && SECRET_NAME_RE.test(name);
}

// Normalise a caller-supplied `now` (DATA) into an ISO instant, or UNKNOWN if unreadable.
// Accepts an ISO string, an epoch-ms number, or a Date. Never reads a real clock.
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
  const iso = d.toISOString();
  return iso;
}

// A scalar field is passed straight through as DATA, or UNKNOWN when absent/unreadable.
function scalarOrUnknown(v) {
  if (v == null) return UNKNOWN;
  if (typeof v === "string") return v.length === 0 ? UNKNOWN : v;
  if (typeof v === "number") return Number.isFinite(v) ? v : UNKNOWN;
  return UNKNOWN;
}

/**
 * Capture environment provenance from DATA inputs. PURE — no ambient reads.
 *
 * @param {object}  p
 * @param {object}  [p.env]         env vars to consider — read ONLY through `allowlist`.
 * @param {string}  [p.platform]    e.g. "darwin" (DATA; UNKNOWN if absent).
 * @param {string}  [p.arch]        e.g. "arm64" (DATA; UNKNOWN if absent).
 * @param {number}  [p.cpuCount]    CPU count (DATA; UNKNOWN if absent).
 * @param {number}  [p.totalMem]    total memory in bytes (DATA; UNKNOWN if absent).
 * @param {string}  [p.nodeVersion] e.g. "v24.0.0" (DATA; UNKNOWN if absent — never read from
 *                                   process.version in the pure path).
 * @param {string|number|Date} [p.now] capture instant (DATA; UNKNOWN if absent/unparseable).
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
    cpu_count: scalarOrUnknown(cpuCount),
    total_mem: scalarOrUnknown(totalMem),
    env_allowlisted,
    captured_at: normaliseCapturedAt(now),
  };
}

/**
 * Self-check: assert a provenance record leaks NO secret-shaped name and NO secret-shaped value.
 * This bites on a crafted leak. Throws on any violation; returns a summary on a clean record.
 *
 * @param {object} provenance a record produced by captureEnvironmentProvenance (or hand-crafted).
 * @returns {{ok:true, names_checked:number, values_checked:number}}
 * @throws {Error} if any secret-shaped name or value is present.
 */
export function verifyNoSecrets(provenance) {
  if (!provenance || typeof provenance !== "object") {
    throw new Error("verifyNoSecrets: provenance is not an object");
  }
  const bag = provenance.env_allowlisted;
  if (bag != null && typeof bag !== "object") {
    throw new Error("verifyNoSecrets: env_allowlisted is not an object");
  }
  const entries = bag ? Object.entries(bag) : [];
  let names_checked = 0;
  let values_checked = 0;
  for (const [name, value] of entries) {
    names_checked++;
    if (isSecretName(name)) {
      throw new Error(`verifyNoSecrets: LEAK — secret-shaped name present: "${name}"`);
    }
    values_checked++;
    if (looksLikeSecretValue(value)) {
      // Do NOT echo the offending value into the error — that would itself leak it.
      throw new Error(`verifyNoSecrets: LEAK — secret-shaped value under name "${name}"`);
    }
  }
  // Defence in depth: the top-level scalar fields must never carry a secret-shaped value either.
  for (const k of ["node_version", "platform", "arch", "total_mem"]) {
    const v = provenance[k];
    if (looksLikeSecretValue(v)) {
      throw new Error(`verifyNoSecrets: LEAK — secret-shaped value in field "${k}"`);
    }
  }
  return { ok: true, names_checked, values_checked };
}
