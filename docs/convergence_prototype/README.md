# FounderGate — Local Convergence Prototype (deck-style UI on the live-local backend)

**What this is:** the deck/dark **Founder operating environment** visual language (the canonical
FounderGate product UX direction, which has human usability proof) wired to the **real
loopback evidence runner** (`127.0.0.1` `/api/session` · `/api/start` · `/api/export`).

**What this is NOT:**
- NOT the deck's shipped state — the deck design lanes remain **display-only / mock** today.
- NOT a third/new UI — it **reuses** the deck's `fg.css` visual language (convergence, not a fork).
- NOT production, NOT SaaS, NOT secure, NOT customer-ready, NOT market-validated.
- The decision surface **never returns "ship"** — internal demo ceiling only.

**Why it exists:** the founder direction is to *converge* the proven live-local backend behavior
(currently demonstrated in Founder Mode) into the proven deck-style operating environment — one
product line, not two. This prototype is the first local proof that the two can be one surface.

Local run entry: `src/operator_console/run-server.mjs` serves
`demo/founder_operating_environment/index.html` on `127.0.0.1` only.
