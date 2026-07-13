// SHWL — Shared Host Workload Lease: single public entry point (the shared library, §7.3).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af.
//
// One library, one guard, one on-disk lease at ~/.cldh/host-workload-lease/ (injectable).
// AKIOR, FounderGate, and future CLDH-harnessed projects all import from HERE — no divergent
// per-project reimplementations (§7.3).
//
// HONEST SCOPE (§5/§1/§11): this is a COOPERATIVE safety interlock for harness-controlled
// entry points, NOT a security boundary against a hostile same-user process, and it covers a
// SINGLE interactive OS user only. It is paired with the continuous host monitor (§8/§10).

export * from "./constants.mjs";
export * as identity from "./identity.mjs";
export * as schema from "./schema.mjs";
export * as lock from "./lock.mjs";
export * as store from "./lease-store.mjs";
export * as capability from "./capability.mjs";
export * as stateMachine from "./state-machine.mjs";
export * as recovery from "./recovery.mjs";
export * as messages from "./messages.mjs";
export * as attestation from "./attestation.mjs";

export { deriveDecision } from "./state-machine.mjs";
export { guardHeavyOp, classifyOp, isHeavy, LIGHT_OPS, HEAVY_OPS } from "./guard.mjs";
export { launchSoak, releaseByLeaseId } from "./launcher.mjs";
export {
  mechanicalDeadProof, founderAuthorizedRecovery,
} from "./recovery.mjs";
export {
  heldMessage, recoveryMessage, overrideMessage, preflightRefusedMessage, messageForDecision,
} from "./messages.mjs";
export {
  applyOverrideConsequence, isQuietHostEligible, loadAttestation,
} from "./attestation.mjs";
export { resolveRoot, readLease, readEvents } from "./lease-store.mjs";
