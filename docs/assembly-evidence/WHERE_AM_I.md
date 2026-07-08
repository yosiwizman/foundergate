# Founder Where-Am-I Table (FounderGate-CTO-maintained)

> **Plain English.** This is the live status board for the Assembly Manual V1.2 run. The FounderGate CTO (Harvest
> Terminal) updates it after every substep; the founder reads it only at gates and never maintains it by hand.
>
> This is the *live* table. The template lives in Assembly Manual §14 (`docs/ASSEMBLY_MANUAL.md`), which is kept
> byte-identical and is therefore not edited in place.

| Bundle ID | Substeps included | Current substep | Status | Latest PR | Latest SHA | Evidence packet | Machine profile path | Next true founder gate | Founder action needed? | Safe to proceed? |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| B0 | A0, A1, A2 | A2 complete | **Docs landed — awaiting G1** | #15 | 6273b3808f2af8bad3983cfde41bbc44772a9dcc | docs/assembly-evidence/B0/ | docs/assembly-evidence/B0/machine-capacity-profile.json | **G1** | **Yes — G1 approval** | Blocked on G1 |
| **B12 — V8-A1 Implementation to UI Witness** | B1 (A4–A10) + B2 (A11–A24) | B2 complete | **B1+B2 landed; awaiting G2 UI witness** | #16, #17 | d2ad415 | docs/assembly-evidence/B12/ | docs/assembly-evidence/B12/machine-capacity-profile.json | **G2** | **Yes — G2** | At G2 |
| ↳ B1 (child phase of B12) | A4–A10 | A10 complete | **B1 machine gates PASSED — continuing into B2** | #16 | d6f06cf | docs/assembly-evidence/B1/ | docs/assembly-evidence/B1/machine-capacity-profile.json | none — continues into B2 | No | Yes (into B2) |
| ↳ B2 (child phase of B12) | A11–A24 (+UX repair) | complete | **UX-repaired app shell; 19/19 CI green; awaiting G2 re-witness** | #17, #18 | 170196f | docs/assembly-evidence/B2/ | docs/assembly-evidence/B2/machine-capacity-profile.json | G2 | **Yes — G2 re-witness** | At G2 |
| B3 | A27, A28 (+true-stranger + copy-polish) | complete | **Acceptance packet 17/18 full PASS; true-stranger PASSED; final CI green; awaiting G3** | #19, #20 | acd2b04 | docs/assembly-evidence/A28/V8-A1-acceptance-packet.md | docs/assembly-evidence/B3/machine-capacity-profile.json | G3 | **Yes — G3 approve/reject** | At G3 |
| B4 | A30 | complete | **V8-A2 proposal landed (docs-only); awaiting G4** | #22 | bd582d3 | docs/assembly-evidence/A30/ | docs/assembly-evidence/B4/machine-capacity-profile.json | G4 | **Yes — G4 approve/reject** | At G4 |

**Note:** `#15` / `6273b3808f2af8bad3983cfde41bbc44772a9dcc` are stamped with the real PR number and exact merge SHA immediately after the sheriff
merge. B0 is docs-only; no code, no schema, no `src/` change was made.
