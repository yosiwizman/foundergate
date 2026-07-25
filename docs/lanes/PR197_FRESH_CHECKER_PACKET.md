# PR #197 — FRESH independent Checker packet (post second correction wave)

**Two** independent read-only Checkers have returned **FINDINGS** on this PR:

| Report sha256 | Verdict | Reviewed candidate | Status |
| --- | --- | --- | --- |
| `caa4db0031b172ca69c9b456d298cb3b3e6185215e9074293b6c93390fbdc20f` | FINDINGS | superseded tree | historical evidence only |
| `6ac782a2d396a8b0558eed8493d19a86a5f52a3e99e38cfe2f040f72e25da50b` | FINDINGS (2 MEDIUM + 3 LOW) | `8e6944ef04eb91604af36064051524b12a38c23d` | **historical FINDINGS evidence only** |

All five findings of the second report are corrected. **Neither report is current acceptance** — each reviewed
a tree that no longer exists on this branch. A preserved copy of the second report is at
`.foundergate/evidence/lrcq-assurance-factory/FCHK_197_FRESH_CHECKER_REPORT_HISTORICAL.json`; verify its digest
before reading it.

The Builder cannot supply the verdict. Do not accept the Builder's tests as independent review: the point of
this packet is that you reproduce the attacks yourself.

## Candidate

| | |
| --- | --- |
| repository | `yosiwizman/foundergate` |
| branch | `lane/lrcq-founder-signature-authority-8d1899f` |
| PR | #197 (open, draft, unmerged) |
| **reviewed executable-code candidate** | `c6bf5a37d06b5a86a2ac1b7a5721bb53c38868c0` / tree `0d598ceb16cc2faebc2099c1b88b62788ff72219` |
| evidence-only commits after it | enumerated in `PR197_V4_FREEZE_RECORD.json`; each touches only `.foundergate/evidence/` and/or `docs/` |
| base (PR #196, unchanged) | `8d1899f793305e9f87adc5163a60bfb077e4d4e5` |
| protected main (unchanged) | `ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423` |
| suite | `npm test` → ALL GREEN **153/153**, twice consecutively |
| `active_keys` | `[]` |

Verify the executable candidate yourself:
`git diff --stat c6bf5a37d06b5a86a2ac1b7a5721bb53c38868c0 HEAD -- src tools package.json package-lock.json`
must be empty.

## Read-only rules

Read, search, run `npm test`, run individual self-tests, and author your own throwaway probes outside the
repository. Do not enroll a key, sign, create or consume an activation, invoke a provider, merge, push, deploy,
touch main or PR #196, or change branch protection. Any mutation inside the repository invalidates your report.

## Evidence-class discipline

State the class of every claim you make, and require the same of the Builder's evidence:

* **DYNAMIC** — you executed the attack and observed the refusal or behaviour;
* **COUNTED** — a real process count from a recording stub's own log;
* **SOURCE-PROVEN / STRUCTURAL** — a property of the source text, never runtime proof.

A "zero provider spawn" claim inferred from receipts, refusal strings or the absence of a crash is **not** a
count. Note that the production boundary scrubs the child environment down to `PATH` and `HOME`, so a recording
stub whose log path arrives by environment variable will silently never record, and a zero from such a stub
proves nothing. Put the log beside the stub and bind the stub as the **signed** provider target.

## Required independent reproductions — the FIVE corrected findings

These are the narrow focus of this wave. Reproduce each yourself.

**A1. Asynchronous spawn error after key materialization** (FG-FCHK-197-A). With a genuine CONSUMED capability
and a valid signed launch intent, call `spawnGovernedSupervisorV4` with a `cwd` that does not exist, and
separately with any other trigger that makes node emit `error` on the ChildProcess. Require: no uncaught
exception, no raw `node:events` stack trace, **one structured fail-closed result** (`SUPERVISOR_SPAWN_FAILED`
or `TRANSFER_WRITE_FAILED`), the authority `TRANSFERRED_SPENT`, the private key gone, buffers zeroed, the
writer closed, no residual process, and no key frame delivered. Drive it from a **separate launcher process**
and require that process to exit normally with evidence it could record.

**A2. Retry refusal after that failure.** The same capability must return `ALREADY_TRANSFERRED`. Confirm no
path retries with the same key, and that a premature child death before descriptor completion is likewise
structured and spent.

**C1. Deep immutability of every authority stage** (FG-FCHK-197-C). On VERIFIED, CONSUMED and
SUPERVISOR_EXECUTION, probe recursively with `Reflect.ownKeys` and `Object.isFrozen`; require zero mutable
nested objects. Write to **every** nested numerical limit and **every** exclusion and require the authority
value *and* the derived projection to be unchanged. Re-run your predecessor's exact route: set
`cap.limits.max_budget_usd = 777777` on the genuine branded capability, produce a projection with the genuine
`projectLegacyActivationV4`, and require the projected budget to be the signed value. Audit
`deep-freeze-authority.mjs` itself: it must copy before freezing and must not freeze the caller's source.

**B1. Budget widening.** `max_budget_usd` 10 → 1000 on a copy of the honest projection. Zero spawn.

**B2. Timeout widening.** `per_job_timeout_s` 2700 → 999999. Zero spawn.

**B3. Width widening.** `max_parallel_width` 2 → 64. Zero spawn.

**B4. Output-limit widening.** `max_output_bytes` 10485760 → 1e12. Zero spawn. Also try a widened deadline and
an unknown `v4_*` authority-bearing field.

**B5. All signed exclusions changed individually to false** — all ten, and separately all ten individually
**removed**. Each refused before spawn. Confirm the must-be-true list is the complete signed set and that
`no_deploy` and `no_push_unless_authorized` are enforced, not merely presence-checked. Confirm the enforcement
is a signed-exclusion comparison and **not** a deny-list presence test.

**B6. The complete 26-route invalid matrix with zero spawns.** Rerun your predecessor's 26 routes (enumerated
in the preserved report under `projection_provider_boundary_result`) against the real boundary from inside a
genuine detached supervisor, with a recording stub at the **signed** provider target. Require 26/26 refusal and
a **counted** zero, and prove no widened value reaches argv.

**B7. One legitimate narrowed positive projection.** A manifest narrowing budget, timeout, width and output cap
must still reach the provider and succeed, spawning **exactly one** deterministic stub process that received
the narrowed budget. Prove the enforcement is a ceiling, not a blanket refusal. Confirm the real provider
remains uninvoked.

**D1. Lifecycle-root directory replacement** (FG-FCHK-197-D). Consume an activation, rename the lifecycle root
aside, `mkdir` a fresh directory at the **same signed path**, copy the marker and intent in at 0600, then
attempt intent verification, the governed transfer and the supervisor attach. Require refusal on **object
identity** (`ROOT_OBJECT_IDENTITY_MISMATCH`), **not** a `KEY_MISMATCH` fallthrough, with no child process, no
claim, no key delivery and zero provider spawn. Require the refusal to precede the cryptographic key
comparison. Also require that a case-variant spelling of the **same** inode remains the same authority object,
that a different inode is refused, and that normal lifecycle execution is unaffected. Check that the marker,
intent **and** claim each record the identity.

**E1. Evidence accuracy** (FG-FCHK-197-E). Audit the Builder's evidence adversarially for rows that claim more
than they observed — that was the finding, and it is the kind of defect that recurs. Confirm `C1i` counts real
spawns, that `C4h`/`C4h2` state exactly what they prove, that the ledger's owner-mismatch row is marked
source-proven (root required) rather than achieved, and that no source-regex assertion is presented as runtime
proof. Confirm no behavioural test was weakened or removed to get green.

**F1. Complete positive detached-supervisor route.** The full V4 chain end to end with the deterministic stub.

**F2. Post-review repository immutability.** Re-verify HEAD, tree, `git status --porcelain` (clean), PR #197
open/draft/unmerged, PR #196 and protected main unchanged, and `active_keys == []`.

## Standing reproductions from the previous wave

Each item below is a previously demonstrated defect or an invariant that must still hold.

1. **Concurrent transfer** (was FG-CHK-197-01, HIGH). With one genuine CONSUMED capability and a valid signed
   intent, run `await Promise.all([spawnGovernedSupervisorV4(cap, o), spawnGovernedSupervisorV4(cap, o)])`.
   Require: exactly one `OK`, exactly one `ALREADY_TRANSFERRED`, exactly one child process, exactly one key
   frame delivered, at most one supervisor claim, zero provider spawn, and no process left behind. Also try to
   defeat the in-flight sentinel — more than two concurrent calls, and a transfer whose write fails — and
   confirm no path allows a retry with the same key.
2. **Hostile PATH** (was FG-CHK-197-02). Put hostile `git` and `ps` first on PATH that log every invocation.
   Require: the repository/git-common-dir binding still refuses an attacker-chosen signed root; the legitimate
   signed root still verifies; `observedStartIdentity` returns a real `lstart`; and the fake executables record
   **zero** invocations. Then try to defeat the fixed resolver — `GIT_DIR`, `GIT_WORK_TREE`, `GIT_COMMON_DIR`,
   `GIT_CONFIG_*`, a shadowed `/usr/bin/git`.
3. **cfg.exec / cfg.now injection** (was FG-CHK-197-03). Hand-write a supervisor config containing `exec`
   (`repoRoot`, `candidateRef`) and/or `now`, and run the real `supervisor-main.mjs`. Require a fail-closed
   refusal before any lifecycle claim, with no supervisor state written. Then try an unknown key, a renamed
   key, and a nested equivalent. Confirm nothing in a config can choose a git runner, repository root,
   candidate ref, or clock.
4. **Owner and unsafe mode** (was FG-CHK-197-04). chmod the marker, the intent, the claim and the supervisor
   config to permissive modes and confirm the authority path refuses with a filesystem code **before** the
   cryptographic comparison. chmod the lifecycle root group/world-writable and confirm refusal. Confirm a 0755
   root is still accepted and that the public signed activation is refused only when group/other **writable**.
   If you can arrange another uid, test the owner check directly.
5. **Filesystem object identity** (was FG-CHK-197-05). Sign a lifecycle root spelled with different case and
   confirm it is treated as the **same** authority object with the **same** derived digest; confirm a genuinely
   different filesystem object is refused even when the path string looks similar. Try hard links, a bind-like
   mount if available, and a replaced directory between validation and use.
6. **Mutable capability state** (was FG-CHK-197-06). Attempt to reach or reset launch/transfer state through
   the capability: property assignment, `Object.assign`, `Reflect.set`, `defineProperty`, the prototype chain,
   `structuredClone`, `JSON.parse(JSON.stringify(cap))`, and the read-only snapshot. Require that no external
   write changes module state and that no lifecycle state is serializable.
7. **Entrypoint omission** (was FG-CHK-197-07). Create an intent with no `supervisorEntrypoint` and confirm it
   is refused at creation with no intent file written. Confirm the attach-side self-proof is unconditional and
   that no production flag disables it.
8. **V3 execution attempts.** Drive a V3 record at the verification gate, `launchDetachedSupervisorV4`, the
   production CLI, the REAL harness route, and the provider spawn boundary. Require refusal before any side
   effect and zero provider spawn.
9. **Projection / provider-boundary attempts.** Fabricate a V2 record, mutate a genuine projection's claim
   digest, shallow-copy a capability, and present VERIFIED-only and CONSUMED-only objects at the spawn
   boundary. Require refusal with `started === false` and `provider_invocation === "PROVIDER_NOT_ATTEMPTED"`.
   Try to widen a signed limit through the manifest.
10. **Complete positive route.** Run `detached-supervisor.selftest.mjs` and confirm independently that it uses
    the real production CLI, that exactly one deterministic stub provider process is a descendant of the real
    detached supervisor, that evidence is sealed, that the terminal state is `STOPPED_EXHAUSTED` (not a
    fail-closed HELD), that descendants are reaped, that replay is blocked, and that the **real** repository's
    launcher still refuses with the `KEY_ENROLLMENT` gate.
11. **Provider stability.** Re-resolve the launcher alias, hash the target twice, run `--version`, compare
    device/inode/size/mtime across two observations, and check for an active updater. Compare against
    `PROVIDER_REFREEZE_2_1_220.json`. The alias is a mutable symlink and 2.1.218/2.1.219 remain on this host,
    so report any drift.
12. **Post-review immutability.** Record `git status`, HEAD, tree and the authority-module digests at the start
    and end of your review, and confirm you changed nothing.

Also please re-run the vacuity review: look for assertions that now pass for the wrong reason, tests that
accept any refusal rather than the required code, static source regexes presented as runtime proof, and
capabilities created by any route other than a genuine inherited-descriptor transfer.

## Evidence

| Artifact | What it is |
| --- | --- |
| `.foundergate/evidence/lrcq-assurance-factory/PR197_V4_FREEZE_RECORD.json` | freeze record v3: concrete executable candidate, evidence-only tail, suite result, authority digests, both historical report digests and their invalidated status |
| `.foundergate/evidence/lrcq-assurance-factory/FCHK_197_FINAL_FIVE_CORRECTION_LEDGER.json` | **this wave**: the five findings — mechanism, correction, files, the reproduction before, the result after, each row tagged DYNAMIC / COUNTED / SOURCE-PROVEN |
| `.foundergate/evidence/lrcq-assurance-factory/FCHK_197_FRESH_CHECKER_REPORT_HISTORICAL.json` | the second Checker's full report, preserved verbatim as historical FINDINGS evidence (sha256 `6ac782a2…`) — **not** acceptance |
| `.foundergate/evidence/lrcq-assurance-factory/CHECKER_197_CORRECTION_LEDGER.json` | the previous wave, finding-by-finding; its FG-CHK-197-04 owner row is corrected per FG-FCHK-197-E |
| `.foundergate/evidence/lrcq-assurance-factory/V4_AUTHORITY_ACCEPTANCE_MATRIX.json` | controls → the exact assertions that prove them, plus an explicit not-proven list |
| `.foundergate/evidence/lrcq-assurance-factory/BRANCH_PROTECTION_STATUS.json` | FG-CHK-197-09: unprotected main recorded, route-level prohibitions, queued administration |
| `.foundergate/evidence/lrcq-assurance-factory/PROVIDER_REFREEZE_2_1_220.json` | the re-freeze onto the installed immutable target |
| `docs/contracts/LRCQ_ACTIVATION_V4_CONTRACT.md` | the contract, including the correction addendum |
| `docs/contracts/LRCQ_V4_TEST_MIGRATION_LEDGER.md` | every affected test family and what was retired |

## Required verdict

Clean:

```
AUTHORITY_CHAIN_CLEAN_PROVIDER_REFREEZE_REQUIRED
```

Anything less is a finding. Report findings with file, line, mechanism and an exact reproduction.
`INSUFFICIENT_EVIDENCE` is legitimate and is never acceptance. The Builder must not supply this verdict.

## Not proven, by design

Real productive provider capability — a real builder session producing changes and a real checker session
returning CLEAN — is not exercised here. It requires invoking Claude, which is forbidden during preparation,
and is first observed under founder signature.

## Surfaces most worth your attention this wave

| Area | File |
| --- | --- |
| governed spawn/write race; lifecycle-root object continuity; lifecycle records | `src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs` |
| signed-limit / exclusion enumeration; VERIFIED capability | `src/v8b/lrcq/assurance/activation-v4.mjs` |
| audited deep freeze | `src/v8b/lrcq/assurance/deep-freeze-authority.mjs` |
| the provider spawn boundary validator | `src/v8b/lrcq/provider/authority-boundary.mjs` |
| the one productive-provider spawn | `src/v8b/lrcq/provider/real-provider.mjs` |
| V2 validator must-be-true set | `src/v8b/lrcq/provider/activation-schema.mjs` |
| projection ↔ capability binding | `src/v8b/lrcq/run-harness/v4-legacy-projection.mjs` |

Builder regression families for this wave — audit them adversarially, do **not** treat them as acceptance:
`src/v8b/lrcq/run-harness-tests/checker-197-final-five.selftest.mjs` (113 assertions) and its execution body
`test-support/bodies/final-five-boundary.body.mjs`.
