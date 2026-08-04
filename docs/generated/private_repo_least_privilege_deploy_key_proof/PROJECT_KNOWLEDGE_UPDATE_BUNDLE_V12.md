# Project Knowledge Update Bundle V12 — Least-Privilege Read-Only Deploy Key Proof

**Status: EVIDENCE SUMMARY (local, with limits). Not accepted governance. Not current verified state beyond the sealed artifacts. Authorizes nothing. Never SHIP.**

## New this bundle (V12)
FounderGate created **one temporary repo-scoped READ-ONLY deploy key** on the founder-owned private sandbox repo, performed **actual private-repo read-only intake using ONLY that key** (SSH `IdentitiesOnly=yes`; broad auth used only to create+delete the key), bound exact commit `fb54698d5cbba4b55ef5aac2b189615154efc76e` + snapshot/manifest, **held 5 fake secrets** (no content exposed), **refused 25/25** write attempts, **revoked** the key with **verified post-revocation failure**, **destroyed the private key**, passed a **17/17 headed UI proof** (8 screenshots), and produced **REPLAY_VERIFIED** evidence.

## Delta vs the prior private-sandbox proof
Prior proof used existing broad GitHub auth for intake. V12 tightens the credential boundary to a **least-privilege, revocable, read-only deploy key** and mechanically proves revocation + private-key destruction.

## Still blocked (unchanged; each a separate founder gate)
fine-grained-PAT · GitHub-App · existing valuable repo · customer repo · write/merge · provider · code execution · Gate 8 · deploy · bill. PR #200 and protected `main` untouched.

## Label
`LEAST_PRIVILEGE_DEPLOY_KEY_PROOF_READY_WITH_LIMITS` — explicitly **not** private-repo-support-complete, **not** customer-repo, **not** fine-grained-PAT, **not** GitHub-App, **not** production/SaaS/commercial/paid/security-certified.
