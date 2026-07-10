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
| B4 | A30 | complete | **V8-A2 proposal landed; G4 APPROVED (start only) — V8-A1 workflow complete** | #22 | bd582d3 | docs/assembly-evidence/A30/ | docs/assembly-evidence/B4/machine-capacity-profile.json | none (V8-A2 impl = future gated build) | No | Yes (future V8-A2 is a separate gated contract) |
| B5 (V8-A2 build contract) | — | complete | **V8-A2 lane packet/build contract landed; awaiting G1-A2** | #23 | 5048355 | docs/assembly-evidence/B5/ | docs/assembly-evidence/B5/machine-capacity-profile.json | **G1-A2** | **Yes — G1-A2 approve/reject** | At G1-A2 |
| **P-A2-BUILD — V8-A2** | Preview Bay + Bug Collector + acceptance | complete | **✅ V8-A2 CLOSED — G2-A2 PASSED; product-final dba8720 (CI green); 25/25** | #24,#25,#26 | dba8720 | docs/assembly-evidence/A2/ | docs/assembly-evidence/A2/machine-capacity-profile.json | — (V8-A3 is a future proposal/gate) | No | V8-A2 done |
| A3 (V8-A3) | — | proposal accepted | **G4-A2 ACCEPTED (V8-A2 complete) · G1-A3 APPROVED (start) — V8-A3 impl = future gated build** | #28 | 5e6d867 | docs/assembly-evidence/A3/ | docs/assembly-evidence/A3/machine-capacity-profile.json | none until a V8-A3 build contract | No | V8-A2 accepted; V8-A3 gated | 
| B-A3-PACKET (V8-A3 build contract) | — | complete | **V8-A3 lane packet/build contract landed; awaiting G1-A3-IMPL** | #29 | aa8fcc1 | docs/assembly-evidence/A3-PACKET/ | docs/assembly-evidence/A3-PACKET/machine-capacity-profile.json | **G1-A3-IMPL** | **Yes — G1-A3-IMPL approve/reject** | At G1-A3-IMPL |
| **P-A3-BUILD — V8-A3 File Cabinet** | FC-CLASS + FC-UI + acceptance | complete | **FC-CLASS(checker PASS)+FC-UI+AC landed; 31/31 CI green; awaiting G2-A3** | #31,#32 | e92f8b9 | docs/assembly-evidence/A3/ | docs/assembly-evidence/A3/machine-capacity-profile.json | **G2-A3** | **Yes — G2-A3 UI witness** | At G2-A3 |
| ↳ Phase FC-CLASS — classification+access (checker-approved) | FC1-FC3 | complete | **Secret-hiding core landed; checker round-2 PASS; 28/28 CI** | #31 | b549716 | docs/assembly-evidence/A3-FC/ | docs/assembly-evidence/A3-FC-CLASS/machine-capacity-profile.json | continues into FC-UI | No | Yes (into FC-UI) |
| ↳ Phase FC-UI — browse/preview (wide-safe) | FC4-FC8 | complete | **File Cabinet UI landed; screenshots captured** | #32 | e92f8b9 | docs/assembly-evidence/A3-FC-UI/ | docs/assembly-evidence/A3-FC-UI/machine-capacity-profile.json | G2-A3 | No | At G2-A3 |
| ↳ Phase PA — Preview Bay (checker-approved) | PA1-PA7 | complete | **Preview Bay landed; checker round-2 PASS; 23/23 CI** | #24 | 89c7c86 | docs/assembly-evidence/A2-PA/ | docs/assembly-evidence/A2-PA/machine-capacity-profile.json | continues into BC | No | Yes (into BC) |
| ↳ Phase BC — Bug Collector (wide-safe) | BC1-BC6 | complete | **Bug Collector landed; 24/24 CI** | #25 | 270719d | docs/assembly-evidence/A2-BC/ | docs/assembly-evidence/A2-BC/machine-capacity-profile.json | G2-A2 | No | Yes (into AC) |

**Note:** `#15` / `6273b3808f2af8bad3983cfde41bbc44772a9dcc` are stamped with the real PR number and exact merge SHA immediately after the sheriff
merge. B0 is docs-only; no code, no schema, no `src/` change was made.
