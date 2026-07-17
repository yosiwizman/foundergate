# Founder Safety Check — UI Truth Contract (Phase 7.1, Lane A)

Corrects the Phase-7 truth-gap (button read a file). The new UI (`src/safety_check/service.mjs` + `src/founder_url_drop/ui/safety.{html,css,js}`) obeys:

1. Initial screen has **no completed result** (neutral card only; `/api/state` returns `NEUTRAL`; nothing is fetched as green on load).
2. Results remain hidden until: the fixed fixture is selected → a **new run** is started (POST /api/check spawns a real job) → that run reaches evidence-backed **COMPLETE**.
3. The selected repository is always visible beside the result (run card + result card show repository + run ID).
4. Shows repository owner/name, exact run ID, run date/time, short commit, "Exact version locked." Full hashes live in the Evidence drawer.
5. Founder language replaces raw technical values on the main cards: "Internal ports were not publicly exposed." / "The check had no access to Docker controls." / "Internet access was blocked during the check." Raw values (GUARD_PASS / SOCKET_ABSENT / default-deny) remain in the Evidence drawer + Evidence Pack.
6. Shows Compileability observed + Build/Tests/Security/Production **not proven**. Never a generic PASS. Never another URL's evidence (state is per-run-id).
7. General public repos → HELD; SSH/private → REFUSED; missing → UNKNOWN; old → STALE.
8. Teardown pending must not display "Temporary sandbox removed" (gated on the destroy stage). Evidence Pack unavailable → UNKNOWN, not a fake download.
