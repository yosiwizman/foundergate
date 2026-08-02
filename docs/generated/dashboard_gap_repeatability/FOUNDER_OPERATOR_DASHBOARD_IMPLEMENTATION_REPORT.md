# Founder/Operator Dashboard — Implementation Report
New module: src/ui/founder-operator-panel/panel.mjs (pure, deterministic; no I/O/clock/random).
- buildPanel(snapshot) → { ready, statusLine, chips{freshness,tests,checker,gate,beta,buildLabel}, panels{proves,notProves,nextAction,founderGated}, evidenceZip, unknowns[] }.
- Anti-false-green rule: ready=true ONLY when freshness=FRESH AND checker=CLEAN AND gate=READY AND tests all-pass. Any missing/invalid signal → UNKNOWN and listed in unknowns[]; never a fake green.
- renderFounderText: plain English, self-guards against leaking any 40-hex or 64-hex SHA (throws if it would).
- Covers all 14 required founder-mode elements: status line; freshness/tests/checker/gate chips; accepted-beta chip; proves / not-proves / next-action / founder-gated panels; download-evidence action (or honest "unavailable + reason"); no raw logs; short human build label only.
Verified by 14/14 self-tests (src/ui/founder-operator-panel/panel.selftest.mjs) and rendered screens in screenshots/.
