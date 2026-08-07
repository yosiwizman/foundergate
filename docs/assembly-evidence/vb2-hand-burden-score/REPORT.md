# Founder Hand-Burden **score** — live scoring surface (wide-safe lane)

**Lane:** `lane/w2-cto-queue-surface` · **Job:** `w2-5-founder-hand-burden-score` (Wave-2, `wide_safe`) · **Founder gate:** none.

**Plain English — what this is:** Bench v1 already tells the founder *how many* technical operations a
run cost them (`hand_ops`) and gives a binary verdict — ZERO or PRESENT. Per the V8-B completion matrix
the Founder Hand-Burden score itself was **PARTIAL**: the missing behaviour is a **"live scoring
surface"** (evidence was "ARE burden metrics only"). This lane adds that surface: a per-run **autonomy
score** (0–100, higher = *less* founder hand-work) and a **score history with a trend** across runs.

**Why it matters — the two things a raw count cannot show:**
1. **"Zero hand-ops" is not the same as "autonomous."** A raw count mints *zero hand-burden* whenever the
   founder happened to touch nothing — **even if the harness also did nothing**. An empty run and a
   triumphantly autonomous run look identical. The score refuses that: it is a **ratio of the operations
   the harness carried to all the operations the run involved**, so a run with **no recorded work at all
   is UNSCORED, never a flattering 100**. Autonomy you cannot prove is not autonomy (Law 54).
2. **One number has no direction of travel.** The whole point of a hand-burden metric is to watch it fall
   toward zero over successive runs. This surface scores the **run history** and raises the **trend**
   between the two most recent scored runs — and a **REGRESSION** (score fell → founder hand-burden
   *rose*) is raised as its own headline, the way Project Bench raises a project regression.

**The score, precisely:**
```
autonomous_ops = (false gates the harness suppressed) + (routine actions it did autonomously)
hand_ops       = the founder's own technical operations        (from the FROZEN bench burden digest)
score          = round(100 * autonomous_ops / (autonomous_ops + hand_ops))
```
A score is a claim, so it needs proof on **both** sides: it is `UNKNOWN` unless `hand_ops` **and**
`autonomous_ops` are both measured, and `UNKNOWN` (not 100) when no operation of any kind was recorded.

**What can go wrong (and how this guards against it):**
- *A flattering fake 100 from an empty run* → a denominator of 0 (no operations at all) scores `UNKNOWN`,
  never 100. Proven by the core honesty test and stated out loud on the surface ("Unscored").
- *A score minted over metrics we don't have* → any missing founder burden field **or** any missing
  avoided-burden metric makes the score `UNKNOWN`; a negative/garbage metric is `UNKNOWN`, not a count.
- *A silent regression* → the trend compares the two most recent **scored** runs (skipping over an
  unscored run rather than guessing) and flags `REGRESSING` with its delta; the surface names it in words.
- *An unscored run distorting the aggregates* → an unscored run is **counted** in the run total but
  **excluded** from best/worst/average/trend, and that exclusion is stated (`runs scored: N/M`). The
  `total_hand_ops` is an honest sum — one unknown run makes the whole total `UNKNOWN`.
- *An act edge sneaks in* → the scorer is pure and read-only; its self-test scans the module source for
  `fs`/`child_process`/`fetch`/`spawn`/`Date.now`/`Math.random`/etc. and the rendered page for `<script>`/
  `<form>`/`<button>`/`<input>`/`on*=`/`href` — nothing an interaction can ride. Approve/run/merge stays VB3.
- *Non-reproducible evidence* → rendering is deterministic (no clock, no randomness): same snapshot in,
  byte-identical page out.
- *Direction mistaken for burden* → founder prompts/signatures are **never** counted into the score; the
  score measures only whether carrying out that direction cost the founder any hand-work.

**What you (the founder) can test right now:**
1. `node src/v8b2/hand-burden-score.selftest.mjs` — 27 checks, all green.
2. `npm test` at the repo root — the whole suite stays green with the scorer added.
3. Open [`score-surface.html`](score-surface.html) in a browser — the live scoring evidence, rendered from
   a fixed sample run history by [`render-evidence.mjs`](render-evidence.mjs). Note the three behaviours in
   one page: an **Assisted (50)** early run, an **Unscored** run whose metrics were incomplete, and a
   **Fully autonomous (100)** latest run → **trend: Improving**. Total hand-operations shows `—` because
   the unscored run's hand-ops are unknown and an honest sum refuses to invent it.

**One next action:** the scorer reads burden metrics only. It does not *produce* those metrics — wiring it
to read live per-run `are1-founder-burden-1` records (and any act edge on top) is out of scope here and
remains frozen to VB3 behind a founder gate.

## Files in this lane
| File | What it is |
|------|------------|
| `src/v8b2/hand-burden-score.mjs` | Pure, read-only scorer: `scoreRun`, `scoreSeries`, `handBurdenScore`, `renderScore{Text,Html}`, `renderSeries{Text,Html}`, `renderSurface{Html,Text}`. Composes the frozen bench `burdenDigest`; no io, no act edge. |
| `src/v8b2/hand-burden-score.selftest.mjs` | 27-check proof: the ratio needs both sides proven; an empty run is UNSCORED not 100; missing/garbage metric → UNKNOWN; trend/regression + skip-over-unscored; honest aggregates; complete read-only page; determinism; source/export act-edge scans. |
| `docs/assembly-evidence/vb2-hand-burden-score/render-evidence.mjs` | Deterministic evidence generator (kept out of `src/` so the production module carries no io surface). |
| `docs/assembly-evidence/vb2-hand-burden-score/score-surface.html` | The rendered live scoring evidence artifact. |

## Scope discipline
Adds only a new read-only scoring module + its self-test + evidence. It **composes** the frozen bench
`burdenDigest` and the frozen cto-queue `UNKNOWN` marker read-only; it does **not** fork the burden law,
touch any frozen VB2 scaffold file, change any schema, or add any act/approve/execute/merge path. The
per-run metric shape it reads mirrors the recorded `are1-founder-burden-1` schema
(`docs/metrics/FOUNDER_HAND_BURDEN_AUTONOMOUS_RUN.json`). This lane commits locally only; it does not push
or merge (Terminal-0 owns merges).
