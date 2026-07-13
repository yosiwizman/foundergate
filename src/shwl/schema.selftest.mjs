// SHWL §3 schema — validation proof. A lease missing ANY identity field is MALFORMED.

import assert from "node:assert/strict";
import { validateLease, newLeaseRecord, REQUIRED_FIELDS } from "./schema.mjs";
import { harness, fixedIdentity } from "./_testkit.mjs";

const t = harness("SHWL schema (§3)");

const good = newLeaseRecord({
  lease_id: "lease_abcdef12", owner_project: "akior", identity: fixedIdentity(),
  run_id: "r1", lease_capability_id: "c".repeat(64),
  acquired_at: "2026-07-13T12:00:00Z", heartbeat_interval_s: 30, lease_ttl_s: 3600,
});

t.check("a fully-formed lease validates", () => {
  assert.equal(validateLease(good).ok, true);
});

t.check("EVERY missing required identity field => MALFORMED (not ok)", () => {
  for (const f of REQUIRED_FIELDS) {
    const bad = { ...good }; delete bad[f];
    const v = validateLease(bad);
    assert.equal(v.ok, false, `missing ${f} should be malformed`);
    assert.ok(v.errors.some((e) => e.includes(f)), `error should name ${f}`);
  }
});

t.check("non-object / null => malformed", () => {
  assert.equal(validateLease(null).ok, false);
  assert.equal(validateLease("nope").ok, false);
  assert.equal(validateLease([]).ok, false);
});

t.check("unexpected extra field rejected (additionalProperties:false)", () => {
  assert.equal(validateLease({ ...good, sneaky: 1 }).ok, false);
});

t.check("low-entropy capability (<32 chars) rejected", () => {
  assert.equal(validateLease({ ...good, lease_capability_id: "short" }).ok, false);
});

t.check("bad status enum rejected", () => {
  assert.equal(validateLease({ ...good, status: "OPEN" }).ok, false);
});

t.check("owner_pid must be integer >= 1", () => {
  assert.equal(validateLease({ ...good, owner_pid: 0 }).ok, false);
  assert.equal(validateLease({ ...good, owner_pid: "12" }).ok, false);
});

t.check("unparseable acquired_at rejected (timestamps are DATA)", () => {
  assert.equal(validateLease({ ...good, acquired_at: "whenever" }).ok, false);
});

t.check("heartbeat_interval_s out of 1..3600 rejected", () => {
  assert.equal(validateLease({ ...good, heartbeat_interval_s: 0 }).ok, false);
  assert.equal(validateLease({ ...good, heartbeat_interval_s: 4000 }).ok, false);
});

t.check("newLeaseRecord computes expires_at = acquired_at + ttl", () => {
  const rec = newLeaseRecord({
    lease_id: "lease_abcdef12", owner_project: "fg", identity: fixedIdentity(),
    run_id: "r", lease_capability_id: "c".repeat(64),
    acquired_at: "2026-07-13T00:00:00Z", heartbeat_interval_s: 10, lease_ttl_s: 60,
  });
  assert.equal(rec.expires_at, "2026-07-13T00:01:00.000Z");
  assert.equal(rec.status, "ACQUIRING");
});

t.done("SHWL-SCHEMA-SELFTEST");
