# Lane Routing — unified router across ARLC/ARE queues (wide-safe lane)

**Lane:** `lane/w2-cto-queue-surface` · **Job:** `w2-2-lane-routing` (Wave-2, `wide_safe`) · **Founder gate:** none.

**Plain English — what this is:** work reaches FounderGate through two separate queues that
speak different dialects. The **ARLC** lifecycle controller tracks repository / branch / PR / lane
work in states like `READY` / `RUNNING` / `CLOSED` and flags the lanes that need a founder. The
**ARE** run envelope tracks its own lanes in run states like `PLAN_CHECKED` / `TRUE_FOUNDER_GATE` /
`PASS`. Per the V8-B completion matrix, *Lane routing* was **PARTIAL** — missing a "unified router
across ARLC/ARE queues" and "end-to-end routing evidence". This lane adds both: a read-only router
that reconciles both dialects into **one founder-facing destination taxonomy**, and the evidence page
that proves it end-to-end.

**Why it matters:** the founder can now answer one question across everything in flight —
*"what proceeds on the backend on its own, and what actually needs me?"* — from a single page,
without reading raw queue data or trusting a claim. Every lane is routed to exactly one of:
`Backend (Terminal-0)`, `Founder decision`, `Human expert`, `Held (correctable)`, `Blocked`, or `Done`.

**How the routing is decided (and why it's trustworthy):** the router does **not** fork the
authorization law — it **composes the frozen `gate-router` classification** (`classifyGate` /
`GATE_TYPES`). A lane's destination is derived, highest-precedence first, from: an explicit declared
gate type → a native state that already names a gate (`TRUE_FOUNDER_GATE`, `HUMAN_EXPERT_GATE`,
`BLOCKED`) → a terminal/hold state → a requested authority classified by `classifyGate` → a lane's own
`founder_gate_required` flag → a listed routine state (→ backend) → **otherwise UNKNOWN, which fails
CLOSED to the founder.**

**What can go wrong (and how this guards against it):**
- *An unclassifiable lane is silently sent to the backend* → **the safety proof:** an unknown lane
  (no known state, no authority, no flag) routes to `Founder decision`, **never** `Terminal-0`. The
  gate type is said out loud as `UNKNOWN`; it is never guessed (Law 54).
- *The router drifts from the real authorization law* → destinations are derived from the frozen
  `gate-router` `GATE_TYPES`; a self-test asserts **every** frozen gate type resolves to a valid
  destination (no taxonomy gap) and that `classifyGate`'s verdicts flow through unchanged.
- *An act edge sneaks in* → the router is pure and read-only; its self-test scans the module source
  for `fs`/`net`/`child_process`/`fetch`/`spawn`/`Date.now`/etc. and the rendered page for
  `<script>`/`<form>`/`<button>`/`<input>`/`on*=`/`href`. Naming a destination is **not** sending
  there — the approve/run/merge edge stays VB3.
- *Protected content leaks* → a non-displayable (SECRET-class) lane keeps its **structure** (id,
  source, destination — routing is not content) but its human title is redacted; it is still counted
  and still routed, so the founder always sees *where* protected work goes, only not *what* it is.
- *Non-reproducible evidence* → rendering is deterministic (no clock, no randomness): same snapshots
  in, byte-identical page out.

**What you (the founder) can test right now:**
1. `node src/v8b2/lane-router.selftest.mjs` — 22 checks, all green.
2. `npm test` at the repo root — the whole suite stays green with the router added.
3. Open [`lane-router-surface.html`](lane-router-surface.html) in a browser — the end-to-end routing
   evidence, rendered from a fixed ARLC + ARE snapshot pair by [`render-evidence.mjs`](render-evidence.mjs).

**One next action:** the router reads the two queues only. Wiring an *act* edge (actually approving /
running / merging a routed lane) is out of scope here and remains frozen to VB3 (Gate/Witness Engine)
behind a founder gate.

## Files in this lane
| File | What it is |
|------|------------|
| `src/v8b2/lane-router.mjs` | Pure, read-only unified router: `normalizeUnit`, `routeQueues`, `routingDigest`, `renderDigest{Text,Html}`, `renderRouted{Text,Html}`, `renderSurface{Html,Text}`. Composes frozen `gate-router` + `cto-queue` law. No io, no act edge. |
| `src/v8b2/lane-router.selftest.mjs` | 22-check proof: unified counting across both queues, per-destination derivation, the fail-closed safety proof, frozen-taxonomy coverage, redaction pass-through, purity, determinism, source/export act-edge scans. |
| `docs/assembly-evidence/vb2-lane-router/render-evidence.mjs` | Deterministic evidence generator (kept out of `src/` so the production module carries no io surface). |
| `docs/assembly-evidence/vb2-lane-router/lane-router-surface.html` | The rendered end-to-end routing evidence artifact. |

## Scope discipline
Adds only a new read-only router module + its self-test + evidence. Does **not** touch the frozen VB2
scaffold files (`cto-queue.mjs`, `queue-view.mjs`, `cto-queue-surface.mjs`) or the frozen
`gate-router.mjs` — it **imports** them read-only. Changes no schema and adds no act/approve/execute/merge
path. This lane commits locally only; it does not push or merge (Terminal-0 owns merges).
