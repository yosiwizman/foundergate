# PR #197 — FRESH independent Checker packet (post third correction wave)

**Three** independent read-only Checkers have returned **FINDINGS** on this PR:

| Report sha256 | Verdict | Reviewed candidate | Status |
| --- | --- | --- | --- |
| `caa4db0031b172ca69c9b456d298cb3b3e6185215e9074293b6c93390fbdc20f` | FINDINGS | superseded tree | historical evidence only |
| `6ac782a2d396a8b0558eed8493d19a86a5f52a3e99e38cfe2f040f72e25da50b` | FINDINGS (2 MEDIUM + 3 LOW) | `8e6944ef…` | historical evidence only |
| `c49cc5633341639704fcb0564722c8f02c642884b6c7cd8a8f2d44bd70bb294d` | FINDINGS (1 MEDIUM + 3 LOW) | `c6bf5a37…` | **historical FINDINGS evidence only** |

All four findings of the third report are corrected. **No report is current acceptance** — each reviewed a tree
that no longer exists on this branch. Preserved copies live in `.foundergate/evidence/lrcq-assurance-factory/`
(`FFIN_197_THIRD_CHECKER_REPORT_HISTORICAL.json`, `FCHK_197_FRESH_CHECKER_REPORT_HISTORICAL.json`); verify
their digests before reading them.

The Builder cannot supply the verdict, and the Builder's self-tests are **not** independent acceptance.

## Candidate

| | |
| --- | --- |
| repository | `yosiwizman/foundergate` |
| branch | `lane/lrcq-founder-signature-authority-8d1899f` |
| PR | #197 (open, draft, unmerged) |
| **reviewed executable-code candidate** | recorded in `PR197_V4_FREEZE_RECORD.json` (`reviewed_executable_code_candidate_sha` / `_tree`) |
| evidence-only commits after it | enumerated in the same freeze record |
| base (PR #196, unchanged) | `8d1899f793305e9f87adc5163a60bfb077e4d4e5` |
| protected main (unchanged) | `ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423` |
| `active_keys` | `[]` |

Verify the candidate yourself:
`git diff --stat <candidate> HEAD -- src tools package.json package-lock.json` must be **empty**.

## Read-only rules

Read, search, run `npm test`, run individual self-tests, and author throwaway probes **outside** the
repository. Do not enroll a key, sign, create or consume a real activation, invoke a provider or model, merge,
push, deploy, touch main or PR #196, or change branch protection. Any mutation inside the repository
invalidates your report.

## Evidence-class discipline

State the class of every claim, and require the same of the Builder's evidence:

* **DYNAMIC** — you executed the attack and observed the behaviour;
* **COUNTED** — a real process count from a recording stub's own log;
* **SOURCE-PROVEN / STRUCTURAL** — a property of the source text, never runtime proof.

Two traps this lane has already fallen into, both worth re-checking:

1. **A counter that cannot count.** The production boundary scrubs the child environment to `PATH` and `HOME`,
   so a recording stub whose log path arrives by environment variable silently never records — and its zero
   proves nothing. Require a **positive control**: execute the stub and confirm the count moves.
2. **A completion signal that proves nothing.** The governed key frame is 92 bytes and the inherited
   descriptor is an ordinary 64 KiB kernel pipe, so a write callback always fires regardless of whether the
   supervisor read anything. Treat any pipe/timer/liveness signal as *not* evidence of receipt.

## Required independent reproductions

**1. Immediate child exit without reading.** Build a genuine CONSUMED capability and a genuine ephemeral-signed
launch intent whose supervisor entrypoint is a file containing exactly `process.exit(9);`. Call
`spawnGovernedSupervisorV4`. Require: **never** `OK`; a structured `SUPERVISOR_TERMINATED_BEFORE_CLAIM`
refusal; `supervisor_acknowledged === false`; authority `TRANSFERRED_SPENT`; no claim; no residual process;
zero provider spawn. **Run it repeatedly** (the Builder runs 6× per suite execution) and require the same
outcome every time — this must be decided by evidence, not by scheduling.

**2. Frame read with no claim.** An entrypoint that reads fd 3 to EOF and then exits without attaching.
Require the same structured refusal: reading the key is *not* acknowledgment.

**3. Malformed claim.** An entrypoint that writes a JSON file at the governed claim path with the right schema
string and a bogus `ephemeral_signature`. Require a structured refusal, never `OK`.

**4. Wrong PID / start identity.** An entrypoint that writes a validly *shaped* claim carrying every required
field but a foreign `supervisor_pid` and `supervisor_start_identity`. Require a structured refusal, and that
no forged claim can make the transfer report an acknowledged supervisor.

**5. Valid signed claim success.** A genuine supervisor that reads, independently reverifies the signed V4
activation, proves its entrypoint identity and mints the claim. Require exactly one `OK`, the claim bound to
the **exact** spawned PID, and the start identity independently OS-observed by the parent. Confirm the normal
deterministic positive route is still fully functional.

**6. Post-failure retry refusal.** After every failure above, the same capability must return
`ALREADY_TRANSFERRED`. Confirm no path retries with the same key, and that there is no caller-configurable
claim path, clock, timeout or verification bypass anywhere on this route.

**7. `__proto__` / `constructor` / `prototype` rejection.** Feed `deepFreezeAuthority` inputs from
`JSON.parse`: `{"__proto__":{"max_budget_usd":999999}}`, a nested `__proto__`, `constructor`, `prototype`, and
ordinary safe keys. Require deterministic refusal of the dangerous ones; no prototype change; no inherited
attacker field; no global prototype pollution; and that ordinary authority objects still copy, deep-freeze,
serialise identically and round-trip through the helper.

**8. The 26-route invalid matrix with a counted zero.** Rerun the 26 routes (enumerated in the second report
under `projection_provider_boundary_result`) against the real boundary from inside a genuine detached
supervisor, with a recording stub at the **signed** provider target. Require 26/26 refusal and a **counted**
zero, and prove no widened value reaches argv.

**9. One positive narrowed provider stub.** A manifest narrowing budget, timeout, width and output cap must
still reach the provider and succeed, spawning **exactly one** deterministic stub process that received the
narrowed budget.

**10. Standing authority regressions.** Signed-limit ceilings; all ten signed exclusions; deep immutability of
valid authority data; lifecycle-root device/inode continuity; concurrent one-use transfer; fixed absolute
`git`/`ps`; supervisor-config restrictions; V3 retirement; mandatory entrypoint self-proof; exactly one
productive-provider boundary; the complete positive detached-supervisor route; replay refusal; provider target
2.1.220. These were independently CLEAN in the third report and were **not** reopened — verify they still hold.

**11. Post-review repository immutability.** Re-verify HEAD, tree, `git status --porcelain` (clean), PR #197
open/draft/unmerged, PR #196 and protected main unchanged, and `active_keys == []`.

## Surfaces most worth your attention this wave

| Area | File |
| --- | --- |
| the deterministic supervisor acknowledgment (claim wait + classification) | `src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs` |
| setter-safe authority copying | `src/v8b/lrcq/assurance/deep-freeze-authority.mjs` |
| the launcher's refusal naming | `tools/terminal0/lrcq/run-five-hour.mjs` |
| the minimal genuine supervisor used by the regressions | `src/v8b/lrcq/run-harness-tests/test-support/v4-key-receipt-child.mjs` |
| the recording provider stub and its adjacent log | `src/v8b/lrcq/run-harness-tests/test-support/recording-provider-stub.mjs` |

Builder evidence to audit **adversarially**, not to trust:
`FFIN_197_FINAL_FOUR_CORRECTION_LEDGER.json`, `V4_AUTHORITY_ACCEPTANCE_MATRIX.json`,
`PR197_V4_FREEZE_RECORD.json`. Two of the last three waves produced an evidence-accuracy finding
(FG-FCHK-197-E, then FG-FFIN-197-F2 and F3) — check specifically whether any row claims more than it observed,
and whether any comment describes a mechanism the code does not use.

## Required clean verdict

If and only if every reproduction above holds:

```
AUTHORITY_CHAIN_CLEAN_PROVIDER_REFREEZE_REQUIRED
```

Otherwise report **FINDINGS** with, for each: file and line, mechanism, exact reproduction, actual result,
required secure result, zero-spawn status, and the narrowest correction scope. `INSUFFICIENT_EVIDENCE` is
legitimate and is never acceptance.

The provider re-freeze remains required regardless: the activation binds a specific provider identity and
version, and that binding is re-established under founder signature, not here.
