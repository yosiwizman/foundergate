# FounderGate Project Adoption Contract

**Status:** COMPATIBILITY_PREPARED (design). Phase 7.1 Lane F. Executable counterpart:
`prototypes/project_adoption/adoption_contract.py` (20 passing contract tests).
**Scope:** project-neutral interfaces only. No AKIOR access. No live runtime. No claim that any
future project is adopted.

## Purpose
Define the stable, project-neutral interfaces every future FounderGate project consumes so that
adoption happens through **bounded adapters** rather than a rewrite of the Safety Check core. The
fixed Python fixture must remain one *configured input*, never the core architecture.

## Authority invariant (applies to every interface)
No interface below may grant **founder acceptance, merge authority, production authority, security
certification, or customer approval**. Those are reserved to the human founder witness (and, for
merge, to Terminal-0). Adapters and providers observe and report; they never accept.

> **Enforcement note (honest limitation):** in the synthetic prototype the founder-only guard is a
> string label (`issued_by == "founder"`); it demonstrates the boundary and blocks the honest
> adapter/provider code paths, but a caller could forge the string. Real enforcement lives in the
> **founder-witness runtime path** (a human sets `FounderWitnessState` outside this dataclass), not
> in the prototype. Binding acceptance to a founder-held capability/token is PLANNED, not this phase.

## Label vocabulary (never blurred)
`IMPLEMENTED` (code exists & runs) · `PROVEN` (runtime evidence on exact SHA) ·
`COMPATIBILITY_PREPARED` (contract/seam exists, no live proof) · `PLANNED` · `HELD` ·
`NOT_AUTHORIZED` · `UNKNOWN` (evidence missing).

---
## Interfaces

Each interface: **owner · schema version · required · optional · allowed authority · forbidden
authority · persistence · upgrade rule · failure behavior · UNKNOWN behavior · project extension
point · provider extension point.**

### 1. ProjectDescriptor
- **owner:** core · **schema:** 1.0.0
- **required:** project_type; authorization label · **optional:** repository_url; declared_data_class
- **allowed authority:** declare project type & requested authorization · **forbidden:** self-authorize execution, accept
- **persistence:** `RUN_REQUEST.json` · **upgrade:** additive fields only; new project_type is additive
- **failure:** unknown type → HELD · **UNKNOWN:** missing type → UNKNOWN, no plan
- **project ext:** `descriptor_ext.<type>` · **provider ext:** none

### 2. SourceProvider
- **owner:** source adapter · **schema:** 1.0.0
- **required:** normalize(url); resolve_exact_version; acquire_snapshot · **optional:** rate-limit hints
- **allowed:** URL validation, exact-version resolution, snapshot acquisition & observation · **forbidden:** execute repo code, accept, mark private supported
- **persistence:** `RUN_REQUEST.json`, `SNAPSHOT_MANIFEST.json` · **upgrade:** new host support is a new adapter, not a core change
- **failure:** unresolved version → HELD · **UNKNOWN:** no digest → UNKNOWN
- **project ext:** none · **provider ext:** `source_ext.<host>`

### 3. IntakeRequest
- **owner:** core · **schema:** 1.0.0 · **required:** repository_url; visibility(default public)
- **optional:** requested_at · **allowed:** carry the request · **forbidden:** imply private support
- **persistence:** `RUN_REQUEST.json` · **upgrade:** additive · **failure:** non-public → HELD/refused · **UNKNOWN:** n/a
- **project ext:** none · **provider ext:** none

### 4. IntakeObservation
- **owner:** source adapter · **schema:** 1.0.0 · **required:** normalized_url; exact_version; snapshot
- **optional:** is_private flag · **allowed:** report what was observed · **forbidden:** assert acceptance/safety
- **persistence:** `SNAPSHOT_MANIFEST.json` · **upgrade:** additive · **failure:** missing exact_version → HELD · **UNKNOWN:** missing snapshot → UNKNOWN
- **project ext:** none · **provider ext:** `source_ext.<host>`

### 5. ExactVersionIdentity
- **owner:** core · **schema:** 1.0.0 · **required:** kind; value · **optional:** none
- **allowed:** bind a run to one immutable version · **forbidden:** be optional at pack build
- **persistence:** `RUN_RESULT.json.exact_commit` · **upgrade:** new kinds additive · **failure:** empty → build refuses · **UNKNOWN:** absent → UNKNOWN, pack refused
- **project ext:** none · **provider ext:** `version_ext.<host>`

### 6. ImmutableSnapshotIdentity
- **owner:** core · **schema:** 1.0.0 · **required:** canonical_manifest_sha256 · **optional:** archive_sha256
- **allowed:** prove content immutability · **forbidden:** be synthesized without a real snapshot
- **persistence:** `RUN_RESULT.json` · **upgrade:** additive digests · **failure:** missing manifest digest → pack refused · **UNKNOWN:** absent → UNKNOWN
- **project ext:** none · **provider ext:** none

### 7. CheckPlan
- **owner:** core (assembled from adapter modules) · **schema:** 1.0.0
- **required:** project_type; modules; status · **optional:** reasons
- **allowed:** enumerate which modules will run · **forbidden:** run a module not applicable to the type; accept
- **persistence:** `RUN_PLAN.json` · **upgrade:** additive · **failure:** no applicable module → HELD · **UNKNOWN:** no adapter → HELD/UNKNOWN
- **project ext:** none · **provider ext:** none

### 8. CheckModule
- **owner:** project adapter · **schema:** 1.0.0 · **required:** key; label; applies_to · **optional:** parameters
- **allowed:** define a harness-owned check for its project type · **forbidden:** run repo-defined commands, accept
- **persistence:** `RUN_PLAN.json` · **upgrade:** new modules additive · **failure:** not applicable → excluded · **UNKNOWN:** missing → not run
- **project ext:** `module_ext.<type>` · **provider ext:** none

### 9. SandboxProvider
- **owner:** sandbox adapter · **schema:** 1.0.0 · **required:** create; upload; exec; export; teardown
- **allowed:** sandbox lifecycle & artifact export · **forbidden:** weaken teardown, exceed egress policy, accept
- **persistence:** `RUN_LEDGER.jsonl` stages · **upgrade:** provider swap = new adapter, core unchanged
- **failure:** create fails → run FAILED · **UNKNOWN:** teardown unverified → UNKNOWN (never "removed")
- **project ext:** none · **provider ext:** `sandbox_ext.<provider>`

### 10. RuntimeJob
- **owner:** core · **schema:** 1.0.0 · **required:** run_id; single-job lock; detached execution · **optional:** none
- **allowed:** own run-id generation, the one-job lock, crash recovery · **forbidden:** run >1 concurrent job, accept
- **persistence:** `runs/<id>/` · **upgrade:** additive · **failure:** lock contention → HELD · **UNKNOWN:** stale process → recovered from disk
- **project ext:** none · **provider ext:** none

### 11. RuntimeProgressEvent
- **owner:** core · **schema:** 1.0.0 · **required:** run_id; stage; name; status · **optional:** ts
- **allowed:** append-only progress · **forbidden:** be shown as a result before COMPLETE
- **persistence:** `RUN_LEDGER.jsonl` (append-only) · **upgrade:** additive · **failure:** n/a · **UNKNOWN:** no events → RUNNING/UNKNOWN
- **project ext:** none · **provider ext:** none

### 12. RuntimeRecoveryState
- **owner:** core · **schema:** 1.0.0 · **required:** run_id; state · **optional:** none
- **allowed:** atomic crash-recovery state · **forbidden:** carry project-specific fields
- **persistence:** `RUN_RECOVERY_STATE.json` (atomic) · **upgrade:** additive · **failure:** absent → UNKNOWN · **UNKNOWN:** unreadable → UNKNOWN
- **project ext:** none · **provider ext:** none

### 13. EvidenceObservation
- **owner:** project/sandbox adapter (normalized by core) · **schema:** 1.0.0
- **required:** key; value; label · **optional:** detail · **allowed:** report an observed fact · **forbidden:** relabel a core claim, accept
- **persistence:** Evidence Pack canonical JSON · **upgrade:** additive under namespace · **failure:** malformed → dropped w/ UNKNOWN · **UNKNOWN:** missing → UNKNOWN
- **project ext:** `extensions.<type>` · **provider ext:** `extensions.<provider>`

### 14. EvidencePack
- **owner:** core · **schema:** 1.0.0 (see `EVIDENCE_PACK_VERSIONING_AND_MIGRATION.md`)
- **required:** schema_version; run_id; exact_version; snapshot; core claims; footer · **optional:** namespaced extensions
- **allowed:** canonical record of named checks · **forbidden:** be a security/compliance/production/bug-free certification; let an extension overwrite a core claim
- **persistence:** JSON/MD/HTML/PDF/sha256/zip · **upgrade:** additive minor; breaking = major + migration · **failure:** missing exact_version/snapshot → refuse (exit 2) · **UNKNOWN:** old major → fail closed

### 15. CheckerVerdict
- **owner:** independent checker · **schema:** 1.0.0 · **required:** identity; verdict · **optional:** findings
- **allowed:** CLEAN/FINDINGS/REJECT/INSUFFICIENT-EVIDENCE · **forbidden:** issue founder acceptance or merge
- **persistence:** checker report + ledger · **upgrade:** additive · **failure:** absent → witness blocked · **UNKNOWN:** no checker → INSUFFICIENT-EVIDENCE

### 16. FounderWitnessState
- **owner:** core (set only by founder) · **schema:** 1.0.0 · **required:** run_id; witnessed
- **allowed:** record that the human founder witnessed · **forbidden:** be set by any adapter/provider/checker/automation
- **persistence:** witness package · **upgrade:** additive · **failure:** unset → not witnessed · **UNKNOWN:** unset → UNKNOWN

### 17. CleanupEvidence
- **owner:** core (fed by sandbox adapter) · **schema:** 1.0.0 · **required:** snapshot_deleted; sandbox_torn_down; runtime_destroyed
- **allowed:** prove teardown before final green · **forbidden:** claim "removed" without verification
- **persistence:** `RUN_RESULT.json` + ledger destroy stage · **upgrade:** additive · **failure:** unverified → teardown_complete=false · **UNKNOWN:** unverified → UNKNOWN

### 18. ProjectAdapter
- **owner:** per-project · **schema:** 1.0.0 · **required:** detect; check_modules · **optional:** project_ext observations
- **allowed:** project-type detection, source-layout observations, language checks, allowed compileability commands, project-specific limitations & evidence modules · **forbidden:** issue acceptance, mark production/security, bypass Evidence Pack limits, weaken teardown or exact-version binding, bypass the one-job lock or checker requirement
- **persistence:** plan + namespaced extensions · **upgrade:** new adapter, core unchanged · **failure:** unsupported type → HELD · **UNKNOWN:** missing adapter → HELD/UNKNOWN
- **project ext:** owns `extensions.<type>` · **provider ext:** none

---
## Consumers
- **Today (Phase 7.1):** the Python public fixture is the single authorized live consumer; the
  core is exercised by it and by the synthetic web + Android/AKIOR-like descriptors in tests.
- **Future:** a second project and an outside operator consume the same core via new adapters;
  AKIOR consumes it only after the requirements in `AKIOR_ADOPTION_COMPATIBILITY_CONTRACT.md`
  and an AKIOR-side audit. **None of these are proven or authorized in this phase.**

No claim of "no future rework" is made. The contract bounds adoption to adapter work; it does not
promise the software will never change.
