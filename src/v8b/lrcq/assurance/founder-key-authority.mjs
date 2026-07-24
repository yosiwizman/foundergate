// FounderGate LRCQ — governed founder public-key authority loader (FG-LRCQ-ACT-028).
// Strict, fail-closed. Loads the ONE governed authority file (docs/governance/FOUNDER_KEY_AUTHORITY.json),
// validates PUBLIC keys only, recomputes each fingerprint from raw SPKI DER, rejects symlinks/path
// substitution/malformed/duplicate/revoked/multiple-current, and fails closed when no current key exists.
// No env var / CLI flag / arbitrary path may replace this authority file in production.
import { readFileSync, existsSync, lstatSync } from "node:fs";
import { createHash, createPublicKey } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Fixed governed path relative to the repository root (this module lives at src/v8b/lrcq/assurance/).
const REPO = resolve(fileURLToPath(import.meta.url), "../../../../..");
export const AUTHORITY_PATH = "docs/governance/FOUNDER_KEY_AUTHORITY.json";
const AUTHORITY_SCHEMA = "lrcq-founder-key-authority-1";
const FP_RE = /^sha256:[0-9a-f]{64}$/;

export const KEY_CODES = {
  OK: "OK",
  AUTHORITY_MISSING: "AUTHORITY_MISSING",
  AUTHORITY_SYMLINK: "AUTHORITY_SYMLINK",
  AUTHORITY_MALFORMED: "AUTHORITY_MALFORMED",
  AUTHORITY_SCHEMA_MISMATCH: "AUTHORITY_SCHEMA_MISMATCH",
  DUPLICATE_FINGERPRINT: "DUPLICATE_FINGERPRINT",
  MULTIPLE_CURRENT_KEYS: "MULTIPLE_CURRENT_KEYS",
  FINGERPRINT_MISMATCH: "FINGERPRINT_MISMATCH",
  MALFORMED_SPKI: "MALFORMED_SPKI",
  NO_CURRENT_KEY: "NO_CURRENT_KEY",
  KEY_REVOKED: "KEY_REVOKED",
  UNKNOWN_KEY: "UNKNOWN_KEY",
};

export function fingerprintOfSpkiDer(spkiDerBuf) { return "sha256:" + createHash("sha256").update(spkiDerBuf).digest("hex"); }

// deps injectable for tests: { repo, readFile, exists, lstat }
export function loadAuthority(deps = {}) {
  const repo = deps.repo || REPO;
  const abs = resolve(repo, AUTHORITY_PATH);
  const exists = deps.exists || existsSync;
  const lstat = deps.lstat || lstatSync;
  const readFile = deps.readFile || ((p) => readFileSync(p, "utf8"));
  if (!exists(abs)) return { ok: false, code: KEY_CODES.AUTHORITY_MISSING };
  try { if (lstat(abs).isSymbolicLink()) return { ok: false, code: KEY_CODES.AUTHORITY_SYMLINK }; } catch { return { ok: false, code: KEY_CODES.AUTHORITY_MISSING }; }
  let doc; try { doc = JSON.parse(readFile(abs)); } catch { return { ok: false, code: KEY_CODES.AUTHORITY_MALFORMED }; }
  if (!doc || doc.schema !== AUTHORITY_SCHEMA) return { ok: false, code: KEY_CODES.AUTHORITY_SCHEMA_MISMATCH };
  const active = Array.isArray(doc.active_keys) ? doc.active_keys : null;
  const revoked = Array.isArray(doc.revoked_keys) ? doc.revoked_keys : null;
  if (!active || !revoked) return { ok: false, code: KEY_CODES.AUTHORITY_MALFORMED };
  const seen = new Set(); const parsed = [];
  const revokedFps = new Set(revoked.map((r) => (r && r.fingerprint) || "").filter(Boolean));
  for (const e of active) {
    if (!e || !FP_RE.test(e.fingerprint || "") || e.algorithm !== "ed25519" || typeof e.public_key_spki_b64 !== "string") return { ok: false, code: KEY_CODES.AUTHORITY_MALFORMED };
    if (seen.has(e.fingerprint)) return { ok: false, code: KEY_CODES.DUPLICATE_FINGERPRINT };
    seen.add(e.fingerprint);
    if (revokedFps.has(e.fingerprint)) return { ok: false, code: KEY_CODES.KEY_REVOKED, detail: e.fingerprint };
    let der, keyObj;
    try { der = Buffer.from(e.public_key_spki_b64, "base64"); keyObj = createPublicKey({ key: der, format: "der", type: "spki" }); } catch { return { ok: false, code: KEY_CODES.MALFORMED_SPKI, detail: e.fingerprint }; }
    if (keyObj.asymmetricKeyType !== "ed25519") return { ok: false, code: KEY_CODES.MALFORMED_SPKI, detail: "not ed25519" };
    if (fingerprintOfSpkiDer(der) !== e.fingerprint) return { ok: false, code: KEY_CODES.FINGERPRINT_MISMATCH, detail: e.fingerprint };
    parsed.push({ fingerprint: e.fingerprint, keyObject: keyObj, current: e.current === true });
  }
  const current = parsed.filter((k) => k.current);
  const maxCurrent = typeof doc.max_current_keys === "number" ? doc.max_current_keys : 1;
  if (current.length > maxCurrent || current.length > 1) return { ok: false, code: KEY_CODES.MULTIPLE_CURRENT_KEYS };
  return { ok: true, code: KEY_CODES.OK, keys: parsed, current: current[0] || null, revoked: [...revokedFps] };
}

// Resolve the ONE current founder key, fail-closed. Returns { ok, code, key:{fingerprint,keyObject} }.
export function currentFounderKey(deps = {}) {
  const a = loadAuthority(deps);
  if (!a.ok) return a;
  if (!a.current) return { ok: false, code: KEY_CODES.NO_CURRENT_KEY };
  return { ok: true, code: KEY_CODES.OK, key: a.current };
}

// Verify a fingerprint is a known, non-revoked, current key. Returns the keyObject or a fail code.
export function resolveVerifierKey(fingerprint, deps = {}) {
  const a = loadAuthority(deps);
  if (!a.ok) return a;
  if (a.revoked.includes(fingerprint)) return { ok: false, code: KEY_CODES.KEY_REVOKED };
  const k = a.keys.find((x) => x.fingerprint === fingerprint);
  if (!k) return { ok: false, code: KEY_CODES.UNKNOWN_KEY };
  if (!k.current) return { ok: false, code: KEY_CODES.UNKNOWN_KEY, detail: "not current" };
  return { ok: true, code: KEY_CODES.OK, key: k };
}
