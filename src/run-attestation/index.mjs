// L2 RUN ATTESTATION — public entry point.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af;
//            docs/ASSEMBLY_MANUAL.md @ a2c4a10adc88d7de760cd8f4f0c0595458f5c6c6 (§26/§29, Law 54).
//
// An append-only, hash-chained, tamper-evident record of a run — the INGREDIENTS from which a future,
// separately-guarded §29 soak PASS is built. This module NEVER emits a SOAK PASS line; it does not import
// lanes L1/L3/L4 (their outputs enter as opaque DATA); it never reads the wall clock.

export {
  openRun,
  appendEvent,
  recordMonitoringWindow,
  recordFailure,
  resolveFailure,
  sealRun,
  verifyAttestation,
  isSoakEligible,
  unresolvedFailures,
  loadRun,
  toEpochMs,
  ENTRY_TYPE,
} from "./attestation.mjs";

export { canonicalize, sha256Hex, hashEntry, GENESIS_HASH } from "./canonical.mjs";
export { logPath, loadEntries } from "./store.mjs";
