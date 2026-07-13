// L4 — Quiet-host PREFLIGHT integration (builds ON the ACCEPTED src/shwl launcher preflight).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af
//   §4.2 — the quiet-host preflight runs WHILE the lock is held; a non-quiet host RELEASES the
//          reservation and records why (nothing is started).
//   §5   — EVERY harness-controlled heavy operation MUST call the single shared guard BEFORE
//          starting; the guard REFUSES (it does not warn) unless the host is free or exactly owned.
//
// This is a HEAVY entry point: starting / continuing an endurance soak is heavy work. It therefore
// IMPORTS and CALLS the ACCEPTED src/shwl lease guard and REFUSES if the host isn't owned/quiet.
// It imports src/shwl; it does not modify it.

import { guardHeavyOp } from "../shwl/guard.mjs";
import { preflightRefusedMessage } from "../shwl/messages.mjs";

// Gate a heavy op through the ACCEPTED guard. Returns a result whose { quiet, reason } shape is
// directly usable as the `preflight` predicate of src/shwl launchSoak (§4.2), so this builds ON
// the launcher preflight rather than reimplementing it.
//
//   allowed  -> guard said MAY_ACQUIRE (host free) or ALLOW (exact owner) -> quiet:true
//   refused  -> guard said REFUSE (held by another run / recovery required) -> quiet:false
export function quietHostPreflight({
  root, op = "soak", requester = null, currentBootId, now = Date.now(),
  isAlive, expectedFinish = null, guard = guardHeavyOp,
} = {}) {
  if (!root) throw new Error("quietHostPreflight: root is required");

  const g = guard({ root, op, requester, currentBootId, now, isAlive, expectedFinish });

  if (g.allowed !== true) {
    // Host is held by a DIFFERENT run or is in recovery: REFUSE. Nothing is started.
    return {
      quiet: false,
      allowed: false,
      refused: true,
      classification: g.classification,
      decision: g.decision,
      effective: g.effective,
      reason: g.effective || g.decision,
      message: g.message || preflightRefusedMessage(),
      event_id: g.event_id || null,
    };
  }

  // Free host (MAY_ACQUIRE) or exact-owner soak activity (ALLOW): the host is quiet for us.
  return {
    quiet: true,
    allowed: true,
    refused: false,
    classification: g.classification,
    decision: g.decision,
    effective: g.effective,
    reason: null,
    message: "",
  };
}

// Bind the preflight to fixed options and return a ZERO-ARG predicate — exactly the shape
// src/shwl launchSoak({ preflight }) expects, so a soak launch is gated by the shared guard.
export function makeQuietHostPreflight(opts = {}) {
  return () => quietHostPreflight(opts);
}
