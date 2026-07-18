# project_adoption — synthetic FounderGate adoption contract (Phase 7.1 Lane F)

**Mode:** WIDE-SAFE · design + synthetic contract tests only · **no AKIOR access · no network · no repository execution · standard library only.**

## What this is
A **design prototype** of the project-neutral core interfaces that let future FounderGate
projects (a second project, an outside operator, and later AKIOR) adopt the Safety Check +
Evidence Pack through **bounded adapters**, not a core rewrite. It is executable so the
contract boundaries are *proven by test*, not merely asserted in prose.

## What this is NOT
- Not AKIOR. No AKIOR code is imported, read, or executed.
- Not Android/Gradle/device support. The Android descriptor is **schema-only** and stays
  `NOT_AUTHORIZED`.
- Not a second-project, outside-operator, or private-repository proof. Those remain future
  gates. This prototype only proves the *contract shape* holds under synthetic adapters.
- Not founder acceptance. No adapter or provider can issue acceptance, merge, production,
  security, or customer authority.

## Files
- `adoption_contract.py` — project-neutral core value types, the founder-only `Acceptance`
  authority, abstract `ProjectAdapter`/`SourceProvider`/`SandboxProvider` seams, the
  `build_evidence_pack` core + namespaced `extensions`, `validate_pack_schema` (fail-closed),
  and three synthetic adapters (Python public fixture, generic web, Android/AKIOR-like).
- `test_adoption_contract.py` — the 20 required contract tests.

## Run
```
cd prototypes/project_adoption && python3 -m pytest test_adoption_contract.py -q
```

## The 20 proven properties
1 core run state is project-neutral · 2 fixture URL is configuration, not core logic ·
3 exact-version identity required · 4 immutable snapshot required · 5–7 project/source/sandbox
adapters cannot accept · 8 project fields stay namespaced · 9 extensions cannot overwrite core
claims · 10 unsupported type → HELD · 11 missing adapter → HELD/UNKNOWN · 12 unsupported module
does not run · 13 python compileability not applied to Android · 14 Android implies no Gradle ·
15 AKIOR-like stays NOT_AUTHORIZED · 16 Evidence Pack core identical across project types ·
17 schema mismatch fails closed · 18 future fields preserved/rejected per version policy ·
19 no project code in the authority layer · 20 no private-repository support implied.

## Truth labels (never blurred)
`IMPLEMENTED` · `PROVEN` · `COMPATIBILITY_PREPARED` · `PLANNED` · `HELD` · `NOT_AUTHORIZED` ·
`UNKNOWN`. This prototype is **COMPATIBILITY_PREPARED + PROVEN-for-the-contract-shape**; it does
not make any capability `PROVEN` for live runtime. No claim of "no future rework" is made — the
goal is bounded adapter work, not a promise that software never changes.
