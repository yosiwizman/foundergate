// SHWL lease-store — injectable root, atomic writes, 0600 perms, append-only events,
// present-but-invalid = MALFORMED (never "no lease").

import assert from "node:assert/strict";
import { statSync, writeFileSync } from "node:fs";
import {
  resolveRoot, ensureRoot, writeLease, readLease, writeHeartbeat, readHeartbeat,
  appendEvent, readEvents, leaseFileMode, leasePath,
} from "./lease-store.mjs";
import { newLeaseRecord } from "./schema.mjs";
import { harness, mkRoot, fixedIdentity } from "./_testkit.mjs";

const t = harness("SHWL lease-store");

const mkLease = () => newLeaseRecord({
  lease_id: "lease_abcdef12", owner_project: "akior", identity: fixedIdentity(),
  run_id: "r1", lease_capability_id: "c".repeat(64),
  acquired_at: "2026-07-13T12:00:00Z", heartbeat_interval_s: 30, lease_ttl_s: 3600,
});

t.check("resolveRoot precedence: explicit arg > env > home default", () => {
  assert.equal(resolveRoot("/tmp/explicit", { SHWL_LEASE_ROOT: "/tmp/env" }), "/tmp/explicit");
  assert.equal(resolveRoot(null, { SHWL_LEASE_ROOT: "/tmp/env" }), "/tmp/env");
  assert.equal(resolveRoot(null, { CLDH_LEASE_ROOT: "/tmp/cldh" }), "/tmp/cldh");
  assert.ok(resolveRoot(null, {}).endsWith("/.cldh/host-workload-lease"));
});

t.check("root dir is 0700; lease.json + heartbeat.json are 0600", () => {
  const root = mkRoot("store");
  ensureRoot(root);
  assert.equal(statSync(root).mode & 0o777, 0o700);
  writeLease(root, mkLease());
  writeHeartbeat(root, { lease_id: "lease_abcdef12", heartbeat_at: "2026-07-13T12:00:00Z" });
  assert.equal(leaseFileMode(root), 0o600);
});

t.check("write then read round-trips a valid lease", () => {
  const root = mkRoot("store");
  writeLease(root, mkLease());
  const r = readLease(root);
  assert.equal(r.present, true);
  assert.equal(r.malformed, false);
  assert.equal(r.parsed.lease_id, "lease_abcdef12");
});

t.check("absent lease => present:false (candidate NO_LEASE)", () => {
  const root = mkRoot("store");
  const r = readLease(root);
  assert.equal(r.present, false);
  assert.equal(r.malformed, false);
});

t.check("PRESENT but invalid JSON => MALFORMED (never 'no lease')", () => {
  const root = mkRoot("store");
  ensureRoot(root);
  writeFileSync(leasePath(root), "{ this is not json");
  const r = readLease(root);
  assert.equal(r.present, true);
  assert.equal(r.malformed, true);
});

t.check("PRESENT but missing an identity field => MALFORMED", () => {
  const root = mkRoot("store");
  const bad = mkLease(); delete bad.owner_boot_id;
  ensureRoot(root);
  writeFileSync(leasePath(root), JSON.stringify(bad));
  const r = readLease(root);
  assert.equal(r.present, true);
  assert.equal(r.malformed, true);
});

t.check("heartbeat round-trips and is separate from the lease record", () => {
  const root = mkRoot("store");
  writeHeartbeat(root, { lease_id: "L", heartbeat_at: "2026-07-13T12:00:05Z" });
  assert.equal(readHeartbeat(root).heartbeat_at, "2026-07-13T12:00:05Z");
});

t.check("events.log is append-only: each append adds one immutable line", () => {
  const root = mkRoot("store");
  const id1 = appendEvent(root, { kind: "ACQUIRE", at: "2026-07-13T12:00:00Z" });
  const id2 = appendEvent(root, { kind: "RELEASE", at: "2026-07-13T12:00:01Z" });
  const ev = readEvents(root);
  assert.equal(ev.length, 2);
  assert.equal(ev[0].event_id, id1);
  assert.equal(ev[1].event_id, id2);
  assert.notEqual(id1, id2);
  appendEvent(root, { kind: "RECOVERY", at: "2026-07-13T12:00:02Z" });
  assert.equal(readEvents(root).length, 3, "prior lines untouched, one appended");
});

t.done("SHWL-LEASE-STORE-SELFTEST");
