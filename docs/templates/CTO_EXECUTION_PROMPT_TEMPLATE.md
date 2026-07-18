# CTO Execution Prompt Template (TBF-1 enforced)

Every future CTO/builder lane MUST begin by enforcing the active Test-Before-Founder policy from disk.

## Mandatory preamble (do this before writing any code)
1. Locate the active policy: `.foundergate/policies/test_before_founder.json` and pointer
   `.foundergate/state/test_before_founder_policy_pointer.json`.
2. Verify integrity: `python3 tools/policy/validate_policy_integrity.py`. If it fails or the policy is
   missing/corrupt/UNKNOWN → STOP with: `TBF-HOLD: ACTIVE-POLICY-MISSING-OR-INVALID`.
3. Record the policy version + digest in the lane contract (`docs/templates/LANE_CONTRACT_TEMPLATE.md`).
4. Classify task impacts (fail closed on UNKNOWN).
5. Derive required tests from the applicability matrix.
6. Write ALL evidence to disk (a canonical test-evidence manifest); terminal scrollback is not evidence.
7. Before involving the founder, run `tools/policy/validate_witness_readiness.py`; only its derived
   `READY_FOR_HUMAN_PERCEPTION_WITNESS` may trigger a founder witness.
8. Before merge readiness, run `tools/policy/validate_merge_readiness.py`.

The full constitution need not be pasted; load and enforce the authoritative disk policy.

## FFS-1 foreground obligation (founder-facing UI lanes)
Additionally load `.foundergate/machine_profiles/mac-mini-pro-founder-surface.json`, derive the
`foreground_founder_surface` obligation, run internal headless tests first, then run ONE final
foreground-visible founder-surface test (real launcher + Google Chrome + DOM). Block founder return if
that final test is missing or failed with: `TBF-HOLD: FOREGROUND-FOUNDER-SURFACE-NOT-VERIFIED`.
