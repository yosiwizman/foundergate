# L2 — RUN ATTESTATION (evidence-integrity infrastructure)

**Lane:** L2 — run attestation. **Branch:** `lane-l2-run-attestation` (base `main` @ `e3eb4be81faa9e1945a87ccac8226c580f00fc96`).
**Classification:** SENSITIVE / PRIVATE. **Scope written:** `src/run-attestation/**` + this report only.

This is **not** a readiness claim and **not** a soak pass. It records the tamper-evident **ingredients** from which a
future, separately-guarded §29 soak PASS may later be built.

---

## 1. What this lane is

An append-only, hash-chained, tamper-evident attestation of a single run — the structured record a future §29 soak
PASS is *built from*, never the PASS itself. Each entry carries `previous_hash` + `entry_hash`; the run record
references `{run_id, host_id, boot_id, freeze_manifest_hash, lease_id, start_at, end_at, monitoring_window_refs,
failures_log_ref}`.

- `freeze_manifest_hash` (lane L1) and `lease_id` (SHWL / lane L-lease) are accepted as **opaque DATA** — this lane
  imports **no** other lane and re-derives nothing.
- **No wall-clock read anywhere.** Every timestamp is DATA the caller passes in; `toEpochMs()` only *parses* provided
  DATA to compare spans. There is no `Date.now` call in logic.

## 2. Public API (`src/run-attestation/index.mjs`)

| Function | Behaviour |
| --- | --- |
| `openRun({dir?, run, at})` | Validates the run record (required fields enforced, fail-closed) and writes the `RUN_OPEN` genesis entry (`previous_hash` = 64 hex zeros). |
| `appendEvent(log, {type?, at, payload?})` | Links a new entry via `previous_hash = last.entry_hash`. Refuses once sealed. Helpers: `recordMonitoringWindow`, `recordFailure`, `resolveFailure`. |
| `sealRun(log, {end_at, at})` | Appends the terminal `RUN_SEAL` (records `end_at` as DATA) and closes the chain. |
| `verifyAttestation(log, {expectedHeadHash?})` | Re-walks the chain → **`intact`** \| **`broken-at-<id>`** \| **`broken-anchor`**. Accepts a log handle, a raw entries array, or a dir path. With `expectedHeadHash`, the head entry's hash MUST match (fail-closed `broken-anchor` otherwise). |
| `isSoakEligible(run, {claimSeconds, expectedHeadHash?})` | Honest **soak-ELIGIBILITY** (not a pass): `true` **only** if `end_at − start_at ≥ claimSeconds` **and** no unresolved failures. Anything not verifiable (broken chain, anchor mismatch, or un-parseable timestamp DATA) → **`UNKNOWN`**, never eligible, never throws. |

## 3. Invariants proven (self-test = the only proof that counts)

`src/run-attestation/attestation.selftest.mjs` — **22 checks, PASS**; whole repo suite **`ALL GREEN: 77/77`**
(`node scripts/run-selftests.mjs`, exit 0). Uses OS-temp dirs only; never touches the real home or any lane state.

- **PARTIAL-tamper detection (Law 54):** a single edited line — *with or without* recomputing that one entry's
  `entry_hash` — plus DELETE and REORDER are each detected → `broken-at-<id>` (the downstream `previous_hash`/`seq`
  linkage catches it). On-disk hand-edit of a line is detected by re-walking the chain.
- **Post-seal / double-seal (LOW-2):** any entry after a `RUN_SEAL`, or a second `RUN_SEAL`, verifies as `broken`.
- **Honest eligibility (§29):** genuine sealed 9h run → eligible for a 9h claim; span-too-short → **not** eligible;
  an unresolved failure → **not** eligible (a resolved one no longer blocks); an unsealed run → **not** eligible;
  a broken chain whose *span would pass* → **`UNKNOWN`**, never eligible; an intact chain with an un-parseable
  timestamp → **`UNKNOWN`**, never throws (LOW-1).
- **No soak-pass emission (report-provenance):** the eligibility result carries no soak-pass field and no `SOAK PASS`
  text; no source file contains a soak-pass banner literal. This lane records ingredients only.
- **Append-only:** appending after `sealRun` is refused; the disk log is written by append, never edited in place.

### 3.1 Threat model & disclosed residual (F1 — same-user full-file rewrite)

The chain is **content-addressed** (`entry_hash = H(substance)`, linked by `previous_hash`). This detects every
**partial** tamper. It does **NOT**, by itself, stop a same-user attacker who controls the **entire** log file: they
can edit any field (e.g. forge `end_at` so a 2h run claims a 9h span, or erase an unresolved failure) and **rebuild
the whole chain from the public `GENESIS_HASH`**, recomputing every hash — the rewrite then re-verifies as `intact`.
This is the **same accepted residual** as the SHWL append-only `events.log` under same-user filesystem tampering
(authority §1 scope / §5 honest limitation / §11 single-interactive-user boundary): a cooperative integrity control
over the audit record, **not** a cryptographic guarantee against a hostile local user. It is disclosed here, tested explicitly (a full-rewrite forgery passing as
`intact` *without* an anchor), and **not** silently relied upon.

**Fix — external anchor.** A §29 soak caller MUST record the sealed head `entry_hash` somewhere the attacker does
not control (inside the L1 freeze manifest, or a separately committed record) and pass it as `expectedHeadHash`.
Any content change moves the head hash, so a full rewrite then fails **`broken-anchor`** → `UNKNOWN`, never eligible.
`genesis_salt` (optional per-run DATA) gives run-distinguishability as defense-in-depth. Both are covered by tests.

## 4. Authority (§28 — written-authority; full 40-char SHAs; every path resolves on disk)

| Item | Authority (path @ SHA) | Sections relied on |
| --- | --- | --- |
| SHWL lease guard + honest-scope, cooperative-interlock doctrine | `docs/lanes/shared-host-workload-lease.md` @ `6a4488d8ba728f203e83d0bf0d2ee48c684134af` (content blob `708b034fc87ec2841a7da427e7de2bcb72b18743`) | §5 / §5.1 / §7 (guard is REFUSE-not-warn; single shared guard) |
| Append-only evidence + exact-SHA provenance | `docs/ASSEMBLY_MANUAL.md` @ `a2c4a10adc88d7de760cd8f4f0c0595458f5c6c6` | **§26** (Provenance Law) |
| Written-authority on disk before governed work | `docs/ASSEMBLY_MANUAL.md` @ `a2c4a10adc88d7de760cd8f4f0c0595458f5c6c6` | **§28** (this AUTHORITY column) |
| Honest-duration / soak-proof; never a bare `SOAK PASS` line | `docs/ASSEMBLY_MANUAL.md` @ `a2c4a10adc88d7de760cd8f4f0c0595458f5c6c6` | **§29** (Honest-Duration & Soak-Proof Law) |
| Never report the unverifiable as intact | `docs/ASSEMBLY_MANUAL.md` @ `a2c4a10adc88d7de760cd8f4f0c0595458f5c6c6` | **Law 54** (Cannot-invent-state guard) |
| Same-user filesystem-tampering residual is in-scope-disclosed, not a security claim (§3.1) | `docs/lanes/shared-host-workload-lease.md` @ `6a4488d8ba728f203e83d0bf0d2ee48c684134af` | §1 (scope: not a security boundary vs hostile same-user) / §5 (honest limitation) / §11 (single-interactive-user boundary) |

## 5. Files written (this lane only)

- `src/run-attestation/canonical.mjs` — deterministic canonical JSON + SHA-256 entry hashing (`node:crypto` only).
- `src/run-attestation/store.mjs` — append-only JSONL on-disk store (append + read only; never edits a line).
- `src/run-attestation/attestation.mjs` — the chain: `openRun` / `appendEvent` / `sealRun` / `verifyAttestation` /
  `isSoakEligible`.
- `src/run-attestation/index.mjs` — public entry point.
- `src/run-attestation/attestation.selftest.mjs` — 22-check self-test (OS-temp dirs).
- `docs/assembly-evidence/L2-run-attestation/L2_REPORT.md` — this report.

## 6. Guard note (SHWL)

The run-attestation functions are **pure record operations** (evidence writing/reading), so per the SHWL build brief
they need no lease guard, and this lane adds **no** HEAVY entry point. If a HEAVY entry point were ever added here it
MUST first call the accepted `src/shwl` `guardHeavyOp(...)` and **refuse** when the host lease is not owned.

## 7. Confirmations

- **No `akior`** path referenced or touched anywhere.
- **`src/shwl/**` unmodified** (not imported either — its guard doctrine is honored, its `lease_id` accepted as DATA).
- **No other-lane directory and no shared ledger touched** (`src/v8*`, adapters, checker, evidence, ledgers all
  untouched). Only `src/run-attestation/**` + this report were written.
- **No soak-pass line** emitted anywhere; no `I`/`J` step; no soak run.
- **No readiness claim.** This lane gates a future §29 soak; it does not assert one has occurred.
