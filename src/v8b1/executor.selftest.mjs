// FounderGate V8-B VB1 — EXECUTOR containment proof. Encodes the checker's attack list:
// act without a wired approval, act beyond the approval, act with no evidence/backup, act
// with a reused/revoked token, act on a non-rollback-able action — all REFUSED, and the
// mutate() side effect NEVER runs on a refusal.

import assert from "node:assert/strict";
import { emptyStore, mint, revoke } from "./session-token.mjs";
import { act, actEdgeWired, REFUSE } from "./executor.mjs";
import { backupStores } from "./rollback.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const T0 = Date.parse("2026-07-12T00:00:00Z");

function fixture() {
  const store = emptyStore();
  const tok = mint(store, { bootId: "b1", scope: ["run.start"], ttlMs: 60000, now: T0 });
  const bdir = join(mkdtempSync(join(tmpdir(), "vb1-ex-")), "backup");
  const backup = backupStores([join(bdir, "..", "run_state.json")], bdir);
  let ran = 0; const mutate = () => { ran++; return "mutated"; };
  const wired = { wired: true, work: "run.start#1", rollbackable: true, recorded_by: "founder" };
  return { store, tok, backup, mutate, wired, ran: () => ran };
}

console.log("== VB1 executor containment ==");

check("act with NO token is refused (NO_TOKEN); mutate never runs", () => {
  const f = fixture();
  const r = act({ tokenStore: f.store, tokenId: "", bootId: "b1", action: "run.start", work: "run.start#1", approval: f.wired, backup: f.backup, mutate: f.mutate }, { now: T0 + 1 });
  assert.equal(r.ok, false); assert.equal(r.reason, REFUSE.NO_TOKEN); assert.equal(f.ran(), 0);
});

check("act with a REVOKED token is refused (TOKEN_INVALID); mutate never runs", () => {
  const f = fixture(); revoke(f.store, f.tok.id);
  const r = act({ tokenStore: f.store, tokenId: f.tok.id, bootId: "b1", action: "run.start", work: "run.start#1", approval: f.wired, backup: f.backup, mutate: f.mutate }, { now: T0 + 1 });
  assert.equal(r.reason, REFUSE.TOKEN_INVALID); assert.equal(r.detail, "REVOKED"); assert.equal(f.ran(), 0);
});

check("ACT EDGE: valid token but NO wired approval is refused (NO_WIRED_APPROVAL) — VB1 cannot execute", () => {
  const f = fixture();
  const r = act({ tokenStore: f.store, tokenId: f.tok.id, bootId: "b1", action: "run.start", work: "run.start#1", approval: null, backup: f.backup, mutate: f.mutate }, { now: T0 + 1 });
  assert.equal(r.reason, REFUSE.NO_WIRED_APPROVAL); assert.equal(f.ran(), 0);
  assert.equal(actEdgeWired(null), false, "the act edge must read as UNWIRED in VB1");
});

check("act BEYOND the approval (wired for other work) is refused (APPROVAL_MISMATCH)", () => {
  const f = fixture();
  const otherWired = { wired: true, work: "run.delete#9", rollbackable: true };
  const r = act({ tokenStore: f.store, tokenId: f.tok.id, bootId: "b1", action: "run.start", work: "run.start#1", approval: otherWired, backup: f.backup, mutate: f.mutate }, { now: T0 + 1 });
  assert.equal(r.reason, REFUSE.APPROVAL_MISMATCH); assert.equal(f.ran(), 0);
});

check("act with NO backup evidence is refused (NO_BACKUP)", () => {
  const f = fixture();
  const r = act({ tokenStore: f.store, tokenId: f.tok.id, bootId: "b1", action: "run.start", work: "run.start#1", approval: f.wired, backup: null, mutate: f.mutate }, { now: T0 + 1 });
  assert.equal(r.reason, REFUSE.NO_BACKUP); assert.equal(f.ran(), 0);
});

check("act on a NON-rollback-able action is refused (NOT_ROLLBACKABLE)", () => {
  const f = fixture();
  const nonRb = { wired: true, work: "run.start#1", rollbackable: false };
  const r = act({ tokenStore: f.store, tokenId: f.tok.id, bootId: "b1", action: "run.start", work: "run.start#1", approval: nonRb, backup: f.backup, mutate: f.mutate }, { now: T0 + 1 });
  assert.equal(r.reason, REFUSE.NOT_ROLLBACKABLE); assert.equal(f.ran(), 0);
});

check("ONLY a fully-wired, in-scope, backed-up, rollback-able act executes (and leaves evidence)", () => {
  const f = fixture();
  const r = act({ tokenStore: f.store, tokenId: f.tok.id, bootId: "b1", action: "run.start", work: "run.start#1", approval: f.wired, backup: f.backup, mutate: f.mutate }, { now: T0 + 1 });
  assert.equal(r.ok, true); assert.equal(f.ran(), 1);
  assert.ok(r.evidence && r.evidence.work === "run.start#1" && r.evidence.backup_at, "a successful act must leave evidence");
});

console.log(`\nV8B1-EXECUTOR: PASS (${pass} checks)`);
