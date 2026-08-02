# Lane A — Wave 2 Architecture Map

Honest classification of each deck-style panel in the converged local prototype.

| # | Panel | Classification | Notes |
| --- | --- | --- | --- |
| 1 | Truth Dashboard | **LIVE_LOCAL now** | real /api/session, /api/start, /api/export |
| 2 | Preview | **LIVE_LOCAL (read-only VIEW of the real run state) — local demo only** | shows the same real run state; local demo only; no sends/payments/deploy. "Read-only view of the live run state" and "local demo only" describe the same panel — it displays real state but performs no live customer/app behavior. |
| 3 | Evidence | **LIVE_LOCAL after this build** | real /api/export → SEALED_EXPORT_LOCAL; plain-English receipt |
| 4 | Decisions | **VIEW_ONLY** | shows current decision + possible internal statuses; buttons disabled; no real action |
| 5 | Ask Guide | **DISPLAY_ONLY** (static text) | no provider, no external calls |
| 6 | Files / Protected Files | **DISPLAY_ONLY** | protected-files concept illustrated with synthetic names; no live enforcement |
| 7 | Founder Mode fallback | **LIVE_LOCAL (separate surface, PLANNED to converge)** | remains a fallback/proof surface; not the product direction |
| 8 | Technical / reviewer view | **LIVE_LOCAL (optional)** | short build id + export path; no raw logs, no full SHA in founder view |

PLANNED (not in this build): wiring Files/Protected Files to real enforcement; wiring Decisions to
a real (still-gated) approval flow. OUT_OF_SCOPE: any production/SaaS/customer/commercial behavior.

No overclaim: only Truth Dashboard, Preview (as a view), Evidence, and the Technical view touch the
real local backend. Everything else is explicitly display-only or view-only.
