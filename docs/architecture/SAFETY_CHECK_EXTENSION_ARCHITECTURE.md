# Safety Check Extension Architecture (core vs adapter)

**Status:** COMPATIBILITY_PREPARED (design) + mechanical coupling audit of Phase 7.1 code.
Phase 7.1 Lane F. No AKIOR access. No live runtime.

## Required layering
```
CORE
  → authorized fixture registry        (config: which live inputs are allowed)
  → source adapter                     (URL validation, exact-version, snapshot)
  → project adapter                    (type detection, layout, language checks)
  → check plan                         (which harness-owned modules run)
  → sandbox adapter                    (create, upload, exec, export, teardown)
  → evidence normalizer                (adapter observations → canonical claims)
  → Evidence Pack                      (canonical JSON authority → MD/HTML/PDF/sha256/zip)
```

## The core OWNS (project-neutral, never adapter-overridable)
run-ID generation · one-job lock · append-only disk ledger · atomic recovery state · status
transitions · claim classes (PROVEN/OBSERVED/NOT_PROVEN/UNKNOWN/HELD/REFUSED) · Evidence Pack
schema · checker status vocabulary · teardown requirements (verified before green) · founder-facing
truth rules (results hidden until COMPLETE, bound to run-id + repo) · UNKNOWN and STALE behavior.

## Project adapters MAY own
project-type detection · source-layout observations · language-specific checks · allowed
compileability commands (harness-owned only) · project-specific limitations · project-specific
evidence modules (namespaced).

## Sandbox-provider adapters MAY own
sandbox creation · file upload · command execution · artifact export · teardown.

## Source-provider adapters MAY own
URL validation · exact-version resolution · snapshot acquisition · snapshot observations.

## No adapter MAY
issue founder acceptance · mark production readiness · declare security · bypass Evidence Pack
limitations · weaken teardown · weaken exact-version binding · bypass the one-job lock · bypass
checker requirements.

---
## Mechanical coupling audit (Phase 7.1 code)
Inspected `src/safety_check/service.mjs`, `src/safety_check/run-job.sh`, `src/safety_check/evidence-pack.mjs`,
`src/founder_url_drop/ui/safety.js` for: pypa · sampleproject · Python-only assumptions · pyproject.toml ·
`src/` layout · compileall · GitHub-specific response fields · OpenSandbox-specific types.

| Occurrence | Location | Classification | Disposition |
|---|---|---|---|
| `const FIXTURE = "https://github.com/pypa/sampleproject"` | service.mjs:21 | **FIXTURE CONFIGURATION** | Keep — single authorized live input; one constant, not embedded in generic logic |
| `p.hostname === "github.com"` URL validation | service.mjs:43 | **SOURCE ADAPTER** | Belongs to a GitHub source adapter; core just calls classifyUrl |
| `FIXTURE` echoed in CI-FIXTURE synthetic result | service.mjs:92 | **FIXTURE CONFIGURATION** (test scaffold, labeled `scenario:"CI-FIXTURE"`) | Keep — deterministic test path, clearly labeled, never the founder path |
| `const FIXTURE` + `STAGES` names in UI | safety.js:3-6 | **FIXTURE CONFIGURATION** (display) | Keep — presentation of the configured fixture; UI reads run-bound state, invents nothing |
| resolve exact commit / acquire snapshot / manifest | run-job.sh | **SOURCE ADAPTER** | GitHub source-adapter behavior; exact-version + snapshot are core-required outputs |
| `pyproject`/`compileall` byte-compile | run-job.sh | **PROJECT ADAPTER** (python) | Python check module; a different project type would supply its own module |
| Lima/VZ VM + loopback-patch orchestration | run-job.sh | **SANDBOX ADAPTER** (OpenSandbox candidate) | Provider-replaceable; core sees only stages + export |
| Port-guard / egress / socket observations | run-job.sh → evidence-pack.mjs | **evidence normalizer input** | Normalized into core claims; no OpenSandbox type leaks into the pack schema |

### Finding: NO IMPROPER CORE COUPLING
The generic core (run-id, one-job lock, ledger, recovery, status transitions, Evidence Pack
schema, truth rules) contains **zero** Python/pypa/OpenSandbox type dependencies. The fixed
fixture appears only as (a) a single configuration constant and (b) a labeled CI test scaffold —
it is **not embedded throughout the core**. Python `compileall` and the Lima/OpenSandbox VM live
in `run-job.sh`, which is the **project + sandbox adapter layer**, exactly where they belong.

No refactor was required. The fixed fixture remains the only authorized live input **as
configuration**, and the executable contract in `prototypes/project_adoption/` proves the core
value types are project-neutral (test 02: the fixture string does not appear in `plan_checks` or
`build_evidence_pack`).

### Honest limitation
Phase 7.1's `run-job.sh` interleaves the source, project, and sandbox adapter responsibilities in
one script for the single authorized fixture. That is acceptable for one live input but is
**COMPATIBILITY_PREPARED, not yet a separated adapter implementation**. Splitting `run-job.sh`
into distinct source/project/sandbox adapter modules is bounded future work (labeled PLANNED in
the readiness matrix), required before a *second live project*, and does not affect the
project-neutrality of the core.
