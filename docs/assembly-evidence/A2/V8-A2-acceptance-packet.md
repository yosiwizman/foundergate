# V8-A2 Acceptance Packet — Preview Bay + Bug Collector

> **Plain English — read this first.**
>
> 1. **What this is.** The acceptance record for V8-A2. It links every piece of evidence and checks it against the
>    V8-A2 build contract (`docs/lanes/V8-A2-lane-packet.md`).
> 2. **Why it matters.** This is what gate **G2-A2** (UI witness) asks you to look at. You witness the Preview Bay
>    and Bug Collector working, from evidence.
> 3. **What can go wrong.** A preview that could reach the real world, or a bug tool that quietly fixes things.
>    Both are forbidden and proven-absent here (no-live-path proof; capture-only).
> 4. **What you can test now.** `npm test` → 25/25 green. Open the screenshots, or run
>    `node src/v8a2/server.mjs` and click around.
> 5. **One next action.** At G2-A2, witness the screens and record the result.

## Build record

| Phase | PR | Merge SHA | Notes |
|-------|----|-----------|-------|
| A2-PA — Preview Bay (PA1–PA7) | #24 | `89c7c86` | **Independent checker: round-2 PASS** (7 findings fixed) |
| A2-BC — Bug Collector (BC1–BC6) | #25 | `270719d` | wide-safe; capture-only |
| A2-AC — acceptance (this) | this PR | `A2FINALSHA` | exact-SHA CI on merge |

Gate: **G1-A2 APPROVED** (see `../FOUNDER_GATE_LEDGER.md`).

## Acceptance criteria (contract ↔ evidence)

| Criterion (lane packet) | Status | Evidence |
|-------------------------|--------|----------|
| Preview starts/stops/restarts/refreshes a **local** preview | ✅ | `preview-controller.selftest` (10) · `server.selftest` (4) · screenshot 02 |
| **All required labels always shown** | ✅ | preview-running screenshot (env/data/sends/payments/build/release/data-class/proof) |
| **No-Naked-Localhost** (no ports/URLs/logs founder-facing) | ✅ | UI shows an embedded app, not a URL; loopback server internal |
| **§4.5.1 isolation proven** (untrusted app sandboxed) | ✅ | sandboxed cross-origin loopback `<iframe sandbox>` (no `allow-same-origin`); preview server binds `127.0.0.1` |
| **Preview control is not live action** — no live/provider/send/payment path | ✅ | **`no-live-path.selftest` (7)** — static scan + allowlist + no-live guard + loopback control server |
| **Preview-failure (C7)** — plain-English error + next action, never blank/fake | ✅ | `describeFailure` test · screenshot 03 (live refused) |
| **Approve/Reject/Defer view-only or absent** | ✅ | not present in the Preview Bay UI (no approve affordance) |
| **Cannot-invent-state** for new surfaces | ✅ | `cannot-invent-state.selftest` (5) — missing config → stopped/UNKNOWN, never fake running/live |
| Report Problem → screenshot+context → **data-classified packet** in `.foundergate/bugs` | ✅ | `bug-collector.selftest` (6) · smoke stores a packet · screenshot 02 (BC) |
| Bug Collector **captures only** (no triage/fix/resolved) | ✅ | `bug-collector.selftest` asserts no triage/lane/fix/worker/resolved field |
| Founder Hand-Burden: report needs **no terminal, no typed prose required** | ✅ | Report Problem is a UI button + optional note/voice; no terminal |
| **Exact-SHA CI green** on the final commit | ✅ | `A2FINALSHA` · `A2FINALCI` (stamped on merge) |

## Independent checker (sensitivity ruling)
`../A2-PA/checker-report.md` (round 1 — 7 findings) + `../A2-PA/checker-report-round2.md` (round 2 — **PASS, all
closed**). The semi-sensitive process-control surface was built by one builder and adversarially reviewed by one
independent checker before merge; each finding is locked by a test.

## No-live-path proof (required artifact)
`src/v8a2/preview/no-live-path.selftest.mjs` (PASS, 7 checks): the preview subsystem imports no outbound/provider/
send/payment API; the only allowlisted target is the safe repo-local static server; the no-live guard refuses live
environment / non-off sends / live payments; the control server binds loopback; start-failure kills the child.

## Screenshots
- Preview Bay: `../A2-PA/screenshots/{01-preview-idle,02-preview-running,03-preview-failure-nolive}.png`
- Bug Collector: `../A2-BC/screenshots/{01-report-form,02-bug-captured}.png`

## Honest posture
V8-A2 is a **read/preview + evidence-capture** stage. It does not wire gate approvals, does not fix bugs, does not
reset data or record witnesses, and has **no live/provider/send/payment path**. Green CI is not product proof —
that is why G2-A2 is a founder UI witness. Full suite: **ALL GREEN — 25/25**.

## One next action (founder, at G2-A2)
Witness the Preview Bay (start/stop, labels, failure) and the Bug Collector (Report Problem → saved evidence).
Record the G2-A2 result in the Founder Gate Ledger.
