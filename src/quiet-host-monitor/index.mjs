// L4 — Quiet-host continuous monitor + preflight integration: public entry point.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af
// §8/§10 (continuous monitor — DETECTION), §4.2/§5 (preflight — PREVENTION entry), §5.1 (the
// permanent QUIET_HOST downgrade consequence). Imports src/shwl; never modifies it.

export { createQuietHostMonitor, DETECTION } from "./monitor.mjs";
export { quietHostPreflight, makeQuietHostPreflight } from "./preflight.mjs";
