# PR #197 — FRESH independent Checker packet (post start-identity fail-closed completion)

**Four** independent read-only Checkers have returned **FINDINGS** on this PR:

| Report sha256 | Verdict | Reviewed candidate | Status |
| --- | --- | --- | --- |
| `caa4db00…` | FINDINGS | superseded tree | historical evidence only |
| `6ac782a2…` | FINDINGS (2 MEDIUM + 3 LOW) | `8e6944ef…` | historical evidence only |
| `c49cc563…` | FINDINGS (1 MEDIUM + 3 LOW) | `c6bf5a37…` | historical evidence only |
| `886d69828216a012be56f8c6362f0df6e178ec030426e36c4dfa71a75f68b6ba` | FINDINGS (1 MEDIUM + 1 LOW) | `4014d91b…` | **historical FINDINGS evidence only** |

Both findings of the fourth report are corrected. **No report is current acceptance** — each reviewed a tree
that no longer exists on this branch. Preserved copies are in
`.foundergate/evidence/lrcq-assurance-factory/`; verify their digests before reading them.

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

Verify: `git diff --stat <candidate> HEAD -- src tools package.json package-lock.json` must be **empty**.

## What changed this wave

One conditional and its surrounding retry/decision logic in
`src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs`. The parent's comparison of the claim's
`supervisor_start_identity` against its own independent `/bin/ps` observation is now **unconditional**, and an
observation that cannot be obtained by the decision point is a **refusal**
(`SUPERVISOR_START_IDENTITY_UNAVAILABLE`), not a skipped check. Nothing else was reopened.

## Evidence-class discipline

State the class of every claim — **DYNAMIC** (attack executed), **COUNTED** (real process count),
**SOURCE-PROVEN** (source text, not an execution) — and require the same of the Builder's evidence.

This lane has now produced **four** evidence-accuracy findings in a row (FG-FCHK-197-E, FG-FFIN-197-F2,
FG-FFIN-197-F3, FG-FFIN4-197-02). The recurring failure is subtler than a false claim: a matrix row citing
evidence that **passes but never reaches the control it claims**. FG-FFIN4-197-02's example is exact — the
cited forged claim was *unsigned* and wrong in *both* PID and identity, so it was refused at the signature
check and the start-identity comparison was never evaluated. When you audit a row, ask not "did the cited
assertion pass?" but "does the cited attack actually execute the line this row is about?"

## Required independent reproductions

**1. Parent OS observation unavailable, with a genuine correctly signed claim.** Build a disposable genuine
chain and use a supervisor that really reads fd 3, decodes the `FGV4KEY1` frame, imports the transferred
ephemeral key, and mints a **correctly signed** claim carrying its **own real PID** and a forged
`supervisor_start_identity`. Deny the parent's `/bin/ps` by genuine OS resource pressure (saturate the fd
table under a low `ulimit -n`, releasing only a few descriptors) or an equivalent structurally test-only
external mechanism — **not** a production hook. Require: never `OK`; the exact structured
`SUPERVISOR_START_IDENTITY_UNAVAILABLE`; `supervisor_acknowledged` not true;
`start_identity_independently_observed` not true; `TRANSFERRED_SPENT`; retry `ALREADY_TRANSFERRED`; zero
provider spawn; no residual process. **Prove the refusal is caused by the missing observation** — the child's
correctly signed claim must be on disk and its PID must equal the spawned PID, so no earlier binding failed.

**2. Exact PID plus forged start identity, with `/bin/ps` available.** The same attack without pressure.
Require `SUPERVISOR_CLAIM_INVALID`, never `OK`, and confirm the refusal occurs **at the start-identity
comparison** (the refusal detail should name it). An unsigned claim, a wrong PID or a malformed claim is
insufficient evidence — it will not reach the comparison.

**3. Fast claim-and-exit, repeated.** Run the race many times. Require that no run yields `OK` with an
unobserved identity, and that no run reports acknowledged-without-observation.

**4. Genuine successful acknowledgment, repeated.** Require every success: exactly one `OK`; valid ephemeral
signature; exact activation, marker, intent, nonce and entrypoint bindings; exact spawned PID; independently
observed start identity; claim identity equal to the observed identity.

**5. Every `OK` has an independently observed identity.** Confirm `start_identity_independently_observed` is
incapable of being false on a success, and that no caller option, PATH entry, config field, activation field
or CLI flag can substitute or skip the fixed `/bin/ps` observation.

**6. Immediate-death and no-claim refusal.** A supervisor whose entrypoint is `process.exit(9)`, and one that
reads the frame but never claims. Both must be refused `SUPERVISOR_TERMINATED_BEFORE_CLAIM`, never `OK`.

**7. The 26-route invalid provider matrix.** From inside a genuine detached supervisor with a recording stub
at the **signed** provider target: 26/26 refused, **counted** zero spawns, no widened value in argv.

**8. Positive deterministic provider-stub route.** One legitimately narrowed projection reaching exactly one
deterministic stub process, plus the complete positive detached-supervisor route end to end.

**9. Post-review immutability.** Re-verify HEAD, tree, `git status --porcelain` (clean), PR #197
open/draft/unmerged, PR #196 and protected main unchanged, and `active_keys == []`.

## Surfaces most worth your attention

| Area | File |
| --- | --- |
| the unconditional start-identity comparison and the observation retry/decision logic | `src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs` |
| the fixed absolute `/bin/ps` observer and its minimal environment | `src/v8b/lrcq/assurance/fixed-executables.mjs`, `activation-v4.mjs` |
| the adversarial key-holding supervisor used by the regressions | `src/v8b/lrcq/run-harness-tests/test-support/forging-start-identity-supervisor.mjs` |
| the resource-pressure driver | `src/v8b/lrcq/run-harness-tests/test-support/start-identity-pressure-driver.mjs` |

Builder evidence to audit **adversarially**: `FFIN4_197_START_IDENTITY_CORRECTION_LEDGER.json`,
`V4_AUTHORITY_ACCEPTANCE_MATRIX.json` (especially the `superseded_citation_note` on FN-F1-04 and the
`superseded_status_note` on A-08), `PR197_V4_FREEZE_RECORD.json`.

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
