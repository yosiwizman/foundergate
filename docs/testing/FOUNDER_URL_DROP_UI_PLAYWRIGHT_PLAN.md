# Founder URL-Drop UI — Playwright / Browser Proof Plan (Phase 7, Lane E)

Drive the real loopback app and capture screenshots + trace proving the 20 required assertions. If a full Playwright install is unavailable in-scope, an equivalent scripted browser proof (Claude-in-Chrome automation) capturing the same 20 assertions + screenshots is the recorded fallback; either way the evidence is real DOM state, never mocked.

## 20 proofs (screenshot each)
1 app surface opens · 2 URL-drop flow discoverable · 3 fixed fixture selectable/pasteable · 4 private/unsupported URL refused · 5 public-only limitation visible · 6 one primary action starts the check · 7 progress updates appear · 8 exact commit appears · 9 snapshot fingerprint appears · 10 compileability-only result appears · 11 build-not-proven appears · 12 tests-not-proven appears · 13 deletion status appears · 14 evidence drawer opens · 15 Pause & get help always accessible · 16 missing evidence → UNKNOWN · 17 stale evidence → STALE · 18 failure state shows no success · 19 mobile-width flow usable · 20 no raw localhost/terminal/dev-log founder-facing.

## Method
- Start the app on loopback. Use `/api/state?scenario=...` query to drive deterministic UNKNOWN/STALE/failure scenarios for proofs 16–18 without faking green.
- Capture full-page screenshots + a trace/console log. Store under `docs/testing/evidence/` and index in the witness evidence index.
