# FINAL STATUS — Fine-Grained PAT Read-Only Sandbox Proof

**STATUS: TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED**

FounderGate completed the entire local fine-grained-PAT proof path, but **did not assert actual PAT intake** because **no safe Keychain-stored fine-grained PAT was present** (service `foundergate-github-fgpat-sandbox-readonly` → not found). **No token was requested from the founder; no secret was exposed.**

## What was proven (local, with limits)
- Keychain existence checked attributes-only (token_present=false); no value retrieved/printed/logged.
- Keychain-only loader: token never prints/returns/packages; redacted fingerprint only (tests 7/7).
- PAT authority + scope model: classic-PAT/broad-auth/deploy-key refused; fine-grained PAT accepted only if repo-scoped read-only on the sandbox (tests 13/13).
- 30/30 write/abuse refusal matrix; revocation/expiry model (7/7); evidence replay REPLAY_VERIFIED_GATE_REQUIRED (5/5); UI honest TRUE_FOUNDER_GATE state; UNKNOWN when evidence missing.

## What is NOT asserted
Actual fine-grained-PAT intake · live scope verification · exact commit/snapshot binding · secret classification — all **NOT ASSERTED** (no token).

## Blocked / untouched
existing repo · customer repo · GitHub App · code exec · write/merge · provider · Gate 8 · deploy · bill — BLOCKED. PR #200 + protected `main` UNTOUCHED. **Never SHIP.**

## To advance this gate (founder action, later)
The founder creates a **repo-scoped, read-only-contents fine-grained PAT** for the sandbox repo and stores it in macOS Keychain under service `foundergate-github-fgpat-sandbox-readonly`, account `yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET`. FounderGate never sees the value; it reads the token from Keychain into memory only. Then this same gate proves actual read-only intake.
