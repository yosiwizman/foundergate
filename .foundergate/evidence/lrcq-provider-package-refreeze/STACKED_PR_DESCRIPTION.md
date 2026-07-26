# FounderGate PR #197 — Provider / Package Re-Freeze (stacked descendant lane)

**Draft. Nothing is merged, signed, activated or run. This PR is not acceptance of anything.**

This is a **separate stacked descendant lane**. It does not modify PR #197, PR #196, protected main, or
the approved authority candidate.

## The four distinct SHAs in this lane

| role | value | what it means |
|---|---|---|
| **Approved authority candidate** | `ebd4ff5672ba657b039521a8b377a094a2ea67ea` (tree `012e0560fd21f7328088ec290f30f9eac84dc1ef`) | The executable authority implementation that passed the sixth independent Checker and the sequential Advisor. **Immutable in this wave. Not modified.** |
| **Prior reviewed evidence head (PR #197)** | `39dea6364d3a32420034f0ba4895486d1b918fa1` (tree `1689a63464f3b2e987523fb1c84ce0d50ab6a40f`) | The base this lane branched from. PR #197 remains exactly here. |
| **Package candidate** | `58b36206669a27d1ce6171f0f3149721c24f35c7` (tree `0838399d2089e8a360ee26f62bf0c0e6b1bd03b8`) | The regenerated provider/package artifacts. **Immutable after this commit — not one package byte changes afterwards.** |
| **Evidence-only head** | resolved **procedurally**, never self-embedded | Exactly one later evidence-only commit. Resolve with `git log --oneline 58b3620..HEAD` (exactly one commit) and `git diff --name-status 58b3620 HEAD` (evidence paths only). Its SHA/tree are recorded in `PACKAGE_CANDIDATE_BINDING.json`. |

The package candidate does **not** claim or embed its own future commit SHA. The committed activation
payload keeps the freeze placeholder in `evidence_commit_sha`; the out-of-tree FINAL template is what binds
the exact package candidate. This is a **non-recursive two-SHA seal**, not a self-seal.

## Review status — three strictly distinct classes

**Historical Checker FINDINGS reports (five). Evidence that defects were found and corrected. NOT acceptance.**

1. `caa4db0031b172ca69c9b456d298cb3b3e6185215e9074293b6c93390fbdc20f`
2. `6ac782a2d396a8b0558eed8493d19a86a5f52a3e99e38cfe2f040f72e25da50b`
3. `c49cc5633341639704fcb0564722c8f02c642884b6c7cd8a8f2d44bd70bb294d`
4. `886d69828216a012be56f8c6362f0df6e178ec030426e36c4dfa71a75f68b6ba`
5. `34d4054a04b3a0720d568c8db086c4ce3aece6203709b6175edd2323b4d1f2b1`

Each reviewed a candidate tree that no longer exists on this branch.

**Clean authority Checker** — `fba5f6c2a397489b6a1e31da58fa6bd54434bc8fbf35d6e65689e67c79a87365`
`FOUNDERGATE-PR197-PRODUCTION-SEAM-CHECKER: AUTHORITY_CHAIN_CLEAN_PROVIDER_REFREEZE_REQUIRED`
Accepted the **authority implementation only**, and explicitly **required** this provider re-freeze.

**Authority Advisor** — `e2177f9201e13aa1e4e452af5d32a5e040ce323263cc9bb46277f43469da3cc0`
`FOUNDERGATE-PR197-ADVISOR: AUTHORITY_IMPLEMENTATION_READY_FOR_PROVIDER_REFREEZE`
Recorded provider status as **PROVISIONAL / NOT REFROZEN**. One open LOW finding, ADV-197-01.

**Neither review accepted this package.**

## Provider re-freeze status: RE-FROZEN in this lane

Previously **PROVISIONAL**. The only prior artifact (`PROVIDER_REFREEZE_2_1_220.json`, wave
FG-LRCQ-ACT-029) predates candidates `8e6944ef`, `c6bf5a37`, `4014d91b`, `9d87afa1` and `ebd4ff56`; its old
candidate binding was mechanically inspected and deliberately **not** carried forward.

Re-verified from scratch: `/Users/yosiwizman/.local/share/claude/versions/2.1.220`, regular non-symlink
executable, three independent sha256 digests all
`8addc857f3fe64d5a0368af9ee50321b50afb4a6918ba3ef018ab84f5dbbe081`, `--version` reporting `2.1.220`,
device/inode/size/mtime/link-count identical before and after, no updater running, and the two alternate
installed versions (2.1.218, 2.1.219) enumerated and explicitly **not accepted**.

Provider execution in this wave was limited to `--version`. **Zero productive provider spawns, zero model
requests.** The provider remains **unauthorized for productive use** until founder-signed activation.

This mattered materially: the committed activation payload was still carrying digests from stale candidate
`306f44aa`. Re-binding corrected `launcher_digest`, `activation_v4_digest`, `lifecycle_authority_v4_digest`,
`supervisor_main_digest`, `provider_adapter_digest`, `real_seams_digest` and `v4_legacy_projection_digest`
to the bytes that were actually reviewed.

## ADV-197-01 — corrected here

The stale `"ALL FOUR prior reports"` statement omitted the fifth historical FINDINGS report
(`34d4054a...`). Corrected in the regenerated wave matrix and, by a **surgical one-line edit** preserving
the reviewed file's own formatting, at the source artifact. All five digests now appear in full, are marked
`is_acceptance: false`, and none is described as acceptance.

**The correction remains subject to independent package Checker verification.**

## Ceilings and exclusions

`max_budget_usd` 10 · `run_duration_s` 18000 · `per_job_timeout_s` 2700 · `max_parallel_width` 2 ·
`max_output_bytes` 10485760 · `termination_grace_s` 30 — all six unchanged and unwidened.

All ten exclusions exactly `true`: `no_protected_main_merge`, `no_pr_merge`, `no_push_unless_authorized`,
`no_m1`, `no_akior`, `no_customer_data`, `no_live_action`, `no_permission_bypass`, `no_deploy`,
`no_external_comms`. No package field, environment variable, CLI argument or unsigned overlay may widen any
of them.

## Authority immutability

`lifecycle-authority-v4.mjs`, `activation-v4.mjs`, `authority-boundary.mjs`, `deep-freeze-authority.mjs`,
`fs-authority-guards.mjs`, `fixed-executables.mjs`, `real-provider.mjs` and `run-five-hour.mjs` are
**byte-identical**, verified by digest before and after the wave. No authority limit or exclusion changed.
No existing regression test was modified.

## State

`active_keys` is `[]`. No founder key, no passphrase, no real signature, no activation issued or consumed,
no productive provider or model invocation, no run, no merge, no push to protected main, no deployment.
The real repository is blocked at `KEY_ENROLLMENT`.

## Package review is still required

Builder verification is **not** package acceptance. A fresh **independent read-only package Checker** must
reproduce the bindings, hashes, deterministic regeneration, ceilings, exclusions, zero-spawn attacks and
unsigned state, and return:

```
FOUNDERGATE-PR197-PROVIDER-PACKAGE-CHECKER: CLEAN
```

**The Builder does not issue that verdict.** Not proven anywhere in this lane: real productive Claude
capability, UI proof, and complete OS isolation.
