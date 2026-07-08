# Independent Checker Report — Preview Bay process-control (A2-PA)

> **Plain English.** Per the sensitivity ruling, an independent adversarial checker reviewed the
> semi-sensitive process-control code before merge. It PASSED the core safety guarantees but found three real
> defects; all were fixed in-scope (Harmless Repair Loop) and each is now locked by an automated test.

## Round 1 — verdict: PASS-WITH-NOTES

**Core guarantees CONFIRMED:** allowlist-only spawn (no config value reaches a command/shell); no
live/provider/send/payment path; fixed, shell-free HTTP action set; loopback-only preview server; honest failure
objects.

**Findings (all fixed):**

| # | Finding (severity) | Fix | Locked by test |
|---|--------------------|-----|----------------|
| A | **HIGH** — control server bound all interfaces, unauthenticated | `server.mjs` now `listen(PORT, "127.0.0.1", …)` | `no-live-path.selftest`: "control server binds loopback only" |
| #5 | Startup-timeout leaked the child process | `onFail` now `child.kill("SIGTERM")` before rejecting | `no-live-path.selftest`: "start failure kills the child" |
| #6 | Stale "running" state if the preview crashed/exited | `child.on("exit")` nulls `this.child` + clears run_state | `preview-controller.selftest`: "unexpected child exit clears running state" |
| B | LOW — `decodeURIComponent` could throw (loopback DoS) | wrapped in try/catch → 400 | (server hardening) |
| C | LOW — symlink inside app_dir could escape | added `realpathSync` containment check | (server hardening) |
| D | INFO — `writeRunState` could write a state it judged invalid | rewritten to build a clean, schema-valid object; throws on invalid | (controller hardening) |
| E | INFO — concurrent `start()` race | added `this.starting` guard | (controller hardening) |

## Round 2 — re-check of the fixes

See `checker-report-round2.md` (the same independent checker re-reviewed the diff).

## Evidence
- Full round-1 report text: preserved in this repo's PR history and summarized above.
- All PA self-tests green after fixes: `V8A2-PREVIEW-CONTROLLER-SELFTEST: PASS (10)`,
  `V8A2-NO-LIVE-PATH-PROOF: PASS (7)`, `V8A2-SERVER-SELFTEST: PASS (4)`, `V8A2-PREVIEW-SCHEMA-SELFTEST: PASS (4)`.
