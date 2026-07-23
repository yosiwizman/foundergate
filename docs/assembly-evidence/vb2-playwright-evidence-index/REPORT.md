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

**Correction — independent checker finding F-A (negated/ambiguous state strings read as green):** a
second independent check found a *further*, material false green in the same function — **pre-existing
in the original lane, neither introduced nor worsened by the F-2 correction above.** The green test
was an **unanchored substring match**: the word `PASSED` simply lives inside `NOT_PASSED`, `VERIFIED`
lives inside `UNVERIFIED`, and the test ran before the failure test — so `UNVERIFIED`, `NOT_VERIFIED`,
`NOT_PASSED`, `UNSUCCESSFUL`, `NOT_SUCCESS`, `NOT_GREEN`, `GREENISH` and
`FAILED_BUT_PREVIOUSLY_PASSED` **all normalized to `PASS`**. `UNVERIFIED → PASS` directly contradicts
this module's own Law 54 contract ("a bundle whose state cannot be read is UNKNOWN, never assumed to
have passed"); `FAILED_BUT_PREVIOUSLY_PASSED → PASS` read an explicit failure as a pass.

Classification is now **token-aware against an explicit vocabulary of complete state tokens** — there
is no substring regex left in the classification path at all. The state string is uppercased, split
into tokens on non-alphanumeric separators, and each token is looked up in a frozen vocabulary:

| Vocabulary | Tokens |
|---|---|
| **Green (accepted)** | `PASS` · `PASSED` · `VERIFIED` · `SUCCESS` · `GREEN` (so composite surface states such as `FOREGROUND_TEST_VERIFIED` read as a pass) |
| **Failure** | `FAIL` · `FAILED` · `FAILURE` · `ERROR` · `ERRORED` · `REFUSE` · `REFUSED` · `REFUSAL` · `REFUSING` · `RED` · `UNVERIFIED` · `UNSUCCESSFUL` |
| **Running** | `RUNNING` · `PENDING` · `PROGRESS` · `INPROGRESS` |
| **Negation** | `NOT` · `NON` · `NEVER` · `NO` |
| **Neutral qualifiers** | `FOREGROUND` · `BACKGROUND` · `TEST` · `TESTS` · `RUN` · `CHECK` · `CHECKS` · `SAFETY` · `PLAYWRIGHT` · `E2E` · `SUITE` · `STATE` · `STATUS` · `PHASE` · `IN` · `FINAL` · `OVERALL` · `RESULT` |

The precedence is fail-closed at every step: (1) a **finite** declared `failed > 0` still dominates
everything, including green, running and unrecognized states; (2) an explicit **failure token anywhere**
in the state wins, which is why `FAILED_BUT_PREVIOUSLY_PASSED` is a `FAIL` — a declared failure is not
undone by a later green word; (3) a **negation beside any recognized state** is an explicit negative
state, so `NOT_VERIFIED`, `NOT_PASSED`, `NOT_SUCCESS` and `NOT_GREEN` are failures; (4) a green verdict
requires a recognized green token, **no** failure token, **no** negation, and **no** token the
vocabulary does not recognize; (5) anything else — `GREENISH`, `PASSING`, an ambiguous mix of classes,
prose longer than six tokens, an empty state with no usable statistics — is **unreadable, and
unreadable is `UNKNOWN`, never a pass**. There is deliberately no `UN`-prefix rule: `UNVERIFIED` and
`UNSUCCESSFUL` are enumerated one by one, so an innocent word like `UNRECOGNIZED` is not mistaken for a
declared failure. Classification is deterministic and input-immutable — it reads the descriptor and
writes nothing.

Nothing else changed: legitimate green states still pass, recognized failure states stay `FAIL`,
running states stay `RUNNING` unless a declared failure overrides them, an unrecognized state still
lets honest reporter statistics decide, and the F-2 contradiction guard is unchanged and still
covered. No schema, export, function name, module version or evidence format changed, and the
committed `evidence-index-surface.html` regenerates **byte-identically**. **Known residual, stated out
loud and NOT repaired here:** a *non-finite or negative* `failed` (`Infinity`, `NaN`, `-1`, `"5"`,
`true`) is still read as *absent* rather than *unreadable*, so a green state string still wins beside
one — that is the separate, still-open checker finding **F-B**, deliberately out of scope for this
F-A correction and asserted in the self-test so it stays visible. **Scope of this correction:** it
corrects this MODULE's state classification only. It is not integration, not founder acceptance, and
asserts nothing about the wider PR, the runtime, or production; a fresh independent check and a
separate Advisor review are still required.

**What can go wrong (and how this guards against it):**
- *An act edge sneaks in* → the indexer is pure and read-only; its self-test scans the module source for
  `fs`/`net`/`child_process`/`fetch`/`spawn`/`readFileSync`/etc. and the rendered page for
  `<script>`/`<form>`/`<button>`/`<input>`/`on*=`/`href` — there is nothing an interaction can ride, and
  the module never runs a browser or captures anything (that stays in the generators). The act edge stays VB3.
- *A pass is trusted without proof* → a PASS bundle missing any core artifact is flagged as an
  **unsupported claim** and named; only a claimed PASS can be one (a red bundle overstates nothing).
- *A green word outranks the numbers* → a declared `failed > 0` now dominates a recognized green
  state string; the contradiction fails closed to `FAIL` and is counted as failed (checker finding F-2).
- *A negated word still reads as green* → classification is token-aware against an explicit vocabulary,
  not a substring match, so `UNVERIFIED`, `NOT_PASSED`, `NOT_SUCCESS`, `NOT_GREEN` and
  `FAILED_BUT_PREVIOUSLY_PASSED` are `FAIL`, and `GREENISH` / `PASSING` / prose are `UNKNOWN`
  (checker finding F-A). A direct adversarial matrix over every one of those strings, plus the
  failure-precedence combinations, is run against the production export.
- *Invented state* → an absent verdict is `UNKNOWN`, never assumed PASS; a missing artifact is "none
  declared", never guessed present; every verdict bucket is zero-filled and the buckets sum to the
  total (Law 54). The `by_surface` map has no hardcoded surface list — a new surface buckets itself.
- *Non-reproducible evidence* → both the indexer and the generator are deterministic (no clock, no
  randomness; bundles sorted by id): same disk in → byte-identical page out.

**What you (the founder) can test right now:**
1. `node src/v8b2/playwright-evidence-index.selftest.mjs` — 54 checks, all green (27 original + 6 F-2
   contradiction regression checks + 21 F-A token-safe state-classification checks).
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
| `src/v8b2/playwright-evidence-index.mjs` | Pure, read-only, surface-agnostic indexer: `normalizeVerdict`, `normalizeBundle`, `indexDigest`, `renderDigest{Text,Html}`, `renderBundleListHtml`, `renderSurface{Html,Text}`. Token-safe state vocabulary (module-private, no new export). No io, no act edge. |
| `src/v8b2/playwright-evidence-index.selftest.mjs` | 54-check proof: honest verdict normalization, the F-2 green-state/reporter-stat contradiction regression block, the F-A token-safe state-classification block (green vocabulary, negated-state matrix, ambiguous fail-closed, failure-stat precedence, running + failures, malformed/null/empty descriptors, NaN/Infinity/negative counts, duplicate bundles, determinism, input immutability, founder digest counts, rendered text and bundle markup, and a source scan proving no substring green test survives), unsupported-claim guard, surface-agnostic bucketing, no-invented-state, complete page, no act affordance, determinism, source/export act-edge scans. |
| `docs/assembly-evidence/vb2-playwright-evidence-index/render-evidence.mjs` | Deterministic evidence generator (kept out of `src/` so the production module carries no io surface) — reads the real bundles on disk and feeds the pure indexer. |
| `docs/assembly-evidence/vb2-playwright-evidence-index/evidence-index-surface.html` | The rendered live index artifact. |

## Scope discipline
Adds only a new read-only indexer module + its self-test + evidence. Does **not** touch any frozen VB2
scaffold file, changes no schema, adds no capture/run/act path, and does not modify the existing
safety-check capture tools or `playwright.config.mjs`. It composes only DATA the generator reads from
disk. This lane commits locally only; it does not push or merge (Terminal-0 owns merges).
