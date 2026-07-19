# Project Bench — evidence (VB2, read-only)

**Requirement:** Project Bench — "per-project result ledger" (V8-B completion matrix row 15).
**Lane:** Wave-2 wide_safe. **Job:** `w2-4-project-bench`.
**Status:** BUILT. Read-only, non-executing; no act/approve/run/merge edge added.

## What it is

Bench v1 already gives the founder a **flat project roster** — one line per project, one
supplied result each. That answers *"how many of my projects passed?"* but it structurally
**cannot** answer the harder question: *"did this project stay working, or did it pass once and
quietly break?"* A single PASS/FAIL flag hides that.

Project Bench is the **per-project detail ledger** that closes the gap. For each project it
builds the project's own record from its **run timeline** and **derives** the result instead of
trusting a supplied flag:

1. **Result is derived, not declared.** The latest run wins. A project with no runs is
   `UNKNOWN`, never flattered to proven. A caller cannot hand us a stale `"PASS"` over a
   timeline whose last run failed — the surface ignores the flag and reads the runs.
2. **Regression is a first-class number.** A project whose latest run FAILED but which PASSED
   earlier is a **regression** — it worked and now doesn't. That is the single most important
   thing a founder must see, and a flat roster cannot express it. It gets its own headline tile.
3. **Recovery is surfaced too.** Latest run PASSED after an earlier FAIL → *recovered*. Good
   news is a fact, not just bad news.
4. **Per-project deliverable proof.** Reuses the frozen component ledger over the components
   attributed to each project — *"did the pieces this project shipped prove themselves?"* — one
   tally law, not a second one.

## Honesty rules (Law 54 — never invent state)

- No runs → `UNKNOWN` status, never `PROVEN`.
- A run result outside the enum (`"green"`, `"ok"`, …) normalises to `UNKNOWN`, never coerced
  to `PASS`.
- `pass_streak` resets to 0 the moment the latest run is not a pass — no stale green count.
- A supplied top-level `result` flag is **ignored**; only the timeline decides.

## Data-class law (frozen cto-queue rule, reused not forked)

A project whose data class is not displayable (SECRET / BLOCKED / unknown) has its **name
redacted**, while its **result, run timeline, and regression flag stay visible** — those are
structural facts, not the project's private content. In the live evidence the *Confidential
client engagement* project shows its recovered PASS and its two-run history, but never its name.

## Purity / no act edge

- No `fs`, `net`, `child_process`, clock, or randomness in the production module
  (`src/v8b2/project-bench.mjs`). The run order is the caller's; a run's `at` timestamp is inert
  data displayed verbatim, never parsed or compared to a clock.
- The rendered page carries **no** `<script>`, `<form>`, `<button>`, `<input>`, `on*` handler,
  or navigable link. Showing a project's history is not acting on it — the act edge
  (approve / run / merge) stays frozen to VB3.
- Rendering is deterministic: same snapshot in, byte-identical page out.

## Files

- `src/v8b2/project-bench.mjs` — the pure, read-only per-project ledger.
- `src/v8b2/project-bench.selftest.mjs` — 22 checks (timeline-derived result, regression /
  recovery / streak, UNKNOWN honesty, deliverable proof, redaction pass-through, complete
  read-only page, no-act-affordance, determinism, source/export act-edge scans).
- `docs/assembly-evidence/vb2-project-bench/render-evidence.mjs` — deterministic evidence
  generator (kept out of `src/` so the module carries no io surface).
- `docs/assembly-evidence/vb2-project-bench/project-bench-surface.html` — the live rendered
  surface. The SECRET-class project shows its result and history but not its name; the *Public
  preview demo* shows the **Regressed** badge (passed twice, latest run failed); the *New R&D
  spike* shows **Unknown** (no runs — not assumed proven).

## How to reproduce

```
node src/v8b2/project-bench.selftest.mjs           # 22 checks, all green
node docs/assembly-evidence/vb2-project-bench/render-evidence.mjs   # regenerate the surface
npm test                                            # full suite green
```
