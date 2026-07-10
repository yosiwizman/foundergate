# VA-LOCKS — permanent controls that close two Run-1 incident classes

> **Plain English.** During Stranger Test Run 1, two process failures happened. Rather than promise "we'll be more
> careful," we installed two permanent controls so neither can recur. This folder is the evidence.

## Incident 1 — a red build got merged to main (PR #43)
**What happened:** the Run-1 evidence PR ran CI that FAILED, but the merge went through anyway (the merge step
didn't gate on the CI conclusion), briefly turning `main` red.

**Permanent control (Lane 1):** GitHub **branch protection** on `main` now requires the `selftests` check to pass
before any merge, with **enforce_admins = true** — so even an admin cannot merge a red build. This is mechanical,
not a promise. Raw proof: `branch-protection.json` (required check `selftests`; `enforce_admins.enabled = true`).

## Incident 2 — a live session corrupted the committed fixture
**What happened:** the Run-1 launcher pointed the servers at the *committed* mock fixture, so the Preview Bay wrote
a tracked process into `run_state.json` and the Bug Collector saved a bug file into it; `git add -A` swept both in
and broke the fixture-dependent tests.

**Permanent controls:**
- **Launcher runs on a throwaway copy** (fixed in PR #44): `npm run stranger-test` copies the fixture to a temp
  dir and points every server there via `FG_PROJECT_ROOT`, so a live session can never touch the committed fixture.
- **Fixture-pristine guard (Lane 2):** `src/v8a1/fixture-pristine.selftest.mjs` recomputes a content hash of every
  file in `src/v8a1/fixture/mock-project` and compares it to the blessed manifest `fixture.manifest.json`. Any
  unintended change (a swept-in session artifact) **fails CI**. An intentional fixture change refreshes the
  manifest in the same PR (`node src/v8a1/fixture-pristine.selftest.mjs --write`). Verified: the guard catches the
  exact Run-1 mutation (a `run_state.json` change) and passes on the clean fixture.

## Run 2 readiness (Lane 3)
- Blank Run-2 capture sheet: `docs/assembly-evidence/VA/stranger-test-run-2.md` (AWAITING a real run — Law 54).
- `npm run stranger-test` serves the four apps (Dashboard :4173, Preview Bay :4300, File Cabinet :4400, Guide
  :4500) on a **throwaway copy** of the fixture, with the D1–D5 fixes live.

**Both Run-1 incident classes are now closed by permanent, CI-/platform-enforced controls — not by promise.**
