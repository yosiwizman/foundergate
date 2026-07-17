# FounderGate Phase 7 — Founder URL-Drop UI Program (integration lane)

**Status:** COMPLETE · founder-witness candidate · **[HOLD]** · NO MAIN MERGE · NO ADOPTION · NO CUSTOMER EXECUTION. Terminal-0 integration branch.

## Founder direction
Autonomous continuation from the Phase-6 public-repo runtime spike until the next true founder gate: **FOUNDER WITNESS — PUBLIC-REPOSITORY URL-DROP UI**. Bounded correction cycles; the founder is not asked to inspect code/terminals/logs.

## Pinned state
Base = PR#157 head `96932fe35a0768c92d11b02c940e087307965cb2`. main `e1ca1989…` (unchanged at every checkpoint). PR#151–#157 OPEN/DRAFT/UNMERGED. M1 run `integrated-8h-rerun-20260717T173028Z` (SHA `b9af1def…`) FOUNDER-RELAYED RUNNING — **not contacted**.

## Roles (single operator)
Terminal-0 = sole builder + merge sheriff (this operator). Independent reviewers = subagents (Phase-6 Advisor **PASS**; Phase-7 final checker **CHECKER-CLEAN**). No builder approved its own work.

## Lanes (all complete)
- **A** Advisor audit of Phase 6 → PASS. **B** UI spec/copy/witness/stranger (frozen contract). **C** patch-drift guard (`patch_compatibility.py` + 7 tests + policy). **D** negative intake fixtures (19 tests, synthetic, no network). **E** Playwright/a11y plans + executed browser proof (20 assertions) + accessibility evidence.
- **Builder** the founder app `src/founder_url_drop/` (zero-dependency loopback Node server + UI, 16-check selftest) reading REAL Phase-6 evidence + a FRESH Phase-7 live run.

## Live run (one runtime builder)
One live UI-to-runtime run on the fixed fixture `https://github.com/pypa/sampleproject`: exact commit `621e4974…`, archive `fd8597e4…`, manifest `649ecb02…` (12 files), governed sandbox GUARD_PASS (loopback-only ports), default-deny egress DENIED, docker socket ABSENT, `compileall` exit 0 (COMPILEABILITY_OBSERVED), teardown 204/404, snapshot deleted, VM destroyed.

## Cross-machine / safety
Remote main read-only monitored (unchanged); 0 self-hosted runners; M1 not contacted; no main merge; no tracked-file modification; only new files under docs/, prototypes/, src/founder_url_drop/.

## Correction cycles
1 (browser proof caught the Pause-modal `[hidden]` CSS override → fixed + re-verified). No three-cycle blocking failure.

## Verdict
READY-FOR-FOUNDER-WITNESS. Authorizes a founder witness of usability only — not product acceptance, adoption, production integration, general public-repository execution, private repositories, customer code, or a merge.
