// SHWL §4.5 capability custody — high entropy, owner-only storage, cooperative authorize,
// controlled fd/broker delivery, and NO leakage to forbidden surfaces.

import assert from "node:assert/strict";
import {
  mintCapability, storeCapability, readStoredCapability, capabilityFileMode,
  destroyCapability, registerSubprocess, authorizes, brokerStdio, closeBroker,
  readCapabilityFromFd, capabilityLeaks,
} from "./capability.mjs";
import { harness, mkRoot } from "./_testkit.mjs";

const t = harness("SHWL capability custody (§4.5)");

t.check("minted capability is high-entropy (>=256 bits) and unique per mint", () => {
  const a = mintCapability(); const b = mintCapability();
  assert.ok(a.length >= 32 + 8, "at least 64 hex chars");
  assert.notEqual(a, b);
  assert.match(a, /^shwlcap_[0-9a-f]{64}$/);
});

t.check("custody file is owner-readable-only (0600); round-trips; destroy removes it", () => {
  const root = mkRoot("cap");
  const cap = mintCapability();
  storeCapability(root, "lease_x", cap);
  assert.equal(capabilityFileMode(root, "lease_x"), 0o600);
  assert.equal(readStoredCapability(root, "lease_x"), cap);
  destroyCapability(root, "lease_x");
  assert.equal(readStoredCapability(root, "lease_x"), null);
});

t.check("authorizes(): exact owner capability authorizes; a guessed/forged one does NOT", () => {
  const lease = { lease_capability_id: mintCapability(), declared_subprocess_capabilities: [] };
  assert.equal(authorizes(lease, lease.lease_capability_id), true);
  assert.equal(authorizes(lease, mintCapability()), false, "forged/guessed => refuse");
  assert.equal(authorizes(lease, "short"), false);
  assert.equal(authorizes(lease, null), false);
});

t.check("registerSubprocess mints a DECLARED scoped capability that authorizes", () => {
  const lease0 = { lease_capability_id: mintCapability(), declared_subprocess_capabilities: [] };
  const { capability, lease } = registerSubprocess(lease0);
  assert.equal(lease.declared_subprocess_capabilities.length, 1);
  assert.equal(authorizes(lease, capability), true, "declared subprocess capability authorizes");
  assert.equal(authorizes(lease0, capability), false, "un-declared lease does NOT authorize it");
});

t.check("broker delivers the capability via an inherited FD (not argv/env)", () => {
  const root = mkRoot("cap");
  const cap = mintCapability();
  storeCapability(root, "lease_y", cap);
  const broker = brokerStdio(root, "lease_y");
  try {
    // the child would inherit broker.stdio[3]; in-process we read the same fd back
    const delivered = readCapabilityFromFd(broker._fd);
    assert.equal(delivered, cap, "capability reaches the reader via fd, exact value");
  } finally {
    closeBroker(broker);
  }
});

t.check("leak scanner: capability must NOT appear on any forbidden surface", () => {
  const cap = mintCapability();
  // clean surfaces
  const clean = capabilityLeaks(cap, {
    argv: ["node", "build.mjs", "--flag"],
    env: { PATH: "/usr/bin", HOME: "/Users/x" },
    log: "started build; guard allowed; nothing sensitive here",
    evidence: "evidence bundle without secrets",
    git: "tracked file content",
    eventsText: '{"kind":"ACQUIRE"}\n{"kind":"RELEASE"}\n',
  });
  assert.equal(clean.leaked, false);

  // a deliberate leak on each forbidden surface is caught
  assert.equal(capabilityLeaks(cap, { argv: ["node", cap] }).leaked, true);
  assert.equal(capabilityLeaks(cap, { env: { SECRET: cap } }).leaked, true);
  assert.equal(capabilityLeaks(cap, { log: "leaked " + cap }).leaked, true);
  assert.equal(capabilityLeaks(cap, { evidence: cap }).leaked, true);
  assert.equal(capabilityLeaks(cap, { git: cap }).leaked, true);
  assert.equal(capabilityLeaks(cap, { eventsText: cap }).leaked, true);
});

t.done("SHWL-CAPABILITY-SELFTEST");
