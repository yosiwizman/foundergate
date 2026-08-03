# Lane J — Independent Checker Report (read-only; tried to FALSIFY)
All 10 falsification attempts REFUTED (the factory holds):
1. Static mockups? REFUTED — each factory_runs/req_*/ has core.mjs + index.html + tests/*.selftest.mjs + manifest.json + package.json; index.html imports real functions from ./core.mjs.
2. Weak tests? REFUTED — selftests assert real state transitions (net===70, reject non-numeric, clear→0); re-ran all 4 ALL GREEN (5/5/5/6).
3. Stale/fake screenshots? REFUTED — 9 real PNGs, non-trivial (36–240KB), before≠after md5 per app.
4. Wrong app/hardcoded preview? REFUTED — each manifest.preview_url contains its OWN request_id.
5. Unsupported gets green? REFUTED — unsupported-held 14/14 (emails/calendar/deploy → UNSUPPORTED/HELD).
6. Hash mismatch/missing manifest? REFUTED — false-green regression 11/11; request_id === 'req_'+request_hash.
7. Builder self-certified? REFUTED — every manifest checker_verdict = PENDING; BUILDER_REPORT does not claim CLEAN.
8. Visible browser not used? REFUTED — 5 .webm videos (one 844KB headed capture); before/after screenshots differ.
9. No real files? REFUTED — 24 files under factory_runs; 6 per folder.
10. Local-only breached? REFUTED — no fetch/http/websocket/provider in generated apps.
factory.selftest 18/18. No source mutated by Checker.

Limits (not defects): (a) protected remote origin/main == 65fd01669f80 unchanged; local `main` pointer sits at
a pre-existing merge commit (ba7d654) that the Checker was NOT asked to move and did NOT move — neither was
mutated. (b) demo/founder_operating_environment/{app.mjs,index.html} were additively edited (+39/-0) to wire the
Factory Proof panel — this is WITHIN the run's allowed paths (Lane E). (c) PR #200 untouched.

**CHECKER_VERDICT: CLEAN_WITH_LIMITS**
