# Bench v1 — component + project result ledger + founder hand-burden (wide-safe lane)

**Lane:** `lane/w2-cto-queue-surface` · **Job:** `w2-3-bench` (Wave-2, `wide_safe`) · **Founder gate:** none.

**Plain English — what this is:** after a stretch of autonomous work the founder wants **one honest
scoreboard** that answers three questions without opening a terminal — *what was built and did it
actually prove itself here? which of my projects have a recorded result? how much hand-work did all
of this cost me?* Per the V8-B completion matrix this was three overlapping gaps — Bench v1 = **NOT
BUILT** ("component+project result ledger, hand-burden"), Project Bench = **NOT BUILT**, and Founder
Hand-Burden score = **PARTIAL** (missing "live scoring surface", ARE burden metrics only). This lane
adds the read-only Bench surface that closes them, plus the evidence that it renders.

**Why it matters:** the founder can now see, in one place: the **component result ledger** (every
component and whether its self-test is green *in this repository*), the **project result ledger** (a
per-project PASS/FAIL/UNKNOWN result), and the **founder hand-burden score** (the count of unnecessary
founder *technical operations* — clicks, terminal actions, debugging, raw-log reading). The page is
the proof: open it and look.

**The one honesty idea that matters most:** the bench distinguishes **burden from direction**. A
founder *decision* (a prompt, a signature, a standing authorization) is legitimate direction — it is
shown, but it is **not** counted as burden. What the score measures is whether carrying out that
direction cost the founder any hand-work. And a clean score must be *proven*, not assumed: if **any**
burden metric is missing, the score reads `UNKNOWN`, never a flattering "zero hand-burden".

**What can go wrong (and how this guards against it):**
- *An act edge sneaks in* → the bench is pure and read-only; its self-test scans the module source for
  `fs`/`net`/`child_process`/`fetch`/`spawn`/`Date.now`/etc. and the rendered page for `<script>`/
  `<form>`/`<button>`/`<input>`/`on*=`/`href` — nothing an interaction can ride. Approve/run/merge stays VB3.
- *A flattering false "zero burden"* → `hand_ops` is `UNKNOWN` unless every burden field is present; a
  negative/garbage metric is `UNKNOWN`, not a real count; the surface states the unknown out loud and
  never renders it as a clean zero.
- *`UNKNOWN` masquerading as success* → an out-of-enum result is counted as `UNKNOWN`, **never** coerced
  to `PASS`; `unproven` = everything that is not `PASS` (both `FAIL` and `UNKNOWN`). Result buckets are
  zero-filled and always sum to the total — no item is lost (Law 54).
- *Protected content leaks into the scoreboard* → a project whose data class is not displayable has its
  **name redacted** through the frozen cto-queue rule; its **result stays visible** (a result is a fact,
  not private content). Redaction flows through the full page and the text renderer.
- *Non-reproducible evidence* → rendering is deterministic (no clock, no randomness): same snapshot in,
  byte-identical page out.

**What you (the founder) can test right now:**
1. `node src/v8b2/bench.selftest.mjs` — 25 checks, all green.
2. `npm test` at the repo root — the whole suite stays green with the bench added.
3. Open [`bench-surface.html`](bench-surface.html) in a browser — the live bench evidence, rendered
   from a fixed sample snapshot by [`render-evidence.mjs`](render-evidence.mjs). Note the SECRET-class
   project shows its result but **not** its name.

**One next action:** the bench reads results only. It does not *produce* those results — wiring the
bench to read live self-test / project / burden records (and any act edge on top) is out of scope here
and remains frozen to VB3 behind a founder gate.

## Files in this lane
| File | What it is |
|------|------------|
| `src/v8b2/bench.mjs` | Pure, read-only bench: `componentLedger`, `projectLedger`, `burdenDigest`, `benchDigest`, `renderComponentLedger{Text,Html}`, `renderProjectLedger{Text,Html}`, `renderBurden{Text,Html}`, `renderSurface{Html,Text}`. No io, no act edge. |
| `src/v8b2/bench.selftest.mjs` | 25-check proof: ledger honesty (zero-fill, `UNKNOWN` never `PASS`, `checks_proven`), the hand-burden honesty proof (missing metric → `UNKNOWN`, burden≠direction), redaction pass-through, complete page, no act affordance, determinism, source/export act-edge scans. |
| `docs/assembly-evidence/vb2-bench/render-evidence.mjs` | Deterministic evidence generator (kept out of `src/` so the production module carries no io surface). |
| `docs/assembly-evidence/vb2-bench/bench-surface.html` | The rendered live bench evidence artifact. |

## Scope discipline
Adds only a new read-only surface module + its self-test + evidence. It composes the **frozen**
cto-queue data-class law (`isDisplayableClass` / `REDACTED` / `UNKNOWN`) read-only; it does **not**
touch any frozen VB2 scaffold file, changes no schema, and adds no act/approve/execute/merge path.
The burden-metric shape it reads mirrors the recorded `are1-founder-burden-1` schema
(`docs/metrics/FOUNDER_HAND_BURDEN_AUTONOMOUS_RUN.json`). This lane commits locally only; it does not
push or merge (Terminal-0 owns merges).
