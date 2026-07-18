# FFS-1 Decision Packet

**Policy:** test-before-founder **v1.1.0**, digest `e1fbb8f0…d7d3`, ACTIVE (FFS-1 amendment; foreground_founder_surface in UI floor). **Machine-verification candidate:** `0af5f0cdda1b0bad9f9775182fdbe6acaf77814b` (CI-green head; substantive foreground evidence + committed pack byte-identical). **Prior "visible headed" claim: PRIOR_FOREGROUND_VISIBILITY: NOT PROVEN.**

| Determination | Value |
|---|---|
| FFS_LAW_MACHINE_ENFORCED | YES (foreground_validate + 20 mutation proofs + UI floor + prompt stop value) |
| MACHINE_PROFILE | .foundergate/machine_profiles/mac-mini-pro-founder-surface.json (Google Chrome) |
| COMPLETION_INVARIANT_ENFORCED | YES (UNKNOWN/CORRUPT pack ⇒ COMPLETE_PACK_FAILED, not acceptable) |
| EVIDENCE_PACK_FAILURE_CLASS | NOT_GENERATED at runtime (stage 11 UNKNOWN; generator returned nonzero, precise cause UNKNOWN) |
| EVIDENCE_PACK_RECOVERY | RECOVERED deterministically from sealed evidence (no new run/VM/clone); hash-verified |
| RUN_sc-15f0cfc5 | bound to disk; one live run; VM destroyed; pack now AVAILABLE |
| FOREGROUND_RUN | FOREGROUND_TEST_VERIFIED (real launcher + Google Chrome frontmost/onscreen + DOM download) |
| WINDOW_PROOF | frontmost Google Chrome, 1 window, onscreen bounds, minimized false |
| NO_SECOND_LIVE_RUN / NO_VM / NO_POST_CHECK | YES / YES / YES |
| HEADLESS_EXACT_SHA_CI | tbf1-policy + phase7-1 success at 0af5f0c, ubuntu-latest, 0 self-hosted |
| INDEPENDENT_CHECKER | FFS1-CHECKER-CLEAN (findings corrected) |
| FINAL_ADVISOR | FFS1-ADVISOR: READY-FOR-MINIMAL-PACK-WITNESS |
| TBF_WITNESS_READINESS | READY_FOR_HUMAN_PERCEPTION_WITNESS (validator-derived) |
| TBF_MERGE_READINESS | MERGE_BLOCKED |
| MAIN_MERGE / OPENSANDBOX / CUSTOMER / PRIVATE / AKIOR / M1 | NO / NO / NO / NO / NO / NO |

**Disclosed limitations (Advisor findings, not correctable without a new authorized run):** foreground candidate_sha is a declarative label captured against the working tree that became 0af5f0c (service.mjs/safety.js changed vs the parent — the completion-invariant fix; only foreground artifacts + the committed pack zip are byte-identical) — see SHA_BINDING_LIMITATION.md; repo-wide there are two historical live runs (FFS-1 launched zero); screenshot labeling clarified.
