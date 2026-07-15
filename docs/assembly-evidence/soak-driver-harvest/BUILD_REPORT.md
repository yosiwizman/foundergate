# Lane 1 — Soak-driver harvest → `src/tools/` (reviewed, self-tested, parameterized)

Harvest of the archived VB1 run-1 operator scratch driver into reviewed, parameterized,
self-tested product code, so a future qualifying soak executes **reviewed code, not operator
scratch**. This report is a build record only. It makes **no readiness claim**, records **no
soak result**, and emits **no named-soak-pass line** — those are produced only by a real
wall-clock run under an independent gate.

## Files created

| Path | Role |
| --- | --- |
| `src/tools/soak-driver.mjs` | Reviewed, parameterized harness. Orchestrates the accepted modules; contains and modifies **no** product code. |
| `src/tools/soak-driver.selftest.mjs` | Proofs (OS-temp roots only; no real soak, no real `~/.cldh`, no caffeinate). |
| `docs/assembly-evidence/soak-driver-harvest/BUILD_REPORT.md` | This record. |

## Authority

| Element | AUTHORITY (full 40-char SHA) | How it is honored in this harvest |
| --- | --- | --- |
| Run-1 operator driver (the scratch replaced) | `docs/assembly-evidence/VB1/soak/run-2026-07-14/soak-driver.mjs` @ blob `af56552746f2ab9958183de814af4d13c5f5aab1` | Logic harvested faithfully, then parameterized, factored into testable units, and reviewed. The four run-1 lessons (below) are folded in. |
| Shared Host Workload Lease (SHWL) | `docs/lanes/shared-host-workload-lease.md` @ commit `6a4488d8ba728f203e83d0bf0d2ee48c684134af` | Lease lifecycle via the accepted `src/shwl` launcher (§4.1/§4.2/§4.4); explicit TTL; §5.1 permanent QUIET_HOST downgrade honored by the accepted `src/quiet-host-monitor`; refusal releases the reservation cleanly (§4.2). |
| Honest-Duration & Soak-Proof Law, §29 | `docs/ASSEMBLY_MANUAL.md` §29 @ blob `8dc021605a1d0cfea2c7ab2937dc39f4543ec9a9` | All five §29 evidence elements (named line, real start/end timestamps, exact SHA, monitoring evidence, failures/interventions log) are emitted for **either** verdict. |

Base branch point: `main` @ `bf7c905ea55c4743b756c15bf58849d05ffd494c`.

## Parameterization (no hardcoding)

Everything the run-1 scratch hardcoded is now an injectable, validated parameter — via `parseArgs`
(CLI) or `validateOptions` (options object):

| Parameter | Flag | Validation |
| --- | --- | --- |
| freeze/attest SHA | `--sha` | 40-char lowercase-hex commit SHA (rejects short / phantom refs) |
| claim hours | `--claim` | finite number > 0 |
| evidence directory | `--evidence` | non-empty path string |
| lease purpose | `--purpose` | non-empty string |
| lease TTL (seconds) | `--ttl` | finite > 0 **and must strictly exceed the claimed span** |
| repo root | `--repo` | non-empty path string |
| host id / probe / interval / SLO | `--host` / `--probe` / `--interval` / `--slo` | typed, defaulted, validated |

`validateOptions` collects **every** problem and reports them together (fail-closed).

## Caffeinate-aware launch (documented; verified read-only; never spawned)

The operator launches the driver under a power assertion, documented in the module header:

```
caffeinate -dimsu node src/tools/soak-driver.mjs --sha <40hex> --claim 24 \
    --evidence <dir> --purpose "VB1 24h qualifying soak" --ttl 90000 --repo <repo>
```

Before the ACTIVE run, `verifyCaffeine` reads a `ps` snapshot (read-only) and records whether a
`caffeinate` process holds an assertion over the driver's own process tree (self / an ancestor such
as the `caffeinate -dimsu <cmd>` wrapper / a descendant). The fact is written to
`caffeine-assertion.json` **either way**. If no assertion is held the driver **fails closed** — it
refuses **before** acquiring the lease (so no lock can be orphaned) and records the refusal. The
module never spawns caffeinate.

## Run-1 lessons folded in

- **(a) Freeze-scope drift recheck by `manifest_hash`** — `recheckFreezeDrift` re-freezes the same
  explicit scope (`src/**`, `scripts/**`, `package.json`) at end and asserts `manifest_hash`
  unchanged (and that git HEAD did not move). Drift is recorded and makes the verdict honest; it is
  never massaged away.
- **(b) Explicit TTL** — the lease TTL is a surfaced, validated parameter (default 10h) that must
  exceed the claimed span; the SHWL 6h default would expire mid-run.
- **(c) Ancestor-exclusion in the process matcher** — run-1 self-matched because the launching
  shell's argv literally contained a soak filename (a PREFLIGHT_FAIL false-start). `scanHostRows`
  now excludes self, descendants, and ancestors (plus `sh -c` wrappers) while still catching a
  genuine unrelated second soak or heavy foreign workload.
- **(d) Refusal-path release guard** — on any refusal/preflight-fail the reservation is released
  cleanly (the accepted launcher releases on PREFLIGHT_FAIL; the caffeinate refusal happens before
  acquisition; the fatal path seals and releases). No orphaned lock.

## Verdict — accumulator AND-gate only

`computeVerdict` returns PASS only when **availability SLO AND QUIET_HOST eligibility (§5.1) AND
frozen-code integrity (`manifest_hash`)** all hold. A clean accumulator alone cannot force PASS; an
honest NOT-PASSED is the correct output otherwise. A self-test proves a simulated stale-heartbeat
interval drives a permanent §5.1 QUIET_HOST downgrade that flips the verdict to NOT-PASSED even when
the accumulator would otherwise pass.

## Proofs (`src/tools/soak-driver.selftest.mjs`)

17 checks, all on throwaway OS-temp roots — no real soak, no real `~/.cldh`, no caffeinate:
parameter validation; drift-recheck detects a mutated frozen file (and a moved HEAD); the process
matcher excludes self/ancestors yet flags a genuine second soak and a heavy foreign workload;
caffeinate ancestor-assertion detection and fail-closed refusal; refusal → clean lease release (no
orphaned lock) for both a caffeinate-not-held refusal and a not-quiet preflight; explicit TTL lands
on the acquired lease; a stale heartbeat drives a permanent §5.1 QUIET_HOST downgrade → NOT-PASSED;
and all five §29 elements are present for both verdicts.

Full suite: `npm test` → **83/83 self-tests green** (82 pre-existing + this harvest's 1).

## Scope guarantees

- Accepted modules under `src/shwl/**`, `src/freeze-manifest/**`, `src/run-attestation/**`,
  `src/environment-provenance/**`, `src/quiet-host-monitor/**`, and `src/tools/reliability-soak.mjs`
  are **imported, never modified**.
- No `src/v8b*` changes. No `akior` path referenced. Secret-scan clean.
- The M1, its lease, any real `~/.cldh`, and caffeinate were **not touched**; no real or simulated
  soak was launched.

## Not in scope (deliberately)

No readiness claim, no acceptance, no self-merge. An independent adversarial checker and the sheriff
follow.
