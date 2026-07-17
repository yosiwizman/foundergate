# Founder URL-Drop UI — Browser Proof (Phase 7, Lane E executed)

Real DOM proof captured by driving the live loopback app (`http://127.0.0.1:4700/`) in Chrome (Claude-in-Chrome automation — the recorded equivalent of the Playwright plan; evidence is real DOM state, never mocked). Server = `src/founder_url_drop/server.mjs` reading the FRESH Phase-7 live-run state.

## Proven (screenshots captured)
1. App surface opens (title "Check a public GitHub project", witness-candidate flag). ✓
2. URL-drop flow discoverable (input + "Use evaluation fixture" + one primary "Run Safety Check"). ✓
3. Fixed fixture selectable/pasteable. ✓
4. **Private/SSH URL refused** — `git@github.com:acme/private-repo.git` → "Refused: SSH/git URL not permitted". ✓
5. **Non-fixture public URL HELD** — `https://github.com/torvalds/linux` → "HELD — GENERAL PUBLIC-REPOSITORY EXECUTION NOT YET AUTHORIZED". ✓
6. Public-only limitation visible (pills). ✓
7. One primary action starts the check; progress stages animate. ✓
8. **Exact commit appears** — `621e4974ca25ce531773def586ba3ed8e736b3fc`. ✓
9. **Snapshot fingerprint appears** — archive `fd8597e4…`, manifest `649ecb02…`, files 12. ✓
10. **Compileability-only result** — "Compileability observed". ✓
11. **Build not proven** badge. ✓  12. **Tests not proven** badge. ✓ (+ Security / Production not proven)
13. **Deletion status** — Cleanup card: "Temporary sandbox removed" + "Disposable machine destroyed". ✓
14. Evidence drawer present (Evidence details). ✓
15. **Pause & get help always accessible** (top bar, every viewport). ✓
16. **Missing evidence → UNKNOWN** — `?scenario=unknown` → Result "UNKNOWN", compileability badge dimmed (no green). ✓
17. Stale → STALE — `?scenario=stale` supported (freshness STALE). ✓
18. **Failure shows no success** — UNKNOWN/failure scenarios never render the compileability-observed green. ✓
19. **Mobile-width usable** — 390px single-column, no horizontal scroll, large targets, Pause visible. ✓
20. **No raw localhost/terminal/dev-log founder-facing** — only plain cards; no command/log surfaced as an action. ✓

## Correction cycle (recorded)
Cycle 1 finding: the Pause modal rendered on load because `.modal{display:flex}` overrode the `[hidden]` attribute. Fix: added `[hidden]{display:none !important}`. Re-verified: modal hidden on load, opens only on Pause click, closes on Close/Escape. RESOLVED.
