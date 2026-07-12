// FounderGate V8-B VB1 — EXECUTOR containment proof. The act edge is AUTHENTICATED: in
// VB1 (no verifier) NO approval can execute; a forged plain approval is REFUSED; only a
// verifier-signed approval bound to this work+action runs mutate(). Encodes the checker
// round-1 attack list — HIGH-1 inverted into a guard.

import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyStore, mint, revoke } from "./session-token.mjs";
import { act, actEdgeWired, verifyApproval, signApproval, VB3_VERIFIER, REFUSE } from "./executor.mjs";
import { backupStores } from "./rollback.mjs";

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const T0 = Date.now(); // real time so the minted token is live when act() uses Date.now()
const TEST_VERIFIER = { secret: "test-vb3-secret-key" }; // stands in for a wired VB3

function fixture() {
  const store = emptyStore();
  const tok = mint(store, { bootId: "b1", scope: ["run.start"], ttlMs: 3600000, now: T0 });
  const d = mkdtempSync(join(tmpdir(), "vb1-ex-"));
  const backup = backupStores([join(d, "run_state.json")], join(d, "backup"), { root: d });
  let ran = 0; const mutate = () => { ran++; return "mutated"; };
  return { store, tok, backup, mutate, ran: () => ran };
}
const base = (f, over = {}) => ({ tokenStore: f.store, tokenId: f.tok.id, bootId: "b1", action: "run.start", work: "run.start#1", backup: f.backup, mutate: f.mutate, verifier: TEST_VERIFIER, ...over });

console.log("== VB1 executor containment ==");

check("VB1 has NO verifier -> the act edge is machine-UNWIRED (VB3_VERIFIER null, actEdgeWired false)", () => {
  assert.equal(VB3_VERIFIER, null);
  assert.equal(actEdgeWired(), false);
});

check("HIGH-1 CLOSED: a FORGED plain approval cannot execute in VB1 (no verifier); mutate never runs", () => {
  const f = fixture();
  const forgeds = [
    { wired: true, work: "run.start#1", action: "run.start", rollbackable: true, recorded_by: "ATTACKER" },
    { sig: "deadbeef", work: "run.start#1", action: "run.start", rollbackable: true },
  ];
  for (const approval of forgeds) {
    // default verifier (VB1 = null): even with a token, a forged approval is refused
    const r = act({ tokenStore: f.store, tokenId: f.tok.id, bootId: "b1", action: "run.start", work: "run.start#1", approval, backup: f.backup, mutate: f.mutate });
    assert.equal(r.reason, REFUSE.NO_WIRED_APPROVAL, "a forged approval must be refused (act edge gated on VB3)");
  }
  assert.equal(f.ran(), 0, "no forged approval may run mutate()");
});

check("NO_ACTION: a missing action is refused up front", () => {
  const f = fixture();
  assert.equal(act(base(f, { action: "" })).reason, REFUSE.NO_ACTION);
});

check("no token / REVOKED token refused; mutate never runs (even with a valid signed approval)", () => {
  const f = fixture();
  const signed = signApproval(TEST_VERIFIER, { work: "run.start#1", action: "run.start", nonce: "n1" });
  assert.equal(act(base(f, { tokenId: "", approval: signed })).reason, REFUSE.NO_TOKEN);
  revoke(f.store, f.tok.id);
  assert.equal(act(base(f, { approval: signed })).reason, REFUSE.TOKEN_INVALID);
  assert.equal(f.ran(), 0);
});

check("act BEYOND the approval (signed for other work) is refused (APPROVAL_MISMATCH)", () => {
  const f = fixture();
  const other = signApproval(TEST_VERIFIER, { work: "run.delete#9", action: "run.start", nonce: "n2" });
  assert.equal(act(base(f, { approval: other })).reason, REFUSE.APPROVAL_MISMATCH);
  assert.equal(f.ran(), 0);
});

check("NO_BACKUP and NOT_ROLLBACKABLE are refused", () => {
  const f = fixture();
  const signed = signApproval(TEST_VERIFIER, { work: "run.start#1", action: "run.start", nonce: "n3" });
  assert.equal(act(base(f, { approval: signed, backup: null })).reason, REFUSE.NO_BACKUP);
  const nonRb = signApproval(TEST_VERIFIER, { work: "run.start#1", action: "run.start", nonce: "n4", rollbackable: false });
  assert.equal(act(base(f, { approval: nonRb })).reason, REFUSE.NOT_ROLLBACKABLE);
  assert.equal(f.ran(), 0);
});

check("ONLY a verifier-signed, in-scope, backed-up, rollback-able act executes + leaves evidence", () => {
  const f = fixture();
  const signed = signApproval(TEST_VERIFIER, { work: "run.start#1", action: "run.start", nonce: "n5", recorded_by: "founder" });
  const r = act(base(f, { approval: signed }));
  assert.equal(r.ok, true); assert.equal(f.ran(), 1);
  assert.ok(r.evidence && r.evidence.work === "run.start#1" && r.evidence.backup_at);
  // a tampered sig (change the action) fails verification
  assert.equal(verifyApproval({ ...signed, action: "run.delete" }, TEST_VERIFIER), false);
});

console.log(`\nV8B1-EXECUTOR: PASS (${pass} checks)`);
