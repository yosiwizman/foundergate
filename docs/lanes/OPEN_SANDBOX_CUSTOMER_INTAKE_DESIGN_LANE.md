# OpenSandbox Phase 5 — Customer-Intake Design Lane (NARROW-SENSITIVE, DESIGN-ONLY)

**Status:** DESIGN + isolated prototype only · **[HOLD]** · **NO RUNTIME · NO CUSTOMER EXECUTION · NO ADOPTION · NO MERGE.** One Pro repository writer, one independent checker. The M1 rerun is **NOT started** here.

## Founder direction
The prior "Pro globally read-only during an M1 soak" rule is **superseded** by cross-machine lane + ref isolation (see `docs/coordination/CROSS_MACHINE_PARALLEL_LANE_CONTRACT.md`). Complete the customer-intake design stage first. First intake path = **public GitHub repository URL, read-only, exact-commit snapshot**; private-repo path is PLANNED / NOT AUTHORIZED.

## Pinned state
- Base = PR#155 head `900fa8f01148bd54da665f0060baa16a0a9754ad` (this branch descends from it).
- main `e1ca1989…` (clean). PR#151 `e58632b`, #152 `adcb169`, #153 `3fe19c11`, #154 `f6eeb8f`, #155 `900fa8f` — all OPEN/DRAFT/UNMERGED.
- Lineage: Phase 1 (audit) → 2 (runtime spike) → 3 (provider-neutral adapter) → 4 (Linux VM) → 4.1 (loopback port-binding fix, PROCEED_TO_CUSTOMER_INTAKE_DESIGN). OpenSandbox is a **tested candidate, not adopted**.
- Future M1 evaluated SHA `b9af1def…` — NOT STARTED.

## Requirements
Provider-neutral (no source/sandbox-provider type leaks into FounderGate); **no runtime** (no VM/Docker/OpenSandbox/network/GitHub calls in this phase); **no customer code** (no clone/download/execution); disk-first recording; one-builder + independent-checker; no main modification; no merge/close/ready of PR #151–#155; no adoption/production/customer claim. UNKNOWN over inference; builder may not approve its own design.

## Allowed files (exactly thirteen)
`docs/coordination/CROSS_MACHINE_PARALLEL_LANE_CONTRACT.md` · `docs/coordination/CROSS_MACHINE_PARALLEL_STATE.json` · `docs/lanes/OPEN_SANDBOX_CUSTOMER_INTAKE_DESIGN_LANE.md` · `docs/architecture/{CUSTOMER_REPOSITORY_INTAKE_CONTRACT.md, GITHUB_URL_INTAKE_DESIGN.md, CUSTOMER_INTAKE_TRUST_BOUNDARIES.md, CUSTOMER_INTAKE_EVIDENCE_MODEL.md}` · `docs/research/opensandbox/phase5/OPEN_SANDBOX_PHASE5_INTAKE_CHECKER_REPORT.md` · `docs/status/OPEN_SANDBOX_PHASE5_INTAKE_DECISION_PACKET.md` · `prototypes/customer_repository_intake/{README.md, contract.py, fake_source_provider.py, test_contract.py}`.

## Forbidden files
Any FounderGate file not listed — all `src/`/product code, any gate/ledger/qualification/soak/frozen-candidate/Advisor-Registry artifact, any prior-phase (1–4.1) artifact (read-only inputs), and every M1 worktree/evidence branch.

## Stop conditions
Stop (HOLD) if: any preflight fact is contradictory; the branch/worktree already exists; more than the thirteen allowed files would change; **M1_PUSH_TRIGGER_RISK is PRESENT or UNKNOWN** (then cross-machine parallelism is not READY); a collision on any shared resource is detected; or the independent checker returns REJECT/INSUFFICIENT-EVIDENCE uncorrectable in scope. No runtime is authorized in this phase under any condition.
