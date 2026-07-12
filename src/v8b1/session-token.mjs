// FounderGate V8-B VB1 — SESSION TOKEN (mint / use / revoke), boot-bound, revocable.
//
// Adopts the AKIOR session-token pattern (#2, docs/lanes/authority/akior-harness-harvest-
// report.md): the founder mints a short-lived, BOOT-BOUND, revocable on-disk session; any
// use is cross-checked (8-value reason enum) and REFUSED unless valid; revoke at end. This
// is a sensitive VB1 path — its whole job is to gate an executor action behind a live,
// founder-authorized, revocable session. Like VB0, it NEVER auto-mints: no token exists
// until mint(); an unminted/expired/revoked/wrong-boot token is refused.
//
// Pure Node, zero-dependency. `now`/`bootId` are passed in as DATA (deterministic tests).
// This module holds NO executor; it only answers "is this session allowed to act?".

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

// 8-value reason enum (AKIOR pattern) — every use() returns exactly one.
export const REASON = Object.freeze({
  OK: "OK", NO_TOKEN: "NO_TOKEN", NOT_FOUND: "NOT_FOUND", REVOKED: "REVOKED",
  EXPIRED: "EXPIRED", BOOT_MISMATCH: "BOOT_MISMATCH", OUT_OF_SCOPE: "OUT_OF_SCOPE", MALFORMED: "MALFORMED",
});

export function emptyStore() { return { schema_version: "1.0.0", tokens: [] }; }

export function loadStore(path) {
  if (!existsSync(path)) return emptyStore();
  try {
    const r = JSON.parse(readFileSync(path, "utf8"));
    return { schema_version: r.schema_version || "1.0.0", tokens: Array.isArray(r.tokens) ? r.tokens : [] };
  } catch { return emptyStore(); } // corrupt -> empty; a corrupt store NEVER authorizes
}

export function saveStore(path, store) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store, null, 2) + "\n");
}

// Founder-initiated mint. Short-lived (ttlMs), boot-bound (bootId), least-privilege
// (scope allowlist). NEVER auto-minted — this is the only creation path.
export function mint(store, { bootId, scope = [], ttlMs = 15 * 60 * 1000, now = Date.now() } = {}) {
  if (typeof bootId !== "string" || !bootId) throw new Error("mint requires a bootId (boot-bound)");
  if (!(ttlMs > 0)) throw new Error("ttlMs must be > 0");
  const token = {
    id: "vb1t_" + randomUUID(),
    boot_id: bootId,
    scope: Array.isArray(scope) ? [...scope] : [],
    minted_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttlMs).toISOString(),
    revoked: false,
  };
  store.tokens.push(token);
  return token;
}

// Is this session allowed to act on `action`? Returns { ok, reason } — exactly one of the
// 8 reasons. Valid ONLY when the token exists, is not revoked, is not expired, is bound to
// the CURRENT boot, and its scope covers the action.
export function use(store, id, { bootId, action, now = Date.now() } = {}) {
  if (typeof id !== "string" || !id) return { ok: false, reason: REASON.NO_TOKEN };
  const t = (store && Array.isArray(store.tokens) ? store.tokens : []).find((x) => x.id === id);
  if (!t) return { ok: false, reason: REASON.NOT_FOUND };
  if (!t.boot_id || !t.expires_at || !Array.isArray(t.scope)) return { ok: false, reason: REASON.MALFORMED };
  // checker MEDIUM-1: an unparseable expiry is MALFORMED (fail-CLOSED), never immortal.
  const exp = Date.parse(t.expires_at);
  if (!Number.isFinite(exp)) return { ok: false, reason: REASON.MALFORMED };
  if (t.revoked) return { ok: false, reason: REASON.REVOKED };
  if (exp <= now) return { ok: false, reason: REASON.EXPIRED };
  if (t.boot_id !== bootId) return { ok: false, reason: REASON.BOOT_MISMATCH }; // boot-bound: no cross-restart reuse
  // checker MEDIUM-2/3: least-privilege, fail-CLOSED — a token authorizes ONLY an
  // EXPLICIT action listed in its NON-EMPTY scope. An empty scope, or a missing action,
  // authorizes NOTHING (empty-scope is not a wildcard; omitting the action is not a skip).
  if (action == null || t.scope.length === 0 || !t.scope.includes(action)) return { ok: false, reason: REASON.OUT_OF_SCOPE };
  return { ok: true, reason: REASON.OK };
}

// Revoke — irreversible; any subsequent use() returns REVOKED.
export function revoke(store, id) {
  const t = store.tokens.find((x) => x.id === id);
  if (t) t.revoked = true;
  return store;
}
