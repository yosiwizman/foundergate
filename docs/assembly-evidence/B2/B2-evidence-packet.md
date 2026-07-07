# B2 Evidence Packet — Truth Dashboard V8-A1 UI (phase of parent bundle B12)

> **Plain English.** This phase built the dashboard the founder actually looks at. Every card reads from the real
> `.foundergate` files through the proven reader; where a file is missing it shows **UNKNOWN**, never a made-up
> green. The screenshots below are the robot (Playwright) proof that each screen renders and the Panic button
> works. This is a read-only status viewer — **not product proof**.

## Substeps A11–A24

| Substep | What was built | Where | Proof |
|---------|----------------|-------|-------|
| A11 | Truth Dashboard shell | `src/v8a1/dashboard/index.html` · `styles.css` | screenshot 01 |
| A12 | Projects screen | `index.html#projects-screen` · `app.js` | screenshot 01 (Projects card) |
| A13 | Project Dashboard (8 questions in order, Law 44) | `app.js` · `view-model.mjs` | `view-model.selftest` — order asserted |
| A14 | Status / current-state card (file-traceable) | `#status-card` | screenshot 01 (State/CI/PR) |
| A15 | View-only gate/blocker display (Law 55) | `#gates-card` | `view-model.selftest` — `approvable:false` |
| A16 | CI UNKNOWN / PR UNKNOWN + evidence STALE (Law 54/68) | `view-model.mjs` badges | screenshot 03 (all UNKNOWN) |
| A17 | "What founder should do now" card (file-sourced) | `#needs-you` | `view-model.selftest` — source = status.json |
| A18 | "What must not be touched" card | `#do-not-touch` | screenshot 01 (2 locked paths) |
| A19 | Permanent Failure-Modes Reminder (all 10 lines) | `#failure-modes` | `view-model.selftest` — 10 lines verbatim |
| A20 | Basic Doctor panel (version/health only) | `#doctor-card` | screenshot 01 (10/10) · 03 (0/10 MISSING) |
| A21 | Honest-scope Panic Card (says what it did NOT stop) | `#panic-card` | screenshot 02 (panic pressed) |
| A22 | Data classification badges (secret hide, unknown block) | `#dataclass-card` | screenshot 01 (MOCK_ONLY) |
| A23 | Cost guard display (policy/config only, labeled) | `#cost-card` | `view-model.selftest` — "runtime enforcement begins V8-B" |
| A24 | Playwright smoke screenshots for every screen | `src/v8a1/dashboard/smoke.mjs` | `screenshots/*.png` (3) |

## Self-test (this repo, standalone; runs in CI)

```
V8A1-VIEW-MODEL-SELFTEST: PASS (11 checks)
```
Plus the B1 cannot-invent-state and schema-first gates. Full suite via `npm test`: **ALL GREEN — 19/19**.
The UI render logic is proven in Node (the SAME pure `view-model.mjs` the browser uses), so CI proves exactly
what the founder sees, with no browser required in CI.

## Playwright smoke screenshots (A24) — `screenshots/`

| File | What it proves |
|------|----------------|
| `01-truth-dashboard.png` | The full dashboard on the MOCK_ONLY fixture — all V8-A1 screens/cards, 8 questions in order, view-only gate, FRESH/STALE evidence, Doctor 10/10, honest cost label, all 10 failure-mode lines. |
| `02-pause-pressed.png` | Primary action: the Pause button pressed reveals its **honest scope** — it says it stops nothing running (no tracked processes; full worker-kill/recovery arrive V8-B/V8-D). |
| `03-not-connected-unknown.png` | **Cannot-invent-state (Law 54)**: a disconnected project renders every field UNKNOWN / NOT CONNECTED, Doctor 0/10 MISSING, evidence UNKNOWN — nothing green is ever fabricated. |

> Screenshots are generated locally via `smoke.mjs`. The committed script carries **no machine-specific path**
> (Playwright is resolved from an env-provided `node_modules`), so nothing personal lands in the repo.

## Machine gate + CI at exact SHA

- Machine-capacity preflight: `docs/assembly-evidence/B2/machine-capacity-profile.json`
- PR: `#17` · exact merge SHA: `d2ad41503caa2b9044ca30a69f4aa9a41a6940d2` · CI: https://github.com/yosiwizman/foundergate/actions/runs/28891028148 (stamped on merge)

## Scope honesty (what B2 did NOT do)

No wired gate approvals (gates are `view_only`). No runtime cost enforcement (display only). No Panic overclaim
(it states what it does not stop). No Preview Bay, Bug Collector, File Cabinet, Notes, Activity, Run Launcher,
Bench, or Project Guide. No real project data — only the MOCK_ONLY fixture. No write into any attached repo.

---

## UX Repair (post-G2 attempt #1) — layout/copy/styling of A11–A24 only

G2 witness attempt #1 failed visual review (`bugs/g2-attempt-1.md`). This lane rebuilt the *presentation* of the
existing A11–A24 capabilities — **no new capability** — and turned each founder-caught defect into an automated
anti-repeat check.

| Founder defect | Fix | Anti-repeat guard (permanent) |
|----------------|-----|-------------------------------|
| 1. Long scroll wall | App-shell + compact card grid; Q1–4 + status above the fold at 1366×768 | Playwright asserts Q1–4 + `#status-card` within 768px; scroll-depth budget recorded to `hand-burden.json` (1264px ≤ 1500) |
| 2. Developer-scary tone | Friendly-human copy pass on all visible text; UNKNOWN/STALE stay verbatim (Law 54), explained gently ("we can't see this yet") | `view-model.selftest` friendly-copy lint: no `panic`/`fatal`/`abort` in any visible string; Playwright scans on-screen text too |
| 3. Red glowing "Panic" button | Small, calm, always-visible **"Pause & get help"** (same function; honest scope: "Nothing was running, so nothing needed stopping. Your evidence is safe.") | `view-model.selftest` asserts calm name + honest scope; Playwright bounds the control size (192×34 ≤ 220×44) |
| 4. Wanted app-shell layout | Left sidebar (brand; Dashboard/My Project/Settings active; Data [V8-B], Usage [V8-B], Statistics [V8-C], Team [V8-C], Notifications [V8-B], Project Guide [V8-A4] **disabled with stage labels**), warm welcome header using the founder's name from project config, compact grid | `view-model.selftest` + Playwright assert disabled nav items carry stage labels; greeting uses `project.founder_name` (absent → generic, no invented name) |

Schemas/docs keep the internal **Panic Card** name unchanged; only visible UI copy changed. One project only (single
card, no multi-project chips). Forbidden scope untouched (no Project Guide functionality, no Run Launcher, no Bug
Collector, no wired approvals, no new engine).

### Refreshed evidence
- `view-model.selftest` now **13 checks** (adds the 4 anti-repeat guards). Full suite `npm test`: **19/19 GREEN**.
- `hand-burden.json` — measured: terminal_copy_paste_count 0, clicks_to_pause 1 (always visible), Q1–4 + status
  above the fold = true, scroll height 1264px (within budget), pause control 192×34, disabled-nav stage labels.
- Screenshots regenerated: `01-truth-dashboard.png`, `01b-above-the-fold-1366x768.png`, `02-pause-pressed.png`,
  `03-not-connected-unknown.png`.
