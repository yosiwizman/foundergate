// FounderGate V8-B VB1 — SESSION-TOKEN proof (mint/use/revoke, boot-bound, revocable).

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyStore, loadStore, saveStore, mint, use, revoke, REASON } from "./session-token.mjs";

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const T0 = Date.parse("2026-07-12T00:00:00Z");

console.log("== VB1 session token ==");

check("never auto-mint: an empty store authorizes nothing (NO_TOKEN / NOT_FOUND)", () => {
  const s = emptyStore();
  assert.equal(use(s, "", { bootId: "b1", now: T0 }).reason, REASON.NO_TOKEN);
  assert.equal(use(s, "vb1t_ghost", { bootId: "b1", now: T0 }).reason, REASON.NOT_FOUND);
});

check("mint -> use is OK within ttl, correct boot, in scope", () => {
  const s = emptyStore();
  const t = mint(s, { bootId: "b1", scope: ["run.start"], ttlMs: 60000, now: T0 });
  assert.equal(use(s, t.id, { bootId: "b1", action: "run.start", now: T0 + 1000 }).reason, REASON.OK);
});

check("use after REVOKE is refused", () => {
  const s = emptyStore();
  const t = mint(s, { bootId: "b1", ttlMs: 60000, now: T0 });
  revoke(s, t.id);
  assert.equal(use(s, t.id, { bootId: "b1", now: T0 + 1000 }).reason, REASON.REVOKED);
});

check("use after EXPIRY is refused", () => {
  const s = emptyStore();
  const t = mint(s, { bootId: "b1", ttlMs: 1000, now: T0 });
  assert.equal(use(s, t.id, { bootId: "b1", now: T0 + 2000 }).reason, REASON.EXPIRED);
});

check("BOOT-BOUND: a token from another boot is refused (no cross-restart reuse — AKIOR #2)", () => {
  const s = emptyStore();
  const t = mint(s, { bootId: "boot-A", ttlMs: 60000, now: T0 });
  assert.equal(use(s, t.id, { bootId: "boot-B", now: T0 + 1000 }).reason, REASON.BOOT_MISMATCH);
});

check("OUT_OF_SCOPE: an action outside the token's scope is refused (least-privilege)", () => {
  const s = emptyStore();
  const t = mint(s, { bootId: "b1", scope: ["run.start"], ttlMs: 60000, now: T0 });
  assert.equal(use(s, t.id, { bootId: "b1", action: "run.delete", now: T0 + 1000 }).reason, REASON.OUT_OF_SCOPE);
});

check("persistence round-trips; a CORRUPT store authorizes nothing", () => {
  const s = emptyStore();
  const t = mint(s, { bootId: "b1", ttlMs: 60000, now: T0 });
  const path = join(mkdtempSync(join(tmpdir(), "vb1-tok-")), "tokens.json");
  saveStore(path, s);
  const back = loadStore(path);
  assert.deepEqual(back, s);
  assert.equal(use(back, t.id, { bootId: "b1", now: T0 + 1000 }).reason, REASON.OK);
  writeFileSync(path, "{ not json ]");
  assert.deepEqual(loadStore(path), emptyStore());
});

console.log(`\nV8B1-SESSION-TOKEN: PASS (${pass} checks)`);
