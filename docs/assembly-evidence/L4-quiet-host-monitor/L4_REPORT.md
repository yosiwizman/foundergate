# L4 — Quiet-Host Continuous Monitor + Preflight Integration (evidence-integrity, SENSITIVE)

The **DETECTION** complement to the shared-host-workload lease's **PREVENTION**. The accepted
lease (`src/shwl`) cooperatively *prevents* harness-controlled heavy work from colliding with a
qualifying soak. By construction it cannot stop a manual / non-harness command (authority §5,
§8/§10). This lane builds the post-hoc net: a continuous monitor that DETECTS when a supposedly-
quiet host is **not** quiet during a run and **permanently downgrades** that run's `QUIET_HOST`
claim through the ACCEPTED §5.1 attestation — never auto-restored, reconstructable from
`events.log`. It also adds the heavy preflight entry point that gates a soak launch through the
accepted lease guard.

This report makes **no readiness claim** and records **no soak pass**. No real soak was executed;
no steps I/J were run. All detection is pure logic over INJECTED DATA — no real `ps` scraping, no
process control of any kind.

## What was built (`src/quiet-host-monitor/`, zero-dep Node v24 ESM)

| File | Role |
|---|---|
| `monitor.mjs` | Continuous monitor. `createQuietHostMonitor({ root, run_id, run_started_at })` consumes injected host observations and DETECTS: prohibited workload appearing after run start; manual bypass; lease tampering / seizure by another run; missing heartbeat; owner-process disappearance. Each detection records the **EXACT interval** and calls the REAL `src/shwl` §5.1 `applyOverrideConsequence` to **permanently disqualify** `QUIET_HOST`. `deriveDecision` (accepted §2 machine) and `applyOverrideConsequence` are injectable but default to the accepted modules. |
| `preflight.mjs` | `quietHostPreflight(...)` — a HEAVY entry point that IMPORTS and CALLS the accepted `src/shwl` guard (`guardHeavyOp`) and REFUSES unless the host is free (`MAY_ACQUIRE`) or exactly owned (`ALLOW`). Returns the launcher-compatible `{ quiet, reason }` shape; `makeQuietHostPreflight` yields the zero-arg predicate `launchSoak({ preflight })` expects (builds ON §4.2). |
| `index.mjs` | Public entry point re-exporting the monitor + preflight. |
| `_kit.mjs` | Self-test helpers (OS-temp roots only; refuses the real `~/.cldh`); seeds schema-valid leases via the accepted `src/shwl` store. Not a `*.selftest.mjs`. |
| `monitor.selftest.mjs` | 8 checks (below). |
| `preflight.selftest.mjs` | 6 checks (below). |

## Detection → consequence invariants (all proven by self-test)

- **Prohibited-workload-after-start** → EXACT interval recorded (from+to) **and** `QUIET_HOST`
  permanently disqualified via the REAL §5.1 attestation. Verified by reading it back through
  `isQuietHostEligible` / `loadAttestation`, **including after DELETING the attestation file** —
  it stays disqualified, reconstructed from the append-only `events.log`
  (`disqualified_reason: RECONSTRUCTED_FROM_EVENTS_LOG`).
- **Missing-heartbeat** and **owner-process-gone** detected from an injected host-state snapshot
  via the accepted §2 state machine (`STALE_HEARTBEAT`/`EXPIRED` → MISSING_HEARTBEAT;
  `OWNER_DEAD`/`BOOT_MISMATCH` → OWNER_GONE), each downgrading the run.
- **Manual bypass** and **lease tamper / seizure by a different run** downgrade the run.
- **Never auto-restored**: repeat detections keep it disqualified; the monitor exports **no**
  restore / re-enable / requalify / grant surface.
- **No process-kill / exec surface**: neither the instance, the module exports, nor the source of
  `monitor.mjs` contains a process-control primitive (`child_process`, `process.kill`,
  `execFileSync`, `execSync`, `spawnSync`, `spawn(`, `.exec(`), asserted verbatim.
- **Preflight REFUSES when the lease isn't owned** (ACTIVE-held by another run, or RECOVERY) and
  ALLOWS on a free host or exact-owner soak activity; it demonstrably CALLS the shared guard.
- Sightings strictly **before** `run_started_at` are ignored (no false downgrade on pre-run noise).

## Test evidence

`npm test` (the whole suite) is GREEN: **78/78 self-tests passed** (exit 0), including the two new
L4 self-tests (`monitor.selftest.mjs` = 8 checks, `preflight.selftest.mjs` = 6 checks). Every L4
test uses OS-temp roots and never touches the real `~/.cldh`.

## §28 Authority

| Claim in this lane | AUTHORITY (full 40-char SHA) |
|---|---|
| Continuous host monitor is the (post-hoc) DETECTION net for heavy work the cooperative guard cannot prevent | `docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af` §8 |
| Every adopting project pairs the lease with the continuous monitor; cooperative-only scope stated honestly | `docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af` §8/§10 |
| Quiet-host preflight runs against the lease; a non-quiet host refuses / nothing is started | `docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af` §4.2 |
| Every heavy operation calls the single shared guard and REFUSES (not warns) unless free/owned | `docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af` §5 |
| Manual heavy work during an ACTIVE qualifying soak PERMANENTLY disqualifies `QUIET_HOST`; append-only event + attestation interval; NEVER auto-restored | `docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af` §5.1 |

Authority blob at that commit (`708b034fc87ec2841a7da427e7de2bcb72b18743`) is byte-identical to the
current worktree copy, so every cited section (§4.2, §5, §5.1, §8, §10) is exact against that SHA.
This is the same authority SHA the accepted `src/shwl` modules cite.

## Scope / boundaries honored

- Wrote ONLY `src/quiet-host-monitor/**` and this report.
- `src/shwl/**` imported, **never modified**; no `src/v8b*`, no other lane dir, no shared ledgers
  touched; no `akior` path touched.
- No real soak; no steps I/J; no real process killing; no real `ps` scraping in the pure path.
- Private / evidence-integrity: secret-scan clean.
