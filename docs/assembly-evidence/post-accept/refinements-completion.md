# Post-acceptance refinements — completion report (VBDAG + M1 + M2)

**Bundle:** post-acceptance queue refinements (docs-only VBDAG + two wide-safe UI refinements). **Authority:**
`docs/lanes/POST-ACCEPTANCE-QUEUE.md` @ `e2af468` (the queued items, resolving on disk — Written-Authority Law §28).

## Disk-proof completion table (with AUTHORITY column)
| Lane | What landed | Evidence (file) | Authority (path @ SHA) |
|---|---|---|---|
| VBDAG | V8-B contract: named `VB0` Attached Projects Registry (persistent attach) as an explicit DAG substep + `G1-B-VB0` gate; spine updated; **banner promoted DRAFT → LIVE · V8-A ACCEPTED 2026-07-11** (every `G1-B-*` gate still UNFIRED, Law 69) | `docs/lanes/V8-B-build-contract.md` | `docs/lanes/POST-ACCEPTANCE-QUEUE.md` @ `e2af468` |
| M1 | Dashboard held-state wording "stuck" to **"On Hold"** (STATUS chip + summary word); friendly-copy + honesty guards green | `src/v8a1/dashboard/view-model.mjs` + `home-model.selftest.mjs` | `docs/assembly-evidence/VA/stranger-test-run-7.md` @ `e2af468` |
| M2 | File Cabinet: **SECRET gets its own calm teal hue** (`--secret`); UNKNOWN keeps purple (`--lock`); red still reserved; badge-visibility guard updated | `src/ui/tokens.css` + `src/v8a3/filecabinet/ui/filecabinet.js` + `filecabinet.css` + `badge-visibility.selftest.mjs` | `docs/assembly-evidence/VA/stranger-test-run-7.md` @ `e2af468` |

## Visual Self-Review (Law §23)
True 1366×768 + 1440×900; before/after full-page stills in `docs/assembly-evidence/visual-review/before-m1m2/` vs
the regenerated `dashboard-*-full.png` / `filecabinet-*-full.png`; per-screen verdict in `VISUAL_REVIEW.md`
(addendum): both **match intent — yes**, no red for routine states.

## Verification
Suite 50/50 green; evidence-integrity (incl. §28 authority check) green; badge-visibility + home-model +
friendly-copy guards green. The bundle's own merge PR + SHA are stamped into the Evidence Ledger row after this PR
merges (living-ledger maintenance), with the same AUTHORITY.
