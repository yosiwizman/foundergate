// FounderGate V8-B VB1 — SESSION-TOKEN proof (mint/use/revoke, boot-bound, revocable,
// fail-CLOSED least-privilege). Includes the checker round-1 MEDIUM findings, closed.

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyStore, loadStore, saveStore, mint, use, revoke, REASON } from "./session-token.mjs";

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const T0 = Date.parse("2026-07-12T00:00:00Z");
const mkTok = (s, over = {}) => mint(s, { bootId: "b1", scope: ["run.start"], ttlMs: 60000, now: T0, ...over });

console.log("== VB1 session token ==");

check("never auto-mint: an empty store authorizes nothing", () => {
  const s = emptyStore();
  assert.equal(use(s, "", { bootId: "b1", action: "run.start", now: T0 }).reason, REASON.NO_TOKEN);
  assert.equal(use(s, "vb1t_ghost", { bootId: "b1", action: "run.start", now: T0 }).reason, REASON.NOT_FOUND);
});

check("mint -> use is OK within ttl, correct boot, in scope", () => {
  const s = emptyStore(); const t = mkTok(s);
  assert.equal(use(s, t.id, { bootId: "b1", action: "run.start", now: T0 + 1000 }).reason, REASON.OK);
});

check("use after REVOKE is refused", () => {
  const s = emptyStore(); const t = mkTok(s); revoke(s, t.id);
  assert.equal(use(s, t.id, { bootId: "b1", action: "run.start", now: T0 + 1000 }).reason, REASON.REVOKED);
});

check("use after EXPIRY is refused", () => {
  const s = emptyStore(); const t = mkTok(s, { ttlMs: 1000 });
  assert.equal(use(s, t.id, { bootId: "b1", action: "run.start", now: T0 + 2000 }).reason, REASON.EXPIRED);
});

check("BOOT-BOUND: a token from another boot is refused (no cross-restart reuse — AKIOR #2)", () => {
  const s = emptyStore(); const t = mkTok(s, { bootId: "boot-A" });
  assert.equal(use(s, t.id, { bootId: "boot-B", action: "run.start", now: T0 + 1000 }).reason, REASON.BOOT_MISMATCH);
});

check("OUT_OF_SCOPE: an action outside the token's scope is refused (least-privilege)", () => {
  const s = emptyStore(); const t = mkTok(s, { scope: ["run.start"] });
  assert.equal(use(s, t.id, { bootId: "b1", action: "run.delete", now: T0 + 1000 }).reason, REASON.OUT_OF_SCOPE);
});

// checker MEDIUM-1
check("MEDIUM-1 CLOSED: an unparseable expires_at is MALFORMED (fail-closed), not immortal", () => {
  const s = emptyStore(); const t = mkTok(s); t.expires_at = "whenever";
  assert.equal(use(s, t.id, { bootId: "b1", action: "run.start", now: T0 + 999999999 }).reason, REASON.MALFORMED);
});

// checker MEDIUM-2
check("MEDIUM-2 CLOSED: an EMPTY scope authorizes NOTHING (not a wildcard)", () => {
  const s = emptyStore(); const t = mint(s, { bootId: "b1", scope: [], ttlMs: 60000, now: T0 });
  assert.equal(use(s, t.id, { bootId: "b1", action: "run.delete.EVERYTHING", now: T0 + 1000 }).reason, REASON.OUT_OF_SCOPE);
});

// checker MEDIUM-3
check("MEDIUM-3 CLOSED: a missing action does NOT skip the scope check (OUT_OF_SCOPE)", () => {
  const s = emptyStore(); const t = mkTok(s, { scope: ["run.start"] });
  assert.equal(use(s, t.id, { bootId: "b1", now: T0 + 1000 }).reason, REASON.OUT_OF_SCOPE); // no action
});

check("persistence round-trips; a CORRUPT store authorizes nothing", () => {
  const s = emptyStore(); const t = mkTok(s);
  const path = join(mkdtempSync(join(tmpdir(), "vb1-tok-")), "tokens.json");
  saveStore(path, s);
  const back = loadStore(path);
  assert.deepEqual(back, s);
  assert.equal(use(back, t.id, { bootId: "b1", action: "run.start", now: T0 + 1000 }).reason, REASON.OK);
  writeFileSync(path, "{ not json ]");
  assert.deepEqual(loadStore(path), emptyStore());
});

console.log(`\nV8B1-SESSION-TOKEN: PASS (${pass} checks)`);
