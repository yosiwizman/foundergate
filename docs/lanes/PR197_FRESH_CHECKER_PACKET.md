# PR #197 — FRESH independent Checker packet (post-correction)

A previous independent read-only Checker returned **FINDINGS** on this PR (report sha256
`caa4db0031b172ca69c9b456d298cb3b3e6185215e9074293b6c93390fbdc20f`). Every actionable finding has been
corrected. **That report is historical evidence, not current acceptance** — it reviewed a tree that no longer
exists on this branch. A fresh Checker is required.

The Builder cannot supply the verdict. Do not accept the Builder's tests as independent review: the point of
this packet is that you reproduce the attacks yourself.

## Candidate

| | |
| --- | --- |
| repository | `yosiwizman/foundergate` |
| PR | #197 (open, draft, unmerged) |
| **reviewed executable-code candidate** | `8e6944ef04eb91604af36064051524b12a38c23d` / tree `e1df714843cd32173c024c939bebe34238a516d2` |
| evidence-only commits after it | enumerated in `PR197_V4_FREEZE_RECORD.json`; each touches only `.foundergate/evidence/` and/or `docs/` |
| base (PR #196, unchanged) | `8d1899f793305e9f87adc5163a60bfb077e4d4e5` |
| protected main (unchanged) | `ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423` |
| suite | `npm test` → ALL GREEN **152/152**, 1725 assertions, twice consecutively |
| `active_keys` | `[]` |

Verify the executable candidate yourself: `git diff --stat 8e6944ef04eb91604af36064051524b12a38c23d HEAD -- src tools`
must be empty. (The previous freeze record labelled an *evidence-only* commit as the reviewed candidate —
FG-CHK-197-08. It now names the code commit by concrete SHA and tree.)

## Read-only rules

Read, search, run `npm test`, run individual self-tests, and author your own throwaway probes outside the
repository. Do not enroll a key, sign, create or consume an activation, invoke a provider, merge, push, deploy,
touch main or PR #196, or change branch protection. Any mutation inside the repository invalidates your report.

## Required independent reproductions

Each item is a previously demonstrated defect or an invariant that must now hold. Reproduce it yourself.

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
| `.foundergate/evidence/lrcq-assurance-factory/PR197_V4_FREEZE_RECORD.json` | freeze record v2: concrete executable candidate, evidence-only tail, suite result, authority digests, the historical report's digest and invalidated status |
| `.foundergate/evidence/lrcq-assurance-factory/CHECKER_197_CORRECTION_LEDGER.json` | finding-by-finding: mechanism, correction, files, the reproduction before, the result after |
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
