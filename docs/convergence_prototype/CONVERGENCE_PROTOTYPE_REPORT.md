# Convergence Prototype — Report

## Objective (founder-authorized)
Wire the **live-local evidence runner** into the **deck-style Founder operating environment** as a
**local-only convergence prototype**: no merge, no PR-ready marking, no PR #200 mutation, no
deployment, no billing, no customer/private/production data, no provider spend, no outreach, no
commercial claims.

## What was built
- `demo/founder_operating_environment/index.html` — deck-style dark Truth Dashboard shell
  (sidebar + chips + two big buttons), honest environment banner, technical/reviewer disclosure.
- `demo/founder_operating_environment/assets/fg.css` — a **byte-identical, unmodified copy of the
  deck's** `fg.css` visual language (reuse, not a new style).
- The only visual delta is a small **inline** contrast override in `index.html` (`<style>`, not in
  fg.css) for WCAG AA: the white-on-blue active nav + primary button are darkened `#3b82f6` →
  `#1d4ed8`. Keeping it inline preserves fg.css as a pure, unmodified reuse.
- `demo/founder_operating_environment/assets/app.mjs` — **real** wiring to the loopback backend:
  `GET /api/session` (per-process token), `POST /api/start`, `POST /api/export`. No provider,
  no external network, no fabricated state.
- `tests/e2e-dashboard/convergence-capture.mjs` — headless-chromium E2E proving the deck-style
  surface runs the real backend and stays honest.

## Convergence, not fork
The prototype does not introduce a new visual style and does not become a separate product. It
takes the **deck visual language** (canonical UX direction) and attaches the **real local
backend behavior** (previously only in Founder Mode). One surface — that is the convergence.

## Honesty properties (all machine-checked by the E2E)
- Deck shell grid + dark background `rgb(13,17,23)` present.
- Live run yields real tests result and a decision that is **never "ship"**.
- Evidence freshness shows **FRESH** only after a real run; **UNKNOWN** otherwise (never guessed).
- Export button is **disabled until** a real run has produced a real commit.
- Real export path returns **SEALED_EXPORT_LOCAL** (a real sealed+verified ZIP), not a mock.
- No full 40-hex SHA and no raw-log markers leak into the founder-facing body.
- Honest banner is present: "NOT the deck's shipped state · NOT production · Decision never ship".
- axe-core: **0 serious/critical** violations.

## Result
`CONVERGENCE_PROTOTYPE_READY_WITH_LIMITS` — 15/15 E2E checks green; deck-style UI on the real
local backend; no overclaim; local-only.
