# PR #197 — V4 founder-signature authority: independent review packet

The Builder (Harvest / Terminal-0) cannot supply the final verdict on its own work. This packet is the exact
scope, method, and verdict contract for the **independent read-only authority Checker** and, sequentially
after it, the **independent read-only Advisor**.

## Why an external reviewer

True isolation could not be established automatically in this session: the only in-session mechanism for a
separate context is a subagent, and this session's operating rules forbid using subagents to approve, verify,
or double-check Builder work. Builder self-review is not independent proof. The candidate is therefore
complete and frozen, and review is handed out.

## Frozen candidate

| | |
| --- | --- |
| repository | `yosiwizman/foundergate` |
| PR | #197 (open, draft, unmerged) |
| branch | `lane/lrcq-founder-signature-authority-8d1899f` |
| base | `lane/pr189-real-package-use-8ef9a24` (PR #196 head `8d1899f7`, unchanged) |
| protected main | `ba7d6547c19b2b7cc31e49dfa3ff15ec3f4cb423`, unchanged |
| suite | `npm test` → **ALL GREEN 151/151** self-tests, 1649 passing assertions |

The exact frozen HEAD/tree is recorded in the freeze record
(`.foundergate/evidence/lrcq-assurance-factory/PR197_V4_FREEZE_RECORD.json`). Verify it with
`git rev-parse HEAD` and `git rev-parse HEAD^{tree}` and refuse if either differs.

## Read-only rules for the reviewer

* Read, search, run `npm test` and run individual self-tests. Nothing else.
* Do **not** enroll a founder key, create a signature, create or consume an activation, invoke a provider,
  merge, push, deploy, modify protected main, touch PR #196, or write anywhere in the repository.
* Confirm before starting: `docs/governance/FOUNDER_KEY_AUTHORITY.json` has `active_keys: []`.
* Any mutation by the reviewer invalidates the report and requires a fresh Checker.

## Scope to review

1. **`src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs`** — the lifecycle-private-key containment boundary.
   Attack it directly: find any exported path that yields the private key or its DER, any way to transfer
   twice, any way to transfer without a verified signed intent, any way to supply your own sink, any way to
   make the supervisor accept a frame it should refuse, and any way for a program other than the intent's
   entrypoint to mint a claim.
2. **`src/v8b/lrcq/assurance/activation-v4.mjs`**, **`founder-key-authority.mjs`**, **`canonical-json.mjs`** —
   the signature, the governed key authority, canonicalization and domain separation.
3. **`src/v8b/lrcq/run-harness/v4-legacy-projection.mjs`** — confirm it recreates no V2/V3 authority and that
   a manifest can only narrow a signed limit.
4. **`src/v8b/lrcq/run-harness/harness.mjs`** stage `v4_execution_authority`, and
   **`src/v8b/lrcq/provider/real-provider.mjs`** the spawn boundary.
5. **`src/v8b/lrcq/run-harness/supervisor-main.mjs`** — is its re-verification genuinely independent?
6. **`tools/terminal0/lrcq/run-five-hour.mjs`** — is there any caller-supplied authority seam left on the
   production `--activation` path?
7. **V3 retirement** — `src/v8b/lrcq/run-harness-tests/v3-retirement.selftest.mjs` and the claims it makes.
8. **The tests themselves** — the migration is only as good as the assertions. Look specifically for
   assertions that now pass *vacuously* (a refusal for the wrong reason), and for any place a body module's
   capability is not genuinely descriptor-derived.
9. **Provider re-freeze** — `.foundergate/evidence/lrcq-assurance-factory/PROVIDER_REFREEZE_2_1_220.json`
   against the host's actual installation.

## Supporting evidence

| Artifact | What it is |
| --- | --- |
| `.foundergate/evidence/lrcq-assurance-factory/V4_AUTHORITY_ACCEPTANCE_MATRIX.json` | 41 controls, each with the exact assertions that prove it, plus an explicit not-proven list |
| `.foundergate/evidence/lrcq-assurance-factory/PROVIDER_REFREEZE_2_1_220.json` | the re-freeze: retired 2.1.215, the mechanical resolution method, three observations including the mid-session move 2.1.219 → 2.1.220, and the frozen binding |
| `.foundergate/evidence/lrcq-assurance-factory/PR197_V4_FREEZE_RECORD.json` | the frozen SHA/tree, suite result, and authority-module digests |
| `docs/contracts/LRCQ_ACTIVATION_V4_CONTRACT.md` | the contract, including the FG-LRCQ-ACT-029 addendum |
| `docs/contracts/LRCQ_V4_TEST_MIGRATION_LEDGER.md` | every affected test family, what changed, what was retired and where its properties moved |
| `.foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json` | the regenerated **V4** unsigned payload template (confers no authority; six founder-filled fields are null) |

## Things the Builder asserts, for you to disconfirm

1. No production export returns a lifecycle private `KeyObject` or DER bytes.
2. The ephemeral key leaves the launcher exactly once, only over a descriptor the authority module created
   itself, only to the entrypoint the signed intent digests.
3. A genuine `SUPERVISOR_EXECUTION` capability is unforgeable outside a process that received that key, and
   the real provider spawn boundary accepts nothing else.
4. The V2-shaped record is a projection of signed facts and confers nothing on its own.
5. V3 fails before side effects on every new production execution path.
6. No key material reaches argv, environment, config JSON, disk, git, logs, receipts, stdout, or stderr.
7. One complete bounded positive execution and teardown is proven through the real production CLI against a
   deterministic stub, and the real repository's launcher still refuses for want of an enrolled founder key.

## Required verdicts

Authority Checker (first):

```
AUTHORITY_CHAIN_CLEAN_PROVIDER_REFREEZE_REQUIRED
```

Authority Advisor (sequential, only after a clean Checker):

```
AUTHORITY_IMPLEMENTATION_READY_FOR_PROVIDER_REFREEZE
```

Anything less is a finding. Report findings with file and line, the mechanism, and the exact reproduction —
not an impression. `INSUFFICIENT_EVIDENCE` is a legitimate verdict and is never acceptance.

## What happens next

After a clean Checker **and** Advisor, the descendant package lane proceeds: a new lane branch and draft PR
off this frozen head, regenerating the manifest, material packet, unsigned activation template, evidence
commit, capsule, SHA manifests and controls, then a package Checker (`CLEAN`) and a sequential package
Advisor (`PACKAGE_READY_FOR_FOUNDER_KEY_ENROLLMENT`). Only then does the founder key-enrollment gate open.
The provider binding must be re-verified at that point: if the installation has moved again, the manifest and
packet must be regenerated and the preflight re-run.
