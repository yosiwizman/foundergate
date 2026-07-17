# PARALLEL RUN FINAL REPORT — OpenSandbox Phase 4.1 (Lane A) + VB2 Soak Audit (Lane B)

Generated: 2026-07-17T16:47:00Z · Host: Apple M4 Pro Mac Mini (Mac16,11, 24 GiB, arm64). Both lanes reached a terminal state.

## Starting state
main e1ca1989d2397297a450893f7890dbe7fc21e494 (clean). PR#151 e58632b, PR#152 adcb169, PR#153 3fe19c11, PR#154 f6eeb8f — all OPEN/DRAFT/UNMERGED. Lima 2.1.4 installed.

## Ending state
main UNCHANGED (e1ca1989, clean). PRs #151-154 UNCHANGED (open drafts). Lane A branch spike/opensandbox-port-binding-phase4-1 committed + pushed (draft PR opened). Lane B: read-only, no repo change. No VM, server, or sandbox running.

## Lane A (OpenSandbox Phase 4.1) evidence index
- Lane doc: docs/lanes/OPEN_SANDBOX_PHASE4_1_PORT_BINDING_LANE.md
- Source analysis: docs/research/opensandbox/phase4_1/OPEN_SANDBOX_PHASE4_1_SOURCE_ANALYSIS.md
- Command transcript: .../OPEN_SANDBOX_PHASE4_1_COMMAND_TRANSCRIPT.md
- Runtime evidence (sha256 cd343316a1b68611a7d16022f79b073edb4639b89a4116f75548a0a250848eea): .../OPEN_SANDBOX_PHASE4_1_RUNTIME_EVIDENCE.json
- Result (sha256 a47690a401e6518764284ed6771580cbc9bfed01e6d81bf9a08914055e79e146): .../OPEN_SANDBOX_PHASE4_1_RESULT.md
- Checker report (sha256 90efae1c1a10b565b339d5a1b24e741525b0432019e418f36ca384798329727a): .../OPEN_SANDBOX_PHASE4_1_CHECKER_REPORT.md
- Decision packet (sha256 8083617af4e6d438a69b2d8c86b2b7e45efe3197b5f43fe391fa6a2d13921067): docs/status/OPEN_SANDBOX_PHASE4_1_DECISION_PACKET.md
- Patch: prototypes/sandbox_provider_adapter/patches/opensandbox_0_2_1_port_binding.patch
- Guard + tests: prototypes/sandbox_provider_adapter/{opensandbox_provider.py,test_contract.py,linux_spike_driver.py}
- Raw VM exports (Mac /tmp, not committed): evidence-core.json e2bc26db, server.stderr.log 7ab02393, config.toml 2dce41de, patch-proof.txt 7bc12d3e

## Lane A outcome
Port-binding blocker RESOLVED for this configuration by a minimal loopback-bind patch. Keystone Outcome B (127.0.0.1 only; non-loopback + Mac unreachable). Native proxy preserved; lifecycle/egress/teardown/VM-destruction all proven. Checker CHECKER-CLEAN (22/22; 19/19 tests). Recommendation: PROCEED_TO_CUSTOMER_INTAKE_DESIGN.

## Lane B (VB2 soak audit) evidence index (scratch, outside repo, NOT committed)
- /tmp/foundergate-vb2-soak-audit-ro/AUDIT_RESULT.md (sha256 a784bf228d4910da41ed3daa6a23ab7c8f993c05f11f7c618faf0c420de367fb), AUDIT_JOURNAL.jsonl, AUDIT_RECOVERY_STATE.json, AUDIT_EVIDENCE_INDEX.json

## Lane B outcome
Evidence branch soak-evidence-vb2-integrated-8h @ e718b93. Availability 100%, quiet-host intact, zero sleep, frozen bytes IDENTICAL (git-verified), lease released, attestation intact. 73e2c40 = during-run docs-only checkpoint (14 files under docs/assembly-evidence/VB2/soak), sole HEAD move, sole failing gate (FREEZE_DRIFT). Two evidence-completeness caveats (lease events.log + capability-dir listing unsealed). Verdict: RERUN-AUTHORIZED. Rerun binding SHA b9af1def60009ac9dae69bf519b5e0a2680d4600. Original NOT-PASSED preserved.

## Branch/SHA identities
main e1ca1989 · PR#151 e58632b · PR#152 adcb169 · PR#153 3fe19c11 · PR#154 f6eeb8f · Phase-4.1 branch base f6eeb8f · VB2 evidence e718b93 · VB2 bound b9af1def.

## Unresolved risks / unmerged / unaccepted
- OpenSandbox NOT adopted; NOT merged; patch is FounderGate-local (upstream path open). runc-only; root-in-container; Playwright unrun.
- VB2 rerun authorized but NOT launched; original NOT-PASSED stands; founder acceptance + independent Pro verification still required.
- Nothing merged. PRs remain draft HOLD.

## Next authorized action
Lane A: founder review of the draft HOLD PR; customer-intake DESIGN (not execution). Lane B: founder may issue the paste-ready M1 clean-rerun prompt (rerun still needs post-run independent verification + acceptance).

## Coordination artifact hashes
- Ledger sha256: 41475cc912fc2b96ca186f0b79652adbdfe4cf47c77559339ce8052e2a7449d2
