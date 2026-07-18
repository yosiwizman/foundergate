# Founder URL-Drop UI — Witness Protocol (Phase 7, Lane B)

The founder witness tests **human perception and usability only** — not code, security, Git, Docker, or raw evidence.

## Setup (operator, before the founder sits down)
1. Confirm the Phase-7 live run state file exists and is fresh (else the UI shows UNKNOWN/STALE — do not proceed to witness as "success").
2. Launch the app: `node src/founder_url_drop/server.mjs` → open the printed loopback URL.

## Founder steps
1. Open the app. 2. Read "Public repositories only." 3. Click the fixed-fixture shortcut (or paste the exact URL). 4. Click **Run Safety Check**. 5. Watch the progress timeline complete. 6. Read the exact-commit + fingerprint cards. 7. Read the result: **Compileability observed** + **Build not proven** + **Tests not proven** + **Security not proven**. 8. Read the deletion card (sandbox + VM removed). 9. Open the evidence drawer once. 10. Find **Pause & get help**. 11. Try a different public URL → confirm it is **HELD**. 12. Try a private/SSH URL → confirm it is **refused**.

## Founder decision (one of three)
- **Accept as a witness candidate** (usability is clear) — this is NOT product acceptance, adoption, or a security sign-off.
- **Reject** (confusing / overclaims / can't find Pause).
- **Report a problem** (specific issue).

## What the founder must NOT be asked to do
Inspect code, terminals, raw logs, individual fixes, or intermediate screenshots. Validate Git/Docker/security/evidence integrity.
