# Project Knowledge Update Bundle V12.1 — Least-Privilege Evidence Reseal

**Status: EVIDENCE RECONCILIATION (local, with limits). Not accepted governance. Not current verified state beyond the sealed artifacts. Authorizes nothing. Never SHIP.**

## Why V12.1 exists
The V12 least-privilege deploy-key proof was technically sound, but its **sealed ZIP was assembled before the two independent reviewers finished**, so it lacked `CHECKER_REPORT.md` and `GATE_ADVISOR_REPORT.md`, and its `FINAL_STATUS` embedded the pre-amend seal head `19f280e` instead of the true evaluated head `931dd5314f373e22d717561daaf64c25a460f972`. This is a **correctable evidence-package defect, not a failed proof**.

## What V12.1 does
- Reviews the prior ZIP mechanically (SHA-256 `d46ce5cf…`, 49 entries, unzip OK, SHA256SUMS OK, secret-clean, reviewer reports ABSENT).
- Reconciles candidate identity with an explicit **two-SHA seal**: evaluated_sha `931dd5314f373e22d717561daaf64c25a460f972` (reviewed candidate) + evidence_commit_sha (this reseal, in SEAL.json).
- Captures both reviewer reports (self-bound to `931dd5314f373e22d717561daaf64c25a460f972`) **into** the V12.1 package.
- Reseals a complete V12.1 witness ZIP.

## What is (still) NOT claimed
NOT fine-grained-PAT-proven · NOT GitHub-App-proven · NOT existing-founder-repo-proven · NOT customer-repo · NOT private-repo-support-complete · NOT production/SaaS/commercial/paid/security-certified · NOT merge-ready · NOT Gate 8 complete.
