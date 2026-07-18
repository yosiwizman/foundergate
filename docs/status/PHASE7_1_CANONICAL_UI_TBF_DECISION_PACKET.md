# Phase 7.1-Q Decision Packet (TBF-enforced)

**Host:** Mac16,11 / Apple M4 Pro. **Policy:** test-before-founder v1.0.0, digest `6df22c4f…947c4e`, ACTIVE (loaded + verified from disk before work).
**Machine-verification candidate (UI + evidence + exact-SHA CI): `7a12410246844d82f9f54dcf0caa60328720a137`.** The attestation commit adds this packet on top; **UI/tool/screenshot/video/trace bytes are byte-identical from bc56569 through the attestation head** (git diff = manifest + CI-index + note metadata only). Merge stays blocked.

| Determination | Value |
|---|---|
| TBF_POLICY_LOADED_AND_DIGEST_VERIFIED | YES |
| IMPACT_CLASSES | UI, API, RUNTIME, RECOVERY, SECURITY, GATE |
| REQUIRED_CLASSES / COVERED | 55 / 55 (49 file-evidence PASS + 6 meta) |
| CANONICAL_UI (neutral-first, one founder-launchable interface) | YES |
| HISTORICAL_PREPOPULATED_UI_FOUNDER_LAUNCHABLE | NO (NOT_FOUNDER_LAUNCHABLE) |
| CANONICAL_SERVICE_IDENTITY + IDENTITY-SAFE_LAUNCHER_REUSE | YES (foreign :port → UNKNOWN_SERVICE, fail closed) |
| HEADED_MAC_PLAYWRIGHT (screenshots+video+trace+console+network+page-errors) | YES (14 shots; 0 page-errors) |
| HEADLESS_EXACT_SHA_CI | YES (phase7-1 + tbf1 success, ubuntu-latest, 0 self-hosted) |
| ACCESSIBILITY_AXE + LOW-HAND (keyboard/zoom/reduced-motion/one-click) | YES |
| CACHE/STORAGE/SERVICE-WORKER (SW NONE; stale ignored) | YES |
| MUTATION + FALSE-GREEN | YES (qualification.selftest 23; registers map to guards) |
| RUNTIME/RECOVERY/TEARDOWN | YES (sc-0bc1b04f real run, VM destroyed; recovery/rollback/one-job-lock) |
| OPENING_APP_STARTS_A_VM | NO |
| BUILD/TESTS/SECURITY/PRODUCTION_PROVEN | NO/NO/NO/NO |
| INDEPENDENT_CHECKER | CHECKER-CLEAN (9 areas) |
| FINAL_ADVISOR | PASS-WITH-CORRECTIONS → material labeling finding corrected (candidate rebound; disclosure added); re-confirmed |
| TBF_WITNESS_READINESS (validator-derived) | READY_FOR_HUMAN_PERCEPTION_WITNESS |
| TBF_MERGE_READINESS | MERGE_BLOCKED (founder witness pending) |
| MAIN_MERGE / OPENSANDBOX_ADOPTION / CUSTOMER / PRIVATE / AKIOR / M1 | NO / NO / NO / NO / NO / NO |

**Remaining limitations:** a NEW fixed-fixture live run is authority-gated (prior real run sc-0bc1b04f stands as runtime proof); headed capture uses the labeled FG_UI_CI CI-FIXTURE path (live-VM proof = sc-0bc1b04f); merge remains blocked pending the founder witness.
