# CTO Queue — dedicated surface (wide-safe lane)

**Lane:** `lane/w2-cto-queue-surface` · **Job:** `w2-1-cto-queue` (Wave-2, `wide_safe`) · **Founder gate:** none.

**Plain English — what this is:** the CTO queue already had a data model and a small read-only
view fragment. What the founder still lacked (per the V8-B completion matrix: CTO queue = *PARTIAL*,
missing "dedicated CTO queue surface" + "live queue UI evidence") was **one founder-readable page
that shows the whole queue at a glance** — a plain-English summary on top of the routed-item list.
This lane adds that surface and the evidence that it renders.

**Why it matters:** the founder can now see, in one place, how many routed items are waiting,
blocked, done, or of unknown status — without reading raw data or trusting a claim. The page is the
proof: open it and look.

**What can go wrong (and how this guards against it):**
- *An act edge sneaks in* → the surface is pure and read-only; its self-test scans the module source
  for `fs`/`net`/`child_process`/`fetch`/`spawn`/etc. and the rendered page for `<script>`/`<form>`/
  `<button>`/`on*=`/`href` — there is nothing an interaction can ride. The approve/run edge stays VB3.
- *Protected content leaks into a summary* → the digest tallies protected (SECRET/blocked-class) items
  as a count only and never summarises their content; redaction flows through the full page too.
- *Invented state* → every status bucket is present and zero-filled (an absent status reads as `0`,
  never omitted); an out-of-enum status is counted as `UNKNOWN`, never guessed (Law 54).
- *Non-reproducible evidence* → rendering is deterministic (no clock, no randomness): same queue in,
  byte-identical page out.

**What you (the founder) can test right now:**
1. `node src/v8b2/cto-queue-surface.selftest.mjs` — 13 checks, all green.
2. `npm test` at the repo root — the whole suite stays green with the surface added.
3. Open [`cto-queue-surface.html`](cto-queue-surface.html) in a browser — the live queue UI evidence,
   rendered from a fixed sample queue by [`render-evidence.mjs`](render-evidence.mjs).

**One next action:** the surface reads the queue only. Wiring an *act* edge (approve / run a queued
item) is out of scope here and remains frozen to VB3 (Gate/Witness Engine) behind a founder gate.

## Files in this lane
| File | What it is |
|------|------------|
| `src/v8b2/cto-queue-surface.mjs` | Pure, read-only surface: `queueDigest`, `renderDigest{Text,Html}`, `renderSurface{Html,Text}`. No io, no act edge. |
| `src/v8b2/cto-queue-surface.selftest.mjs` | 13-check proof: digest honesty + purity, complete page, no act affordance, redaction, determinism, source/export act-edge scans. |
| `docs/assembly-evidence/vb2-cto-surface/render-evidence.mjs` | Deterministic evidence generator (kept out of `src/` so the production module carries no io surface). |
| `docs/assembly-evidence/vb2-cto-surface/cto-queue-surface.html` | The rendered live queue UI evidence artifact. |

## Scope discipline
Adds only a new read-only surface module + its self-test + evidence. Does **not** touch the frozen VB2
scaffold files (`cto-queue.mjs`, `queue-view.mjs`, `schemas/cto_queue.schema.json`), changes no schema,
and adds no act/approve/execute path. It composes the frozen data-model and view APIs read-only.
This lane commits locally only; it does not push or merge (Terminal-0 owns merges).
