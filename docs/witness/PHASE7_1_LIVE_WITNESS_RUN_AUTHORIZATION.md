# Founder Authorization — ONE Bounded Live Phase 7.1 Safety Check Witness Run

**State:** `PHASE7_1_LIVE_WITNESS_RUN: AUTHORIZED_ONCE`  ·  single-use; expires on the run reaching a terminal state.

## Verbatim
> FOUNDER AUTHORIZATION — ONE BOUNDED LIVE PHASE 7.1 SAFETY CHECK WITNESS RUN
>
> I authorize exactly one founder-started live Safety Check run through the current canonical Phase 7.1
> FounderGate interface. … This authorization permits: one founder click on "Run Safety Check"; one new
> unique run ID; only the disk-authorized fixed public evaluation fixture; one disposable sandbox
> runtime; only the currently registered harness-owned compileability check; exact-version and snapshot
> fingerprinting; runtime progress written continuously to disk; Evidence Pack generation and download;
> sandbox teardown; temporary snapshot deletion; VM destruction; durable sealing of the witness evidence.
> It does NOT permit a second live run, another/private/customer repository, AKIOR access/adoption,
> repository-defined commands, direct host execution, host fallback, OpenSandbox adoption or default
> qualification, production, payment, main merge, PR closure/retarget/merge, or M1 contact. OpenSandbox
> remains SANDBOX PROVIDER 001 — TESTED CANDIDATE. The launcher must fail closed unless service name, UI
> contract, repository/worktree identity, server entry point, process identity and expected port all
> match the canonical identity. After the single run reaches a terminal state, set
> PHASE7_1_LIVE_WITNESS_RUN: EXPIRED. The next action after the run is the founder's witness decision only.
> Signed by the Founder and Acceptance Authority.

## Preflight (mechanically proven; not from memory)
- Host: Mac16,11 / Apple M4 Pro. TBF policy v1.0.0 digest 6df22c4f…947c4e ACTIVE, integrity PASS.
- Phase 7.1-Q head b786019 (UI byte-identical to machine-verification candidate 7a12410); PR #161 draft.
- Canonical launcher identity: app rebuilt from the qualification worktree; repoRoot = foundergate-wt-phase7-1-canonical-ui-tbf.
- Canonical server identity: service foundergate-safety-check · ui_contract phase7.1-neutral-first-v1 ·
  server_entry src/safety_check/service.mjs · repo_id 62b036f8175da211 (= expected). Fail-closed on mismatch.
- Fixed fixture: https://github.com/pypa/sampleproject (last sealed commit 621e4974…; the live run re-resolves the exact commit).
- Provider registry: OpenSandbox 0.2.1 + port-binding patch, image digest sha256:cafa1a96…, execd v1.0.21, egress v1.1.4 (SANDBOX PROVIDER 001 — tested candidate).
- 1 No active run · 2 no Lima VM · 3 no stale process · 4 app → canonical qual worktree · 5 TBF READY_FOR_HUMAN_PERCEPTION_WITNESS (validator-derived) · 6 exact-SHA CI green · 7 neutral-first · 8 no premature result/commit/fingerprint/cleanup · 9 opening created no VM.
- Remote main e1ca1989 unchanged; 0 self-hosted runners; PRs #151–#161 draft/unmerged; M1 not contacted.
