# FINAL STATUS — Fine-Grained PAT Read-Only Sandbox Proof (rerun, token present)

**STATUS: HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS**

A fine-grained PAT is now stored in the Keychain, but FounderGate **held** rather than perform intake, because the token's scope is not the narrow, sandbox-only, read-only grant this gate requires.

## Mechanical observations (token read from Keychain into memory only; never printed)
- `GET /user` → **200** — the token is valid and authenticates as **yosiwizman**; no classic OAuth scopes (confirmed fine-grained).
- `GET /repos/yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET` → **404**, and `GET .../contents` → **404**. **The token is NOT granted access to the sandbox repo.**
- `GET /user/repos` → **200, 100+ repositories** across multiple owners (including real repos and a different owner's repo). The sandbox was **not** in the token-visible set.

## Why HOLD (not a false green, not intake)
The token both (a) **cannot read the intended sandbox** (404) and (b) presents a **broad / ambiguous visibility surface** (100+ repos), which is the opposite of the single-repo read-only token this gate requires. FounderGate will not perform intake with a token whose scope it cannot verify as narrow. **No contents of any non-sandbox repository were fetched.** No token was printed, logged, or packaged.

## Exact founder fix (to advance the gate)
Recreate the fine-grained PAT restricted to **only** `yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET`, with **Contents: Read** and **Metadata: Read** (and no other repository access, no write, no workflow, no org-wide), then store it in macOS Keychain under service `foundergate-github-fgpat-sandbox-readonly` and rerun this gate. FounderGate never sees the value.

## Blocked / untouched
existing repo · customer repo · GitHub App · code exec · write/merge · provider · Gate 8 · deploy · bill — BLOCKED. PR #200 + protected `main` UNTOUCHED. **Never SHIP.**
