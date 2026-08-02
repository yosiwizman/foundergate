# Beta Freeze Slice — Scope (FROZEN)
This is a deliberately minimal, frozen beta-scope candidate. It defines exactly what the beta slice includes and excludes. Frozen = content is hash-locked (see FREEZE_MANIFEST.txt); any change breaks the freeze and requires a new freeze.

## IN this beta slice (frozen)
- One local, dependency-free synthetic task-ledger module (add/remove/setStatus/addEvidenceNote/summarize/decision).
- A deterministic 30-assertion self-test that runs from a clean checkout with no install.
- Honest status reporting: decision() returns INSUFFICIENT / DO_NOT_SHIP / IN_PROGRESS / ALL_DONE_LOCAL_DEMO — never SHIP.
- Synthetic sample data only.

## OUT of this beta slice (explicitly excluded)
- No network, no server, no database, no authentication, no multi-user, no persistence beyond a JSON file.
- No provider integration, no deployment, no hosting, no billing, no telemetry.
- No customer, private, or production data.
- No security/compliance posture, no SaaS, no market/customer validation.
- No PR/merge, no changes to any existing repo, no production release.

## What "beta" means here
A frozen, reviewable minimal slice for internal evaluation — NOT a public beta launch, NOT customer onboarding, NOT production availability.
