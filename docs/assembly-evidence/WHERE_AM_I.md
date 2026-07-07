# Founder Where-Am-I Table (FounderGate-CTO-maintained)

> **Plain English.** This is the live status board for the Assembly Manual V1.2 run. The FounderGate CTO (Harvest
> Terminal) updates it after every substep; the founder reads it only at gates and never maintains it by hand.
>
> This is the *live* table. The template lives in Assembly Manual §14 (`docs/ASSEMBLY_MANUAL.md`), which is kept
> byte-identical and is therefore not edited in place.

| Bundle ID | Substeps included | Current substep | Status | Latest PR | Latest SHA | Evidence packet | Machine profile path | Next true founder gate | Founder action needed? | Safe to proceed? |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| B0 | A0, A1, A2 | A2 complete | **Docs landed — awaiting G1** | #15 | 6273b3808f2af8bad3983cfde41bbc44772a9dcc | docs/assembly-evidence/B0/ | docs/assembly-evidence/B0/machine-capacity-profile.json | **G1** | **Yes — G1 approval** | Blocked on G1 |
| **B12 — V8-A1 Implementation to UI Witness** | B1 (A4–A10) + B2 (A11–A24) | — | Awaiting G1 | — | — | docs/assembly-evidence/B12/ | docs/assembly-evidence/B12/machine-capacity-profile.json | **G2** | No | Unknown |
| ↳ B1 (child phase of B12 — not a founder-paste stop) | A4–A10 | — | Awaiting G1 | — | — | docs/assembly-evidence/B1/ | docs/assembly-evidence/B1/machine-capacity-profile.json | none — continues into B2 | No | Unknown |
| ↳ B2 (child phase of B12 — not a founder-paste stop) | A11–A24 | — | Runs after B1 machine gates | — | — | docs/assembly-evidence/B2/ | docs/assembly-evidence/B2/machine-capacity-profile.json | G2 | No | Unknown |
| B3 | A27, A28 | — | Awaiting G2 | — | — | docs/assembly-evidence/B3/ | docs/assembly-evidence/B3/machine-capacity-profile.json | G3 | No | Unknown |
| B4 | A30 | — | Awaiting G3 | — | — | docs/assembly-evidence/B4/ | docs/assembly-evidence/B4/machine-capacity-profile.json | G4 | No | Unknown |

**Note:** `#15` / `6273b3808f2af8bad3983cfde41bbc44772a9dcc` are stamped with the real PR number and exact merge SHA immediately after the sheriff
merge. B0 is docs-only; no code, no schema, no `src/` change was made.
