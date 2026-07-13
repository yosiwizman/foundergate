# SHWL BUILD — Completion Report (steps B→H of §9)

**Lane:** Shared Host Workload Lease (SHWL) — SENSITIVE.
**Role:** ONE PRIMARY BUILDER. This lane makes **no acceptance / readiness claim** — an
independent checker + the founder gate follow (§12). This report states facts only.

**Authority (founder-signed, independently-checked):**
`docs/lanes/shared-host-workload-lease.md`
- signed SHA: `9ef4fa0ffdff3fbcfa61fe620371baee19d9f8b1`
- merged SHA (citation): `6a4488d8ba728f203e83d0bf0d2ee48c684134af`

**Scope this wave:** §9 **B→H**. Steps **I (clean AKIOR quiet-host rerun)** and **J
(FounderGate qualifying soak)** are **OUT OF SCOPE** and were **NOT run**. No real soak was
executed. Stop is at PR-open; the builder does not self-accept.

**Base:** worktree branch `shwl-build` based on main `a9a289705fab920d8b1860bd1b255235fea24936`.

---

## Boundaries honored

- **AKIOR untouched.** Nothing under any AKIOR path was written/committed/mutated. §9 C/D
  ("AKIOR integration") is realized WITHOUT touching AKIOR: the shared guard/lease library is
  the exact adapter AKIOR would import (`src/shwl/akior-adoption.mjs`), and an AKIOR-labelled
  owner is **simulated with lease records** (`owner_project="akior"`), never a real process.
- **VB proven patterns reused, not reinvented, not modified.** `src/v8b0`, `src/v8b1`,
  `src/v8b2` are unmodified. The §4.1 lock and §4.5 capability follow the VB1
  `atomic-store.mjs` O_EXCL-lock and `session-token.mjs` capability patterns (READ-only reuse).
- **Injectable lease root; no home pollution.** Root defaults to `~/.cldh/host-workload-lease/`
  and is overridable by param or env (`SHWL_LEASE_ROOT` / `CLDH_LEASE_ROOT`). Every selftest
  uses a throwaway OS-temp dir; `_testkit.guardHome()` hard-refuses any root under the real
  `~/.cldh`. No test leaves state in the user's home.
- **Zero external dependencies; Node v24 ESM `.mjs`.** Selftests are discovered by
  `scripts/run-selftests.mjs` (glob `src/**/*.selftest.mjs`).

---

## Test result

`npm test` → **ALL GREEN: 76/76** (62 pre-existing + 14 new SHWL selftests). The §8.1
cross-project matrix is **14/14 rows GREEN**.

---

## §9 B→H — build steps mapped to authority + evidence (AUTHORITY column)

| Step | What was built | AUTHORITY (doc @ `6a4488d8ba728f203e83d0bf0d2ee48c684134af`) | Module | Selftest |
|---|---|---|---|---|
| B | Lease JSON schema + validation; missing identity field ⇒ MALFORMED ⇒ RECOVERY_REQUIRED | §3 | `src/shwl/schema.mjs` | `schema.selftest.mjs` |
| B | Host / boot / process-start-marker accessor; PID-reuse-defended liveness | §3, §11.2, §11 risk 2 | `src/shwl/identity.mjs` | `identity.selftest.mjs` |
| B | Atomic lock-dir exclusivity (mkdir-atomic; one winner) | §4.1 | `src/shwl/lock.mjs` | `lock.selftest.mjs` |
| B | Injectable-root store; write-temp+fsync+rename; append-only events.log; dir 0700 / files 0600 | §1, §3, §4.4 | `src/shwl/lease-store.mjs` | `lease-store.selftest.mjs` |
| B | Capability custody: high-entropy mint, owner-only 0600 file, controlled fd/broker delivery, cooperative authorize, no-inherit, leak scan | §4.5 | `src/shwl/capability.mjs` | `capability.selftest.mjs` |
| B | Effective-decision derivation (advisory signals only RAISE recovery; never auto-unlock) | §2 | `src/shwl/state-machine.mjs` | `state-machine.selftest.mjs` |
| B | Fail-closed recovery: mechanical dead-proof OR explicit founder authorization; never silent auto-unlock | §4.3 | `src/shwl/recovery.mjs` | `recovery.selftest.mjs` |
| B | Single closed-allow-list guard API; REFUSES (not warns); unknown ⇒ classified-heavy (Law-54) | §5 | `src/shwl/guard.mjs` | `guard.selftest.mjs` |
| B | Override consequence: permanent QUIET_HOST disqualification + append-only event + attestation; never auto-restored | §5.1 | `src/shwl/attestation.mjs` | `attestation.selftest.mjs` |
| B | Plain-English founder messages (held/recovery/override/preflight-refused) | §6 | `src/shwl/messages.mjs` | `messages.selftest.mjs` |
| B | Soak launcher lifecycle acquire→preflight→activate→heartbeat→release; lease_id-checked | §4.1, §4.2, §4.4 | `src/shwl/launcher.mjs` | `launcher.selftest.mjs` |
| C/D | AKIOR adoption adapter + SIMULATION harness (no AKIOR touched) | §9 C/D, §7 | `src/shwl/akior-adoption.mjs` | `cross-project-matrix.selftest.mjs` |
| E/F | FounderGate soak-launcher wrapper + every §5 heavy entry point through the shared guard | §9 E/F, §5, §7 | `src/shwl/foundergate-integration.mjs` | `foundergate-integration.selftest.mjs` |
| G/H | §8 adversarial coverage (builder's committed set; independent checker still runs G/H) | §8 | (all above) | `adversarial.selftest.mjs` |

> Note on G/H: an **independent** checker is normative (§8/§12) and is not the builder. The
> `adversarial.selftest.mjs` file is the builder's committed adversarial coverage; it does not
> substitute for the independent cross-project checker, which runs after PR-open.

---

## §8.1 cross-project matrix — 14/14 GREEN (AUTHORITY column)

All rows committed in `src/shwl/cross-project-matrix.selftest.mjs`. "AKIOR soak active" rows are
simulated with lease records (`owner_project="akior"`), NOT a real AKIOR process.

| # | Scenario | Required outcome | AUTHORITY | Result |
|---|---|---|---|---|
| 1 | AKIOR soak active → FounderGate build | REFUSE | §8.1 r1, §7.2 | GREEN |
| 2 | FounderGate soak active → AKIOR build | REFUSE | §8.1 r2, §7.2 | GREEN |
| 3 | AKIOR soak active → second AKIOR build | REFUSE | §8.1 r3, §7.2 | GREEN |
| 4 | Exact authorized subprocess (fd-delivered capability) | ALLOW | §8.1 r4, §4.5 | GREEN |
| 5 | Same project, different run (no matching capability) | REFUSE | §8.1 r5, §7.2 | GREEN |
| 6 | Two concurrent acquisitions | exactly one winner | §8.1 r6, §4.1 | GREEN |
| 7 | Stale heartbeat | RECOVERY_REQUIRED, not allow | §8.1 r7, §2, §4.3 | GREEN |
| 8 | Expiry alone | does NOT unlock | §8.1 r8, §2, §4.3 | GREEN |
| 9 | PID reuse (live pid, wrong start-marker) | does NOT authorize | §8.1 r9, §3 | GREEN |
| 10 | Prior-boot lease | recovery, not silent trust | §8.1 r10, §4.3 | GREEN |
| 11 | Old owner deletes successor's lease | refuse to delete | §8.1 r11, §4.4 | GREEN |
| 12 | Override during ACTIVE qualifying soak | explicit + append-only event + attestation; permanent QUIET_HOST disqualification, never auto-restored | §8.1 r12, §5.1 | GREEN |
| 13 | Plain-English refusal message | understandable to a non-developer | §8.1 r13, §6 | GREEN |
| 14 | Same-project build inherits soak capability | must NOT inherit; capability never leaks (argv/env) | §8.1 r14, §4.5 | GREEN |

Rows 4 and 14 use a **real subprocess** (`_subprocess-child.mjs`) to exercise controlled
inherited-fd delivery and prove no-inherit / no-leak — not just an in-process assertion.

---

## §11 obligations addressed

| §11 risk | Handling | Evidence |
|---|---|---|
| 2 — host/boot identity portability | cross-platform accessor (macOS `kern.boottime`/IOPlatformUUID; Linux boot_id/machine-id; env override; fallback) | `identity.mjs`, `identity.selftest.mjs` |
| 5 — capability custody | owner-only 0600 storage; controlled fd/broker delivery; no-inherit; leak scan; access ends with the run | `capability.mjs`, `capability.selftest.mjs`, matrix rows 4/14 |
| 6 — orphaned lock-dir | orphan (lock present, no/invalid lease) ⇒ RECOVERY_REQUIRED, never auto-clear | `state-machine.mjs`, `adversarial.selftest.mjs` (orphan test) |
| 7 — founder-override ergonomics | strong plain-English warning + mandatory append-only event + attestation interval; consequence is permanent | `messages.mjs`, `attestation.mjs`, `guard.selftest.mjs` |
| 3 — clock skew | advisory signals only raise RECOVERY (refuse), never unlock (safe-side) | `state-machine.mjs` |

---

## Files created (all under `src/shwl/`, plus this report)

Library modules: `constants.mjs`, `identity.mjs`, `schema.mjs`, `lock.mjs`, `lease-store.mjs`,
`capability.mjs`, `state-machine.mjs`, `recovery.mjs`, `guard.mjs`, `messages.mjs`,
`attestation.mjs`, `launcher.mjs`, `foundergate-integration.mjs`, `akior-adoption.mjs`,
`index.mjs`.
Test support: `_testkit.mjs`, `_subprocess-child.mjs`.
Selftests: `schema`, `identity`, `lock`, `lease-store`, `capability`, `state-machine`,
`recovery`, `guard`, `messages`, `attestation`, `launcher`, `foundergate-integration`,
`cross-project-matrix`, `adversarial` (each `*.selftest.mjs`).
Evidence: `docs/assembly-evidence/shwl-build/BUILD_REPORT.md` (this file).

---

## DRAFT acceptance card — facts only (builder does NOT accept)

> This section is a **draft of facts** for the independent checker and the founder gate. The
> builder makes **no acceptance, readiness, or approval claim** (§12). No soak-pass line is
> asserted — no soak ran (I/J out of scope).

- **Authority:** `docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af` (signed `9ef4fa0ffdff3fbcfa61fe620371baee19d9f8b1`).
- **Scope built:** §9 B→H. **NOT built / NOT run:** §9 I (clean AKIOR quiet-host rerun), §9 J (FounderGate qualifying soak).
- **Tests:** `npm test` → 76/76 GREEN (62 prior + 14 new). §8.1 matrix 14/14 GREEN.
- **Base:** `a9a289705fab920d8b1860bd1b255235fea24936` (branch `shwl-build`).
- **Boundaries:** no AKIOR writes; no `~/.cldh` test pollution; `src/v8b0`/`v8b1`/`v8b2` unmodified; zero external deps; Node v24 ESM.
- **Secret scan:** clean over all added files.
- **Pending (NOT builder-owned):** independent §8 cross-project adversarial checker (G) and founder signature gate (§12). The builder does not self-accept.
