# Independent Checker Report — Round 2 (fix verification)

> **Plain English.** The same independent checker re-reviewed the fixes for all seven round-1 findings and tried
> to break them again. Verdict: **PASS — all closed, no regressions.**

## Overall verdict: PASS

| Finding | Result | Why it holds |
|---------|--------|--------------|
| A — control API on 0.0.0.0 | **CLOSED** | `server.mjs` direct-run binds `127.0.0.1`; process-control API is loopback-only. |
| #5 — timeout leaked child | **CLOSED** | `onFail` kills the child before rejecting; every pre-ready failure routes through it; success clears the timer. |
| #6 — stale "running" | **CLOSED** | `child.on("exit")` (identity-guarded) nulls the child + writes idle; `status()` reports "stopped" after a crash/kill. |
| B — decodeURIComponent crash | **CLOSED** | wrapped in try/catch → 400. |
| C — symlink escape | **CLOSED** | `realpathSync` containment; response reads the canonicalized path; escape → 403. |
| D — invalid run_state write | **CLOSED** | builds a clean minimal object and throws on invalid instead of writing (both mode values proven schema-valid). |
| E — concurrent start race | **CLOSED** | synchronous `this.starting` guard set before the first await; a second start throws "already starting". |

**New issues introduced by the fixes:** none exploitable. One non-blocking latent-fragility note (the success-path
`writeRunState` was not wrapped in try/catch). **Applied anyway** as defense-in-depth: it is now wrapped and a
write failure is routed through `onFail` (reaps the child), matching the exit-handler style.

## Founder-plain summary (from the checker)
All seven issues from the first review are properly fixed and could not be broken again — the control panel is
locked to your own machine, half-started or crashed previews are cleaned up and honestly reported as stopped, and
file-serving is hardened. **Safe to merge.**
