# Independent Adversarial Check — D3 Component Classification Doctrine (keystone)

**Branch:** `lane3-component-classification` · **Base main:** `e1cee56`. Checker ≠ author; read-only.

## Round 1 (HEAD `6e4d434`) — NOT-CLEAN
§1 DRAFT/docs-only PASS; §2 definitions sound (litmus non-circular) PASS; §3 four-step oracle-anchored control coherent + matches repo reality PASS; §5 side-effect-certification PASS; §6 self-referential integrity PASS. All enumerated paths resolve + are genuinely evaluation-class (accuracy PASS).
**FINDING (§4, major — completeness gap):** the closed claim "these are the components that decide/gate/attest/measure truth today" omitted many merge-gating truth-deciding components (checker subsystem validate/prepush/score/swarm, shwl/guard.mjs, held-actions/hold-action.mjs, v8b2/no-act-edge, v8a1/schema-first-gate.mjs, adapter/registry validators, fixture-write-safety, critical-path-gate, cage/escape-harness + evidence ledger, product-boundary proof guards). VERDICT: NOT-CLEAN.

## Round 2 (HEAD `fa9c986`) — CLEAN
(a) §4 opening rewritten to the AUTHORITATIVE mechanical criterion (evaluation-class = every `*.selftest.mjs` run by the `selftests` CI gate + the modules they guard; enumeration explicitly illustrative, not a closed set; unnamed truth-deciding CI-gated components still governed, §4 amended per §3 to name them). Old closed claim removed. (b) All previously-omitted components now enumerated + grouped, descriptions accurate. (c) All spot-checked paths resolve at `fa9c986` (`git cat-file -e`). (d) Still DRAFT/docs-only; all round-1 PASSes hold. Completeness gap fully resolved.

## FINAL VERDICT (round 2): CLEAN
