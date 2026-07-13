// SHWL §5 — the single, shared heavy-operation guard (closed allow-list; REFUSES, not warns).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §5/§5.1/§7.
//
// EVERY harness-controlled heavy operation MUST call this guard BEFORE starting. There is ONE
// guard implementation shared by every project (AKIOR, FounderGate, future CLDH projects) —
// divergent per-project copies are prohibited (§7.3). The guard either ALLOWS (exact-owner
// soak activity, or a free host) or REFUSES with a plain-English message (§6). It refuses —
// it does not merely warn.
//
// Classification is a CLOSED allow-list of LIGHT ops. Anything NOT on that list — including
// unknown/ambiguous new ops — is classified HEAVY (Law-54 fail-safe: default to heavy).

import { DECISION, EFFECTIVE, EVENT } from "./constants.mjs";
import { readLease, readHeartbeat, appendEvent } from "./lease-store.mjs";
import { lockHeld } from "./lock.mjs";
import { deriveDecision } from "./state-machine.mjs";
import { messageForDecision, overrideMessage } from "./messages.mjs";
import { isProcessAlive as realIsAlive } from "./identity.mjs";
import { applyOverrideConsequence } from "./attestation.mjs";

// §5 — explicitly NOT gated (allowed during a soak): Advisor chat, reading/writing docs and
// plans, lightweight git metadata, and authority design. This is the ONLY allow-list; it is
// closed. Everything else is heavy.
export const LIGHT_OPS = new Set([
  "advisor.chat",
  "docs.read", "docs.write",
  "plan.read", "plan.write",
  "git.status", "git.log", "git.branch",
  "authority.design",
]);

// §5 heavy examples (for documentation / callers). NOT used to gate — classification is
// "LIGHT-listed => light, everything else => heavy".
export const HEAVY_OPS = new Set([
  "build", "checker.exec", "test", "ci",
  "browser", "playwright", "devserver",
  "deps.install", "docker", "model.workload",
  "stress", "soak", "worktree.large", "repo.large",
]);

// Classify an op. Unknown / ambiguous => HEAVY (fail-safe).
export function classifyOp(op) {
  if (typeof op === "string" && LIGHT_OPS.has(op)) return "LIGHT";
  return "HEAVY";
}

export function isHeavy(op) {
  return classifyOp(op) === "HEAVY";
}

// The guard call every heavy entry point makes.
//
//   { root, op, requester, currentBootId, now, isAlive?, expectedFinish?,
//     override?: { founder:true, restated? } }
//
// Returns { allowed, classification, effective, decision, message, event_id?, override? }.
// A LIGHT op is always allowed and never gated. A HEAVY op is allowed only when the host is
// free (MAY_ACQUIRE) or the requester owns the lease (ALLOW); otherwise REFUSED — unless the
// founder explicitly overrides, which allows heavy work AND (if a qualifying soak is ACTIVE)
// applies the PERMANENT §5.1 consequence.
export function guardHeavyOp({
  root, op, requester = null, currentBootId, now,
  isAlive = realIsAlive, expectedFinish = null, override = null,
}) {
  const classification = classifyOp(op);
  if (classification === "LIGHT") {
    return { allowed: true, classification, effective: null, decision: DECISION.ALLOW, message: "", gated: false };
  }

  const lease = readLease(root);
  const heartbeat = readHeartbeat(root);
  const d = deriveDecision({
    lockPresent: lockHeld(root), lease, heartbeat, currentBootId, requester, now, isAlive,
  });

  // Free host or exact-owner soak activity -> allow.
  if (d.decision === DECISION.MAY_ACQUIRE || d.decision === DECISION.ALLOW) {
    return { allowed: true, classification, effective: d.effective, decision: d.decision, message: "", gated: true };
  }

  // Held or recovery -> REFUSE, unless the founder explicitly overrides.
  if (override && override.founder === true) {
    let overrideResult = null;
    // §5.1 consequence applies only when an ACTIVE qualifying soak owns the host RIGHT NOW.
    if (d.effective === EFFECTIVE.ACTIVE_HELD && lease.parsed) {
      overrideResult = applyOverrideConsequence(root, { run_id: lease.parsed.run_id, now });
    } else {
      // Held-and-broken / recovery override still gets an append-only override event.
      appendEvent(root, { kind: EVENT.OVERRIDE, at: new Date(now).toISOString(), effective: d.effective, note: "founder override over non-active-soak state" });
    }
    return {
      allowed: true, classification, effective: d.effective, decision: DECISION.ALLOW,
      message: overrideMessage(), gated: true, override: overrideResult || { applied: true },
    };
  }

  // Plain-English refusal + append-only GUARD_REFUSE event.
  const message = messageForDecision({ effective: d.effective, expectedFinish });
  const event_id = appendEvent(root, {
    kind: EVENT.GUARD_REFUSE, at: new Date(now).toISOString(), op, effective: d.effective,
    reason: d.reason, recovery_reason: d.recoveryReason,
  });
  return { allowed: false, classification, effective: d.effective, decision: DECISION.REFUSE, message, event_id, gated: true };
}
