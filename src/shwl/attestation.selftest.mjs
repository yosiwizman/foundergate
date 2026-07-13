// SHWL §5.1 attestation — override PERMANENTLY disqualifies QUIET_HOST; never auto-restored.

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadAttestation, isQuietHostEligible, applyOverrideConsequence,
} from "./attestation.mjs";
import { readEvents } from "./lease-store.mjs";
import { harness, mkRoot, T0 } from "./_testkit.mjs";
import * as attMod from "./attestation.mjs";

const t = harness("SHWL attestation (§5.1)");

t.check("a fresh run defaults to QUIET_HOST eligible", () => {
  const root = mkRoot("att");
  assert.equal(isQuietHostEligible(root, "run1"), true);
  const a = loadAttestation(root, "run1");
  assert.equal(a.quiet_host_eligible, true);
  assert.equal(a.disqualified_at, null);
});

t.check("applyOverrideConsequence PERMANENTLY removes eligibility + records interval + event", () => {
  const root = mkRoot("att");
  const { attestation, event_id } = applyOverrideConsequence(root, { run_id: "run1", now: T0 });
  assert.equal(attestation.quiet_host_eligible, false);
  assert.equal(attestation.disqualified_at, new Date(T0).toISOString());
  assert.equal(attestation.override_intervals.length, 1);
  assert.ok(event_id);
  assert.equal(isQuietHostEligible(root, "run1"), false);
  const ev = readEvents(root).filter((e) => e.kind === "OVERRIDE");
  assert.equal(ev.length, 1);
  assert.equal(ev[0].consequence, "QUIET_HOST_PERMANENTLY_DISQUALIFIED");
  assert.equal(ev[0].never_auto_restored, true);
});

t.check("NEVER auto-restored: a second override keeps it ineligible; first disqualified_at preserved", () => {
  const root = mkRoot("att");
  applyOverrideConsequence(root, { run_id: "run1", now: T0 });
  const { attestation } = applyOverrideConsequence(root, { run_id: "run1", now: T0 + 60000 });
  assert.equal(attestation.quiet_host_eligible, false);
  assert.equal(attestation.disqualified_at, new Date(T0).toISOString(), "first disqualification instant preserved");
  assert.equal(attestation.override_intervals.length, 2, "each override recorded");
  assert.equal(isQuietHostEligible(root, "run1"), false);
});

t.check("there is NO restore/re-enable export — quiet-host cannot be auto-restored", () => {
  const suspicious = Object.keys(attMod).filter((k) => /restore|re-?enable|requalif|grant/i.test(k));
  assert.deepEqual(suspicious, [], "no code path re-grants QUIET_HOST eligibility");
});

t.check("a corrupt attestation is fail-closed: treated as INELIGIBLE", () => {
  const root = mkRoot("att");
  mkdirSync(join(root, "attestation"), { recursive: true });
  writeFileSync(join(root, "attestation", "run1.json"), "{corrupt");
  assert.equal(isQuietHostEligible(root, "run1"), false);
});

t.done("SHWL-ATTESTATION-SELFTEST");
