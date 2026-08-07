# VB2 — Release Label Ladder (label + transition history)

**Requirement (V8-B completion matrix):** *Release Label Ladder* — **NOT BUILT**, missing behaviour
"label + transition history surface", with no evidence on disk.

**Status after this lane:** built. A founder-readable surface lays out the **ladder** a release
climbs (`dev → preview → internal → release`), **where** the project currently sits on it, and the
**transition history** of how it got there — over a caller-supplied release snapshot, with maximum
honesty about what has and has not actually been recorded.

## What was added

- **`src/v8b2/release-label-ladder.mjs`** — a pure, read-only surface. It takes a caller-supplied
  release snapshot and:
  - shows the **current label** — read straight from FounderGate's existing
    `.foundergate/release_label.json` shape (`label`, `stage`, `mock`, `note`) — and places it on
    the ladder (rung *N* of 4);
  - shows the **ladder** itself, its rungs taken verbatim from the release-label schema enum, each
    marked *passed* / *current* / *ahead* relative to the current label;
  - shows the **transition history**, each move classified honestly as a single-rung **promotion**,
    a multi-rung **jump** (a rung was skipped), a **step-down** (demotion), a **lateral**, or
    **off-ladder**;
  - carries the snapshot's **`source` truth-label** (`live` vs `fixture`) to the page.
  - No `fs` / net / `child_process` / clock / randomness. Same snapshot in → byte-identical page
    out.

- **`src/v8b2/release-label-ladder.selftest.mjs`** — 21 checks: the ladder-equals-schema-enum
  proof, rung placement, the undeclared-is-never-"dev" law, the mock truth-label, off-ladder
  handling, rung states, order-preserving history, the honest promotion/jump/step-down/lateral/
  off-ladder classification, missing-metadata "not recorded", the empty-history "no path is
  manufactured" law, the history-vs-current mismatch check, purity, injection-safe escaping, a
  complete page, deterministic output, and the three act-edge scans (source imports, rendered
  page, exported names).

- **`docs/assembly-evidence/vb2-release-label-ladder/`** — this REPORT, the deterministic generator
  (`render-evidence.mjs`), and the rendered page (`release-label-ladder.html`).

## The honesty stance — never invent release state (Law 54)

- **No declared label is "not declared" — never assumed `dev` (the bottom rung).** Assuming the
  bottom rung when nothing is on record is the most seductive release lie there is.
- **An off-ladder label (`UNKNOWN` or anything not in the schema enum) is placed on NO rung** and
  said to be off the ladder — never coerced to the nearest rung.
- **A `mock: true` label is carried as a truth-label** — a placeholder, not a real release state,
  said out loud at the top. (FounderGate's own committed label is `mock: true`.)
- **Transition history is taken exactly as given:** order preserved, timestamps shown verbatim and
  never parsed to re-sort, a missing time or actor said to be *not recorded* rather than fabricated.
  An **empty history** is *"no transition history recorded"* — the surface never manufactures a
  `dev → … → current` path the caller did not supply.
- **A jump and a step-down are surfaced facts,** never hidden behind a green arrow.
- **If the history does not end at the current label, the mismatch is stated out loud,** not
  reconciled by quietly trusting one over the other.

## The ladder's one authority

The rungs are **not** hand-picked here — they are the release-label schema enum, in order, minus the
off-ladder `UNKNOWN` sentinel:

```
src/v8a1/schemas/release_label.schema.json → enum ["dev","preview","internal","release","UNKNOWN"]
→ ladder  dev → preview → internal → release
```

A self-test asserts the ladder equals that enum, so the surface can never drift from the schema.

## Evidence (rendered from real data, offline)

`render-evidence.mjs` reads two **committed** files and writes `release-label-ladder.html`:

- the **current label** — `src/v8a1/fixture/mock-project/.foundergate/release_label.json` (the same
  file the V8-A1 dashboard reads: `label: "dev"`, `mock: true`); and
- the **ladder rungs** — the release-label schema enum (above).

Reproduce:

```
node docs/assembly-evidence/vb2-release-label-ladder/render-evidence.mjs
```

Because there is **no transition-history log on disk** today (the release_label schema records only
the *current* label, not a history of moves), the generator feeds an **empty** history, and the page
shows *"No transition history recorded"* — never a manufactured path — while still placing the real
`dev` label on rung 1 of 4 with its **mock** truth-label. That is the real, on-disk truth today, said
out loud. The self-test proves the surface renders exact rung placement, honest jump / step-down /
off-ladder classification, and the mismatch check correctly **when** a history is present, so the
capability is proven even though the committed history is currently empty.

## Read-only / no act edge (verified)

- Full self-test suite green (107/107 on this lane).
- The rendered page contains **zero** of: `<script>`, `<form>`, `<button>`, `<input>`, inline
  `on*=` handlers, `href=`, or any `<a>` anchor.
- The surface module imports no side-effecting Node built-in and touches no disk/network. There is
  nothing here to promote a label, cut a release, or move a rung — moving a release up the ladder is
  a later, separately-gated act and is **not** wired here.

Local commit only; Terminal-0 owns merges.
