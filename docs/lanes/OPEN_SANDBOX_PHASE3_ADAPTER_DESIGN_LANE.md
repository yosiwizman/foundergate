# OpenSandbox Phase 3 — Provider-Neutral Adapter Design Lane (NARROW-SENSITIVE)

**Status:** DESIGN + ISOLATED PROTOTYPE ONLY · **[HOLD]** · **NO RUNTIME EXECUTED** · **NO ADOPTION / NO MERGE AUTHORIZED**
**Lane class:** NARROW-SENSITIVE (one builder + one independent checker; one isolated branch/worktree; no WIDE Docker execution; no parallel runtime writers).
**Host:** Apple M4 Pro Mac Mini (`Mac16,11`, `Apple M4 Pro`, 24 GiB) — HOST-PROVEN-NOT-M1.

## Founder authorization (verbatim scope)
The founder reviewed the Phase 2 result and authorized progression to **adapter design**: (a) a FounderGate-owned provider-neutral adapter design; (b) one isolated non-production prototype; (c) an independent check of design + prototype; (d) one draft HOLD PR.
This authorization does **NOT** mean: OpenSandbox is adopted; may be merged into `main`; production integration; customer use; replacement of the current FounderGate lane system; merging/closing PR #151 or #152; Kubernetes/cloud/AKIOR/M1 access.

## Pinned prior state (verified in Phase 0, not assumed)
- FounderGate `main`: `e1ca1989d2397297a450893f7890dbe7fc21e494` (clean; local==cached==remote).
- Phase 1 PR **#151** — `audit/opensandbox-phase1` @ `e58632b582c8fe8d59c206afe7d8caefb8f13cf1` (OPEN, DRAFT, UNMERGED).
- Phase 2 PR **#152** — `spike/opensandbox-phase2` @ `adcb169e0c61948c253aead576cd90727227e455` (OPEN, DRAFT, UNMERGED, base `audit/opensandbox-phase1`).
- Phase 2 verdict: `OPENSANDBOX-PHASE2: PROCEED_TO_ADAPTER_DESIGN`; Phase 2 checker: `CHECKER-CLEAN`.
- Evaluated OpenSandbox commit: `192b5bf54a5fd01c7050ba4de9aba48939776cef`.
- **Phase 3 base = PR#152 head `adcb169…`** (this branch descends from it).

## Scope (exact)
Produce: a provider-neutral sandbox contract; an OpenSandbox adapter *design* mapping it onto the Phase-2-proven REST/execd seams; a deployment + trust-boundary design; an **isolated** Python prototype (contract + fake provider + opensandbox request/response serializer + contract tests) that makes **no network, no Docker, no OpenSandbox, no SDK, no MCP** calls; an independent checker report; a decision packet; one draft HOLD PR.

## Boundaries (this lane honors)
- **No runtime**: no OpenSandbox/Docker/Kubernetes/Playwright/Chromium/sandbox runtime executed in Phase 3.
- **No M1**: the M1 qualification host and its soak are never contacted. **No AKIOR**: never accessed/cloned/fetched/inspected/directed (the machine hostname happens to contain "AKIOR"; that is a host label only — the AKIOR system is not touched).
- **No main modification**; **no merge/close/ready** of PR #151 or #152; no ledger/gate/frozen-candidate/acceptance/qualification/Advisor-Registry edits.
- **No global installs**; no customer/production code, credentials, secrets, or data.
- **No wiring** of the prototype into FounderGate execution lanes; no replacement of worktrees/lane controls.
- **No claim** of hardened isolation, secure execution, production/customer readiness, or adoption. UNKNOWN over inference. No PASS without durable evidence. The builder may not check or approve its own work.

## Allowed files (exactly eleven)
- `docs/lanes/OPEN_SANDBOX_PHASE3_ADAPTER_DESIGN_LANE.md`
- `docs/architecture/SANDBOX_PROVIDER_CONTRACT.md`
- `docs/architecture/OPEN_SANDBOX_ADAPTER_DESIGN.md`
- `docs/architecture/SANDBOX_DEPLOYMENT_AND_TRUST_BOUNDARIES.md`
- `prototypes/sandbox_provider_adapter/README.md`
- `prototypes/sandbox_provider_adapter/contract.py`
- `prototypes/sandbox_provider_adapter/fake_provider.py`
- `prototypes/sandbox_provider_adapter/opensandbox_provider.py`
- `prototypes/sandbox_provider_adapter/test_contract.py`
- `docs/research/opensandbox/phase3/OPEN_SANDBOX_PHASE3_CHECKER_REPORT.md`
- `docs/status/OPEN_SANDBOX_PHASE3_DECISION_PACKET.md`

## Forbidden files
Any FounderGate file not in the allowed list — including all `src/`/product code, any gate/ledger/evidence-ledger/frozen-candidate/acceptance/qualification artifact, the Advisor Registry, VB2 files, M1 soak files, existing lane controls, and the Phase 1 / Phase 2 artifacts (read-only inputs).

## Evidence requirements
Durable artifacts only: the four design docs, the prototype package, machine-run prototype test output (count + result), an independent checker verdict, and a decision packet. No runtime/Docker evidence is produced this phase (there is none — nothing was executed). Provider evidence, when a later runtime phase produces it, is **input to FounderGate checking, never final authority**; founder acceptance stays separate from runtime execution.

## Stop conditions
Stop without creating/committing if: any preflight fact is missing/contradictory; the branch/worktree already exists (report collision, do not reuse/reset/delete); more than the eleven allowed files would change; any runtime execution would be required to proceed; or the independent checker returns CHECKER-REJECT or INSUFFICIENT-EVIDENCE that cannot be corrected within scope.
