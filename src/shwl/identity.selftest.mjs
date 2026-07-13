// SHWL §11.2 identity — host/boot/start-marker accessors + PID-reuse-defended liveness.

import assert from "node:assert/strict";
import {
  hostId, bootId, processStartMarker, isProcessAlive, captureIdentity,
} from "./identity.mjs";
import { harness } from "./_testkit.mjs";

const t = harness("SHWL identity (§11.2)");

t.check("env override wins for host id and boot id (deterministic, no shelling out)", () => {
  assert.equal(hostId({ env: { SHWL_HOST_ID: "host_ENV" } }), "host_ENV");
  assert.equal(bootId({ env: { SHWL_BOOT_ID: "boot_ENV" } }), "boot_ENV");
});

t.check("real host id is a stable non-empty string on this platform", () => {
  const h = hostId({ env: {} });
  assert.equal(typeof h, "string");
  assert.ok(h.startsWith("host_") && h.length > 5);
  assert.equal(h, hostId({ env: {} })); // stable across calls
});

t.check("real boot id is a stable non-empty string", () => {
  const b = bootId({ env: {} });
  assert.ok(b.startsWith("boot_") && b.length > 5);
  assert.equal(b, bootId({ env: {} }));
});

t.check("this live process is alive; a start-marker exists for it", () => {
  const marker = processStartMarker(process.pid);
  assert.ok(marker === null || typeof marker === "string");
  assert.equal(isProcessAlive(process.pid, marker), true);
});

t.check("a certainly-dead pid is not alive", () => {
  assert.equal(isProcessAlive(2147480000, "start_whatever"), false);
});

t.check("PID REUSE: a LIVE pid with the WRONG start-marker is NOT the owner", () => {
  // process.pid IS alive, but the recorded marker differs -> not the same instance.
  assert.equal(isProcessAlive(process.pid, "start_A_DIFFERENT_INSTANCE_marker_zzz"), false);
});

t.check("invalid pid values are not alive (fail-closed)", () => {
  assert.equal(isProcessAlive(0, "m"), false);
  assert.equal(isProcessAlive(-1, "m"), false);
  assert.equal(isProcessAlive("x", "m"), false);
});

t.check("captureIdentity fills all four identity fields, honoring overrides", () => {
  const id = captureIdentity({ host_id: "H", boot_id: "B", pid: 7, process_start_marker: "S" });
  assert.deepEqual(id, { host_id: "H", boot_id: "B", pid: 7, process_start_marker: "S" });
  const auto = captureIdentity({ host_id: "H", boot_id: "B", pid: 999999999 });
  assert.ok(typeof auto.process_start_marker === "string" && auto.process_start_marker.length > 0);
});

t.done("SHWL-IDENTITY-SELFTEST");
