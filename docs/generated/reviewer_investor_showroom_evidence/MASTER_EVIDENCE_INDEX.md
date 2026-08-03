# Master Evidence Index
Every item is LOCAL / SYNTHETIC only. "May show evaluator later" is gated behind Gate 8 (a separate founder phrase).

| # | Name | Status | ZIP | Branch/head | Checker | Terminal Advisor | Founder accepted | Proves | Does NOT prove | Show later? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Governance / Constitution | ACTIVE | (in-repo docs) | — | n/a | n/a | ongoing | the run discipline (branch isolation, two reviewers, sealed ZIPs, never-ship) | production/security | after Gate 8 |
| 2 | Request-artifact binding correction | CORRECTED_WITH_LIMITS | FounderGate_RequestArtifactBinding_Correction_ChatGPT_20260803T0640ET.zip | d1b18cdc274d | CLEAN_WITH_LIMITS | REQUEST_ARTIFACT_BINDING_CORRECTED_WITH_LIMITS | no | requests bind to a real artifact/test/preview | customer/paid | after Gate 8 |
| 3 | False-green audit + correction | FALSE_GREEN_CONFIRMED→CORRECTED | (audit ZIPs 0615/0630 + binding fix) | d1b18cdc274d | CLEAN_WITH_LIMITS | CORRECTED_WITH_LIMITS | no | the system can catch its own false-green | production | after Gate 8 |
| 4 | Natural-language matcher correction | CORRECTED_WITH_LIMITS | FounderGate_TaskPlanner_NaturalLanguageMatcher_Correction_20260803T0735ET.zip | 6d15157677f7 | CLEAN_WITH_LIMITS | NATURAL_LANGUAGE_MATCHER_CORRECTED_WITH_LIMITS | no | founder-natural wording maps correctly | full NLU | after Gate 8 |
| 5 | Local App Factory Round 1 | PROVEN_WITH_LIMITS | FounderGate_LocalAppFactory_SelfProof_Gauntlet_20260803T0835ET.zip | 4faeff688b3c | CLEAN_WITH_LIMITS | LOCAL_APP_FACTORY_PROVEN_WITH_LIMITS | no | generate+test 4 local synthetic apps, visible browser | arbitrary generation | after Gate 8 |
| 6 | Local App Factory Round 2 | REPEATABILITY_PROVEN_WITH_LIMITS | FounderGate_LocalAppFactory_Repeatability_Round2_20260803T0915ET.zip | b9aaf0a9a1a8 | CLEAN_WITH_LIMITS | LOCAL_APP_FACTORY_REPEATABILITY_PROVEN_WITH_LIMITS | no | repeat with 4 different apps | production | after Gate 8 |
| 7 | Crash Recovery Gauntlet | PROVEN_WITH_LIMITS | FounderGate_LocalAppFactory_CrashRecovery_Gauntlet_20260803T1030ET.zip | c5dfca39a482 | CLEAN_WITH_LIMITS | CRASH_RECOVERY_PROVEN_WITH_LIMITS | no | 12 faults held, 6 recovered, 0 green | production resilience | after Gate 8 |
| 8 | Founder Drive Mode | READY_WITH_LIMITS | FounderGate_FounderDriveMode_ReviewerReadiness_20260803T1145ET.zip | fb7b4dd8fa41 | CLEAN_WITH_LIMITS | FOUNDER_DRIVE_MODE_READY_WITH_LIMITS | no | non-dev can read pass/hold/blocked | usability at scale | after Gate 8 |
| 9 | Founder Drive Mode Manual Retest | PASS_WITH_LIMITS | FounderGate_FounderDriveMode_ManualRetest_COMPLETE_20260803T1210ET.zip | fb7b4dd8fa41 | FOUNDER_MANUAL_RETEST_PASS_WITH_LIMITS | FOUNDER_DRIVE_MODE_MANUAL_RETEST_PASS_WITH_LIMITS | no | founder actually used the screen | market fit | after Gate 8 |
| 10 | Safety Check product kit (Wave 11) | BUILT_ACCEPTED_WITH_LIMITS | FounderGate_Wave11_Overnight_Safety_Check_Product_Kit_ChatGPT_20260803T0000ET.zip | 662c0569f6de | CLEAN (7/7) | READY_WITH_LIMITS | yes | a sample product kit exists | that it is sold | after Gate 8 |
| 11 | Real repo / folder proof | PASS 30/30 (read-only) | (docs/generated/real_self_owned_repo_proof + real_local_folder_proof) | 2882f4e0 / 3981d28e | prior reviewers | prior reviewers | no | ran existing tests on a real self-owned repo/folder, no install | production | after Gate 8 |
| 12 | Public demo / cross-account proof | PASS (anonymous read-only) | (docs/generated/wave8_public_self_owned_multirepo_proof + cross_account_proof) | 2882f4e0 | prior reviewers | prior reviewers | no | public self-owned multi-repo checks | production | after Gate 8 |
| 13 | Real-provider controlled proof | MISSING_LOCAL_ARTIFACT | — | — | — | — | — | (no local artifact found for a real-provider run) | — | n/a |

Item 13 is marked MISSING_LOCAL_ARTIFACT — not invented.
