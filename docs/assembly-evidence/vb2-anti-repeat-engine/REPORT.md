# VB2 — Anti-repeat Engine (defect → pattern → regression conversion)

**Requirement (V8-B completion matrix):** *Anti-repeat system* — **PARTIAL**. The matrix names the
missing behaviour as **"defect → pattern → regression conversion"** and the missing evidence as
*"TBF-1 anti-repeat tests only"*. What existed on disk was a handful of one-off anti-repeat
self-tests (e.g. `src/tools/launcher-health.selftest.mjs`, whose own header calls itself *"anti-repeat
for the Run-4 session defect"*) — real conversions, but no standalone engine that reads a defect and
shows, in plain English, whether it actually became a wired, proven check.

**Status after this lane:** built. A standalone engine lifts one caught defect into its **conversion**
— the defect, a generalized failure **pattern** derived from the defect's own structure, and the
regression **check** exactly as the record declares it — and a founder-readable surface renders it
with the one honesty an anti-repeat system lives or dies by: *never again is earned, never asserted.*

## What ROADMAP §4.7 (B6, "Anti-repeat law") asks for, and where each piece lives

> *Every bug the founder personally catches becomes a new automated check — the system may be wrong,
> but never wrong the same way twice.*

- *"a bug the founder catches"* → the **defect** the engine reads (`caughtBy`, symptom, area, kind,
  evidence) — carried verbatim, and **data-classified** (Founder Evidence law): non-displayable
  evidence is shown **redacted**, while the protection verdict is computed regardless.
- *"becomes a new automated check"* → the **check** — authored, given a **home** suite, `registered`,
  and `reproducesDefect`. The engine never authors, wires, or runs it; those facts come from the
  record.
- *"defect → pattern → regression conversion"* (the named gap) → the five-stage **pipeline**: defect →
  pattern generalized → check authored → check wired → check proven. Each stage is marked present or
  absent from the conversion alone.
- *"never wrong the same way twice"* → the **verdict**: `neverAgain` is true **only** when the check is
  authored **and** wired into a running suite **and** proven to reproduce the defect. Anything less is
  *"not yet protected — can recur"*.

## What was added

- **`src/v8b2/anti-repeat-engine.mjs`** — a pure, read-only engine + surface. It:
  - `deriveRegressionCheck(defect, opts)` reads a caller-supplied defect record and lifts it into a
    conversion object. It **derives** a failure-pattern signature from the defect's own structure
    (area · failure kind · symptom) as a one-way hash — safe to display even for a redacted defect —
    and marks the pattern *generalized* only when it names both an area and a failure kind.
  - `deriveAntiRepeatView(...)` computes the honest verdict, the pipeline, and warnings, and applies
    **data-class redaction** to symptom/evidence.
  - renders the conversion (text + HTML + a complete page), with the law quoted verbatim.
  - No `fs` / net / `child_process` / clock / randomness. Same snapshot in → byte-identical page out.

- **`src/v8b2/anti-repeat-engine.selftest.mjs`** — 23 checks: the engine lifts a defect into a
  conversion; the earned-`neverAgain` law; authored-but-not-wired and wired-but-not-proven both stay
  *not protected*; `registered` with no home is not wired; wired/proven are never assumed (only an
  explicit `true` counts); the instance-only pattern warning; deterministic, content-free pattern
  signatures; **SECRET-classed evidence is redacted yet still gets a verdict and a signature**; the
  pipeline presence map; the law shown verbatim; purity; garbage-in honest degrade; source and mock
  truth-labels; a complete page with balanced `<section>` tags; the seductive-lie HTML guard;
  injection-safe escaping; deterministic output; and the three act-edge scans (source imports,
  rendered page, exported names).

- **`docs/assembly-evidence/vb2-anti-repeat-engine/`** — this REPORT, the deterministic generator
  (`render-evidence.mjs`), and two rendered pages.

## The honesty stance — never again is earned (Law 43; B6)

- **A defect is PROTECTED only when its check is authored, wired, and proven.** A check that does not
  run *"protects nothing"*; a check never seen to catch the bug *"may stay green even if the bug
  returns"*. Claiming *never again* over either is the seductive anti-repeat lie — and is exactly what
  this surface refuses to render.
- **The pattern is derived, never invented.** With only a bare symptom (no area/kind) it is *"the exact
  instance only"* and the surface warns that a **variant** of the bug would slip past a literal check.
- **Redaction never blocks the verdict.** A SECRET/`customer_data` defect has its symptom and evidence
  redacted, but its pattern signature (a hash, carrying no content) and its wired/proven status are
  shown — because whether a bug is caught again does not depend on whether its raw evidence can be
  printed.

## Evidence (rendered from real, on-disk repo facts, offline)

`render-evidence.mjs` does not hand-type *"wired"* or *"proven"* — it **verifies** them against the
repository, then renders one page each:

- **`anti-repeat-protected.html`** — the Run-4 *"two ports appeared to serve the same page"* defect.
  The generator confirms its check `src/tools/launcher-health.selftest.mjs` **exists**, is
  **discovered** by the same runner `npm test` uses, and **runs green** (→ wired), and that the file
  **self-declares** it locks that specific defect (→ proven). Only then does the card render **protected
  — never again**, all 5 pipeline stages present. Every part of that verdict is checked, not asserted.
- **`anti-repeat-unprotected.html`** — the founder-caught **launcher Node-discovery** bug
  (`docs/bugs/FOUNDER_LAUNCHER_NODE_DISCOVERY_FAILURE.md`). The generator searches every discovered
  `src/**/*.selftest.mjs` for a guard over that failure and finds **none**, so the card renders **not
  yet protected — can recur**. That is the real on-disk truth and a genuine, actionable gap — a real
  founder bug that is **not** yet converted into a wired check.

Reproduce:

```
node docs/assembly-evidence/vb2-anti-repeat-engine/render-evidence.mjs
```

Verified on disk at render time: `launcher-health` check exists=true, discovered=true, green=true →
wired=true, proven=true; node-discovery guard in the counted suite → **NONE**.

## Read-only / no act edge (verified)

- The anti-repeat-engine self-test is green (23/23); the full suite is green (109/109).
- Both rendered pages contain **zero** of: `<script>`, `<form>`, `<button>`, `<input>`, inline `on*=`
  handlers, `href=`, or any `<a>` anchor.
- The surface module imports no side-effecting Node built-in and touches no disk/network. There is
  nothing here to **author** a check, **wire** it into a suite, or **run** it — converting a defect
  into a wired, proven check is a later, separately-owned act and is **not** wired here.

Local commit only; Terminal-0 owns merges.
