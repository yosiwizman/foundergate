# Non-Developer Operator Dashboard — Gap Map
Goal: a non-developer founder runs FounderGate gate-to-gate without a terminal, raw logs, SHAs, or prompt relay.

| Capability | Needed | Today | Gap |
|-----------|--------|-------|-----|
| Start a run without terminal | button/action | loopback server POST /api/start (token+Origin) exists; not founder-facing UI | wire a plain button to /api/start |
| See status without terminal | plain-English status | partial (review surfaces) | single status line: running/blocked/done |
| See fresh/stale/unknown evidence | freshness badge | guards compute it; not surfaced | badge from final-head/receipt-consistency result |
| See exact commit identity without reading Git | short id + label | in receipts only | show "verified build ####" chip |
| See tests | pass/fail count | in reports | show "30/30 green" chip |
| See Checker result | verdict chip | in reports | surface CLEAN/FINDINGS |
| See Gate Advisor result | verdict chip | in reports | surface READY/HOLD |
| See limitations | plain list | in docs | show "what this is NOT" panel |
| Export ZIP | one action | Terminal-0 seals it | add "Download evidence" action |
| Pause/stop | control | server design allows; no UI | add stop control |
| Avoid raw logs | never show logs in founder mode | logs exist in dev output | mode split (below) |
| Avoid prompt relay | no copy/paste between tools | still Terminal-0 mediated | dashboard-initiated runs |

Priority order: status line → freshness/tests/checker/gate chips → download ZIP → start/stop → full no-terminal loop.
