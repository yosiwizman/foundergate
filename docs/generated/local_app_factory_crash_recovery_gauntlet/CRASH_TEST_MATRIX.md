# Crash Test Matrix
| Test | Result |
| --- | --- |
| crash-fixtures.selftest.mjs (verifies results + re-classifies persistent HOLDs live) | 14/14 |
| false-green-hostile.mjs (Lane G, 11 hostile properties) | 10/10 |
| unsupported/held reconfirmation | 16/16 |
| factory-crash-visible-proof.mjs (HEADED, visible) | 5/5 |
| wave11-safety-check (a11y incl. new panel) | 14/14 |
| factory-round2-visible-proof (Round 2 non-corruption regression) | 10/10 |
Proven: missing/corrupted manifest HOLD; hash mismatch HOLD; wrong preview HOLD; failing test HOLD; missing index HOLD; stale Round1/Round2 HOLD; unsafe HOLD; server-unavailable HOLD/recovers; partial HOLD/recovers; post-checker mutation HOLD; recovered fixtures retested before PASS; unrecoverable never PASS.
