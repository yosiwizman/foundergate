# V8-A3 Acceptance Packet — File Cabinet

> **Plain English — read this first.**
>
> 1. **What this is.** The acceptance record for V8-A3 (File Cabinet). It links every piece of evidence and checks
>    it against the V8-A3 build contract (`docs/lanes/V8-A3-lane-packet.md`).
> 2. **Why it matters.** This is what gate **G2-A3** (UI witness) asks you to look at — a safe file viewer where
>    secrets stay hidden.
> 3. **What can go wrong.** A viewer that leaks a secret. An independent adversarial checker tried exactly that
>    and found (then we fixed) two real leaks; a committed no-secret-leak proof now guards against it forever.
> 4. **What you can test now.** `npm test` → 31/31 green. Open the screenshots, or run
>    `node src/v8a3/filecabinet/server.mjs` and click around.
> 5. **Status.** ✅ **G2-A3 PASSED (2026-07-10) — V8-A3 CLOSED.** Raw-verified close recorded below.

## Build record

| Phase | PR | Merge SHA | Notes |
|-------|----|-----------|-------|
| A3-FC-CLASS — classification+access | #31 | `b549716` | **Independent checker round-2 PASS** (2 HIGH leaks found & fixed) |
| A3-FC-UI + AC (this) | #32 | `e92f8b9` | browse/badges/preview + acceptance; exact-SHA CI success |

Gate: **G1-A3-IMPL APPROVED** (see `../FOUNDER_GATE_LEDGER.md`).

## Acceptance criteria (contract ↔ evidence)

| Criterion (lane packet §4.8) | Status | Evidence |
|------------------------------|--------|----------|
| **Data-class badge on EVERY file** | ✅ | `tree.selftest` (6) · smoke asserts badges==rows · screenshot 01 |
| **SECRET files hidden** (never preview/copy/download) | ✅ | `no-secret-leak.selftest` (9) · `server.selftest` (4) · screenshot 02 |
| **Unknown files BLOCKED until classified** (Law 54) | ✅ | `cannot-invent-state.selftest` (5) · screenshot 03 |
| Preview/copy/download **only for allowed classes** | ✅ | `classify.selftest` (11) · server enforces via cabinet |
| Files grouped by **plain-English categories**; **expand/collapse** | ✅ | UI groups by §4.8 category, collapsible headers · screenshot 01 |
| **Preview safe files** | ✅ | screenshot 04 (founder doc preview) · `server.selftest` |
| **Copy allowed text / download allowed files** (gated) | ✅ | UI copy/download buttons shown only when the class allows |
| **No edit/delete**, no Open-in-GitHub, no Project-Guide answers | ✅ | none present in the UI/API (read-only) |
| **No live/provider/send/payment path** | ✅ | read-only viewer; loopback server; no outbound API |
| **Committed no-secret-leak proof** | ✅ | `src/v8a3/filecabinet/no-secret-leak.selftest.mjs` (runs in CI) |
| **Exact-SHA CI green** on the final commit | ✅ | final `e92f8b9` · CI success (https://github.com/yosiwizman/foundergate/actions/runs/29097063338) |

## Independent checker (sensitivity ruling)
`../A3-FC/checker-report.md` (round 1 — verdict FAIL, two confirmed HIGH content-leaks: a broken `**` glob left
nested secrets viewable; a `README.md→.env` symlink leaked a live token) + `../A3-FC/checker-report-round2.md`
(round 2 — **PASS, all closed, no new holes**). Each finding is locked by a test.

## No-secret-leak proof (required artifact)
`src/v8a3/filecabinet/no-secret-leak.selftest.mjs` (PASS, 9 checks): real secret/private-key/production/unknown
files, and safe-named symlinks pointing at secrets or out of the project, are all blocked with no content leak;
a safe file is viewable; project rules can only escalate to SECRET.

## Screenshots
- File Cabinet: `../A3-FC-UI/screenshots/{01-tree-with-badges,02-secret-hidden,03-unknown-blocked,04-preview-safe}.png`

## Honest posture
V8-A3 is a **read-only, classified viewer**. It does not edit/delete, does not open GitHub, does not answer
questions about files (Project Guide is V8-A4), and has **no live path**. Some harness files classify UNKNOWN and
are honestly shown blocked (fail-safe: blocked until classified). Full suite: **ALL GREEN — 31/31**. Green CI is
not product proof — that is why G2-A3 is a founder UI witness.

## V8-A3 CLOSE — raw-verified (G2-A3 PASSED)

**G2-A3 UI witness: PASSED (2026-07-10).** Witnessed at product-final `e92f8b9` via a live loopback server on 127.0.0.1:4400 — data-class badge on every file, plain-English categories, safe doc previewed (Copy/Download only), SECRET stayed hidden with no contents, UNKNOWN blocked, expand/collapse works, and no edit/delete/GitHub/approve affordances anywhere. Recorded in `../FOUNDER_GATE_LEDGER.md`.

**Dual-pin (two independent anchors on the same artifact):**
- **Product-final commit:** `e92f8b9` (`e92f8b9c0df81950adb2dc9a99491674cfd4bc20`).
- **Exact-SHA CI:** selftests run **29097063338**, `conclusion: success`, `headSha e92f8b9…` — raw capture `verification/gh-run-29097063338.json`.

**Raw verification captures (`verification/`):** `gh-run-29097063338.json` (green CI bound to the exact SHA) · `gh-pr-31.json` + `gh-pr-32.json` (the merges that produced `e92f8b9`) · `gh-repo-view.json` (repo still PRIVATE) · `post-product-diff-stat.txt` (every post-product-final commit touches only docs + wide-safe tooling; **`src/v8a3` product frozen at `e92f8b9`**) · `npm-test.txt` (full suite **ALL GREEN 31/31**).

**Independent Terminal Advisor disk audit:** `advisor-audit-report.md` — **all six items PASS**; the one exec-limited UNKNOWN (could not run CI from the read-only seat) is satisfied by exact-SHA CI run 29097063338 at `e92f8b9`. Audit prompt: `advisor-audit-prompt.md`.

## One next action (founder, at G2-A3)
Witness the File Cabinet: confirm every file has a badge, secrets show hidden, unknown files show blocked, and a
safe document previews. Record the G2-A3 result in the Founder Gate Ledger.
