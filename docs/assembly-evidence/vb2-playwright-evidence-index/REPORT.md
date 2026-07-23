# Playwright evidence index — generalized indexer (wide-safe lane)

**Lane:** `lane/w2-cto-queue-surface` · **Job:** `w2-6-playwright-evidence-index` (Wave-2, `wide_safe`) · **Founder gate:** none.

**Plain English — what this is:** FounderGate already *captures* Playwright evidence, but only for one
surface — the Phase7.1 safety-check foreground capture bakes its own `RESULT.json`, screenshots, trace,
video and hash manifest into a single hand-written bundle. Every other bundle (the raw
`@playwright/test` reporter output, future lane surfaces) was invisible: nothing read across them. Per
the V8-B completion matrix (Playwright evidence system = *PARTIAL*, missing "generalized evidence
indexer"; today "Phase7.1 safety-check only") this lane adds **one surface-agnostic indexer that reads
every Playwright evidence bundle we hold and shows, in one honest place, what each one claims and which
claims are NOT backed by the artifacts that would prove them.**

**Why it matters:** the founder can now see every Playwright bundle at a glance — passed / failed /
running / unknown, across all surfaces — and, most importantly, an honest **unsupported-claim** flag on
any bundle that records a PASS but does not carry the core falsifiable artifacts (at least one
screenshot, a trace, and a hash manifest). A green light nobody can check is worse than a red one.

**What the index found on the real committed evidence** (run the generator to reproduce):
- **8 bundles across 3 surfaces** — `phase7.1-safety-check`, `misc-capture`, and
  `playwright-test-reporter` — proving the indexer is not wired to the safety-check shape.
- **1 unsupported claim: `playwright-results.json`.** The committed `@playwright/test` reporter output
  records 20 passing tests but is a bare summary file — the traces/screenshots that would back that
  claim are not committed beside it. The index says so out loud rather than letting the bare pass read
  as proven. This is the false-green guard firing on real data, with nothing fabricated.

**Correction — independent checker finding F-2 (contradictory green state vs reporter stats):** an
independent check of this module found a false green. `normalizeVerdict` read the run-state STRING
first and returned `PASS` on any recognized green word (`PASSED`, `PASS`, `VERIFIED`, `SUCCESS`,
`GREEN`) **before** it ever looked at the reporter statistics — so a bundle declaring
`{ state: "PASSED", passed: 0, failed: 5 }` indexed as a fully-backed `PASS`, and the founder
surface showed `Passed: 1 · Failed: 0`. A green word outranked the numbers that disprove it. This is
now **failed closed**: a finite declared `failed` greater than zero **dominates any state string**,
including a recognized green one, and the verdict is `FAIL`. The contradiction is counted and
displayed as failed everywhere the founder can see it (`indexDigest`, `renderDigestText`,
`renderSurfaceText`, the rendered bundle row). Everything else is unchanged: a green state with
`failed: 0` is still `PASS`, a green state carrying no reporter statistics keeps its documented
state-only behaviour, recognized failure states stay `FAIL`, and an unrecognized state stays
fail-closed at `UNKNOWN`. No schema, export, function name, module version or evidence format
changed. **Scope of this correction:** it corrects this MODULE's verdict precedence only. It is not
integration, not founder acceptance, and asserts nothing about the wider PR, the runtime, or
production; a fresh independent check and a separate Advisor review are still required.

**What can go wrong (and how this guards against it):**
- *An act edge sneaks in* → the indexer is pure and read-only; its self-test scans the module source for
  `fs`/`net`/`child_process`/`fetch`/`spawn`/`readFileSync`/etc. and the rendered page for
  `<script>`/`<form>`/`<button>`/`<input>`/`on*=`/`href` — there is nothing an interaction can ride, and
  the module never runs a browser or captures anything (that stays in the generators). The act edge stays VB3.
- *A pass is trusted without proof* → a PASS bundle missing any core artifact is flagged as an
  **unsupported claim** and named; only a claimed PASS can be one (a red bundle overstates nothing).
- *A green word outranks the numbers* → a declared `failed > 0` now dominates a recognized green
  state string; the contradiction fails closed to `FAIL` and is counted as failed (checker finding F-2).
- *Invented state* → an absent verdict is `UNKNOWN`, never assumed PASS; a missing artifact is "none
  declared", never guessed present; every verdict bucket is zero-filled and the buckets sum to the
  total (Law 54). The `by_surface` map has no hardcoded surface list — a new surface buckets itself.
- *Non-reproducible evidence* → both the indexer and the generator are deterministic (no clock, no
  randomness; bundles sorted by id): same disk in → byte-identical page out.

**What you (the founder) can test right now:**
1. `node src/v8b2/playwright-evidence-index.selftest.mjs` — 33 checks, all green (27 original + 6 F-2
   contradiction regression checks).
2. `npm test` at the repo root — the whole suite stays green with the indexer added.
3. `node docs/assembly-evidence/vb2-playwright-evidence-index/render-evidence.mjs` — re-reads the real
   bundles under `docs/testing/evidence/` and regenerates the page (byte-identical).
4. Open [`evidence-index-surface.html`](evidence-index-surface.html) — the live index of every real
   Playwright bundle, with the unsupported-claim flag visible.

**One next action:** the index reads evidence only. An **Evidence Viewer** (a readable per-bundle drill-in
surface) is the next matrix gap and a separate lane; wiring an *act* edge (re-run / accept a bundle)
remains frozen to VB3 (Gate/Witness Engine) behind a founder gate.

## Files in this lane
| File | What it is |
|------|------------|
| `src/v8b2/playwright-evidence-index.mjs` | Pure, read-only, surface-agnostic indexer: `normalizeVerdict`, `normalizeBundle`, `indexDigest`, `renderDigest{Text,Html}`, `renderBundleListHtml`, `renderSurface{Html,Text}`. No io, no act edge. |
| `src/v8b2/playwright-evidence-index.selftest.mjs` | 33-check proof: honest verdict normalization, the F-2 green-state/reporter-stat contradiction regression block, unsupported-claim guard, surface-agnostic bucketing, no-invented-state, complete page, no act affordance, determinism, source/export act-edge scans. |
| `docs/assembly-evidence/vb2-playwright-evidence-index/render-evidence.mjs` | Deterministic evidence generator (kept out of `src/` so the production module carries no io surface) — reads the real bundles on disk and feeds the pure indexer. |
| `docs/assembly-evidence/vb2-playwright-evidence-index/evidence-index-surface.html` | The rendered live index artifact. |

## Scope discipline
Adds only a new read-only indexer module + its self-test + evidence. Does **not** touch any frozen VB2
scaffold file, changes no schema, adds no capture/run/act path, and does not modify the existing
safety-check capture tools or `playwright.config.mjs`. It composes only DATA the generator reads from
disk. This lane commits locally only; it does not push or merge (Terminal-0 owns merges).
