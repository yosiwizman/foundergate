# Founder URL-Drop UI — Spec (Phase 7, Lane B) — FROZEN CONTRACT

**Status:** DESIGN · founder-witness candidate, **not an accepted product surface**. Zero-dependency loopback Node app in the FounderGate idiom (`src/founder_url_drop/server.mjs` + `ui/`). Reads **real** Phase-6/Phase-7 evidence; missing → `UNKNOWN`; stale → `STALE`. **No invented green state.**

## The founder flow (14 steps)
1. Open FounderGate (the URL-drop app on loopback). 2. Select "Check a public GitHub project." 3. Paste **or select** the fixed public fixture URL. 4. See "Public repositories only." 5. See "Private repositories are not supported." 6. Click one primary action **Run Safety Check**. 7. See progress stages: validating URL → resolving exact commit → acquiring immutable snapshot → checking archive safety → creating disposable sandbox → checking source parsing → exporting evidence → deleting snapshot → destroying sandbox. 8. See exact commit + snapshot fingerprint. 9. See evidence-backed result. 10. See limitations (source parsing observed; build not proven; tests not proven; security not proven; production readiness not proven). 11. See deletion proof. 12. Open evidence details. 13. Find "Pause & get help." 14. Understand the next safe action.

## Surfaces (components)
URL input · fixed evaluation-fixture shortcut · public-only warning · unsupported/private-repository refusal · one primary "Run Safety Check" action · progress timeline (9 stages) · current-stage indicator · **exact-commit card** · **snapshot-fingerprint card** · **safety-boundary card** · **result card** · **limitations card** · **deletion card** · **evidence drawer** · **Pause & get help** (always visible) · **failure-modes reminder** · **next-safe-action card**.

## UI truth rule (hard)
Every screen reads real Phase-7 run state, reads real Phase-6 evidence where reused, or is clearly labeled `MOCK`/`FIXTURE`/`SPEC`. Missing data → `UNKNOWN`. Stale data → `STALE`. The UI must never imply: application works · build passed · tests passed · repository is secure · repository is production-ready · OpenSandbox is adopted · arbitrary customer repositories are supported.

## Fixed-fixture restriction (hard)
The live path accepts **only** `https://github.com/pypa/sampleproject`. Any other valid-looking public URL returns **`HELD — GENERAL PUBLIC-REPOSITORY EXECUTION NOT YET AUTHORIZED`**. Private/SSH/`file://`/non-GitHub/credential URLs return a refusal. No arbitrary public-repository runtime is offered.

## "PASS" rule
The UI must not display "PASS" without naming exactly what passed. The result card shows **Source parsing observed** (green only for that specific fact), with explicit `BUILD NOT PROVEN` / `TESTS NOT PROVEN` / `SECURITY NOT PROVEN` badges alongside.

## What "Source parsing observed" means (rationale — normative)
The observation comes from `python -m compileall`. That command **byte-compiles the Python source to bytecode**; the harness records the generated `.pyc` digests and then deletes them. It **does not merely search text**, and it **does not execute the project**. It proves nothing about runtime behavior, dependency correctness, native compilation, integration, safety, or production readiness — those remain `NOT PROVEN`. Never describe this check as "no compiler runs": a compiler does run, but no build system, package installer, test runner, linker, or native toolchain runs, and no repository-defined command is executed.

"Source parsing observed" is the **founder-facing label only**. The machine classification token in `RUN_RESULT.json` / `GET /api/state` and the Evidence Pack JSON key `compileability` are unchanged machine contracts and must not be renamed.

## Read-only API (loopback, zero-dependency)
- `GET /` → the app HTML. `GET /ui/*` → allowlisted static assets.
- `GET /api/state` → the current run record: `{ fixture_url, exact_commit, archive_sha256, manifest_sha256, manifest_file_count, stages[], result, compileall_exit, limitations, deletion, vm_destruction, freshness, source }`. Any absent field is literally `"UNKNOWN"`; a stale run is flagged `freshness:"STALE"`.
- `GET /api/evidence` → the evidence index (paths + sha256, from committed Phase-6 + the Phase-7 live run).
- No write/exec/route/send endpoint. No provider or checker may write a founder-acceptance field (there is none in the API).

## Data sources
The app reads a single JSON state file produced by the Phase-7 live runtime run (`docs/research/opensandbox/phase7/OPEN_SANDBOX_PHASE7_UI_RUN_STATE.json`) and the committed Phase-6 evidence. If the state file is missing/older-than the evidence, the UI shows `UNKNOWN`/`STALE` rather than any green.
