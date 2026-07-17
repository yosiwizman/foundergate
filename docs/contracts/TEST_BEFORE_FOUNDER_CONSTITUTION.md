# Test Before Founder — Constitution (TBF-1)

**Status:** ACTIVE · evaluation-class governance · founder-authorized (`docs/status/TEST_BEFORE_FOUNDER_FOUNDER_AUTHORIZATION.md`).
**Machine-enforced by** `.foundergate/policies/test_before_founder.json` (+ pointer, validators,
schemas, selftests, mutation proofs, CI). This prose is authoritative for humans; the JSON policy +
validators are authoritative for machines and are the enforcement of record.

## Core law
> Before the founder is asked to witness, accept, sign, review or interact with a change, Terminal-0
> must exhaust every applicable machine-verifiable check and seal the evidence to disk. Missing
> required evidence blocks founder readiness. **UNKNOWN is not PASS. STALE is not current. A builder's
> statement is not independent verification.**

> Founder involvement is reserved for **human perception, usability judgment, signatures, legal or
> commercial authority, live-action authorization and other decisions that cannot be mechanically
> derived.**

> No work may be labeled `READY_FOR_FOUNDER_WITNESS` merely because it builds, runs once, has a
> screenshot or has green CI.

> Tests must be selected by impact and risk. Irrelevant tests are not required, but every omitted test
> class must be marked `NOT_APPLICABLE` with a machine-checkable reason.

## Task impact classification (fail-closed)
Every lane classifies itself with one or more of: DOCUMENTATION_ONLY, UI_AFFECTING, API_AFFECTING,
RUNTIME_AFFECTING, DATA_AFFECTING, RECOVERY_AFFECTING, SECURITY_BOUNDARY_AFFECTING,
GATE_OR_AUTHORITY_AFFECTING, DEPENDENCY_AFFECTING, PROVIDER_AFFECTING, LIVE_ACTION_AFFECTING,
PRODUCTION_AFFECTING, UNKNOWN. **UNKNOWN fails closed** — the lane is blocked until reclassified.

Required tests per impact are defined in the machine-readable applicability matrix
(`docs/contracts/MACHINE_VERIFICATION_APPLICABILITY_MATRIX.md` and the policy JSON `impact_matrix`).

## UI evidence law (distinct, non-interchangeable)
source inspection · unit tests · headless browser automation · headed local browser proof · screenshot
evidence · trace evidence · video evidence · accessibility evidence · founder perception witness.
A screenshot alone is not UI acceptance. Headless CI alone is not proof of the visible target-platform
experience. A headed local run alone is not exact-SHA CI. If a headed run is technically impossible the
state is `HEADED_BROWSER_EVIDENCE_BLOCKED` — never silently replaced by headless screenshots.

## Witness blocker (derived only)
`READY_FOR_HUMAN_PERCEPTION_WITNESS` is derived ONLY by
`tools/policy/validate_witness_readiness.py` from disk evidence. No builder or UI may set it. It
requires: lane validates · all required tests accounted for · required tests PASS · required evidence
exists · hashes verify · tested SHA == candidate · required checkers CLEAN · required final Advisor
present · remaining limitations explicitly allowed · nothing UNKNOWN/STALE/NOT-PASSED/missing.

## Merge blocker
`tools/policy/validate_merge_readiness.py` requires: policy present + ACTIVE + digest matches · lane
obligations validate · evidence complete · exact-SHA CI current · checker satisfied · founder witness
or signature where required · no active qualification contract prohibits merge · Terminal-0 decision
packet exists. **Green CI alone never grants merge readiness.**

## Not-applicable & waivers
A test is NOT_APPLICABLE only when the impact does not invoke it AND a permitted reason is recorded AND
the validator confirms the reason. A required test that cannot run is `BLOCKED`, never converted to PASS
by a waiver. No waiver may authorize hidden false-green, missing exact-SHA binding, missing teardown,
missing authority proof, missing founder signature, or missing independent checker where required.

## Change protection (evaluation-class)
This constitution + policy are evaluation-class. Any material change to required test classes, UI
browser requirements, independent-checker requirements, the witness/merge blockers, UNKNOWN/STALE
behavior, waiver rules, or the policy-integrity validator requires: proposed amendment · founder
signature · independent checker · mutation proof the guard fires · exact-SHA CI · updated policy digest
· append-only governance record. The invariant floor in `tools/policy/tbf_lib.py` fails closed on any
weakening even if the digest is updated.

## Future CTO prompt law
Every future CTO/builder lane must, before writing: (1) locate the active policy on disk; (2) verify its
digest; (3) record its version in the lane contract; (4) classify impacts; (5) derive required tests;
(6) refuse if the policy is missing/corrupt/UNKNOWN with stop value `TBF-HOLD: ACTIVE-POLICY-MISSING-OR-INVALID`;
(7) write all evidence to disk; (8) validate witness readiness before involving the founder. The full
constitution need not be pasted into each prompt — the prompt loads and enforces the authoritative disk
policy (`docs/templates/CTO_EXECUTION_PROMPT_TEMPLATE.md`).

## Honest limits
This law does not claim testing eliminates every defect. It requires FounderGate to exhaust all
applicable machine-verifiable proof before interrupting the founder, and to reserve the founder for
what cannot be mechanically derived.
