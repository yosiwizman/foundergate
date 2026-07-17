# Checker Shortcut Catalog (D1 — DRAFT, authorizes nothing)

> **STATUS: DRAFT · PENDING FOUNDER SIGNATURE.** The catalog of named "fake-done" shortcuts a checker can take,
> each with the detection semantics an *armed* checker MUST apply, and a seeded-shortcut detection-proof design.
> **Editing the checker standing instructions to arm these is an evaluation-class change** (D3): it lands only via
> independent check + the mutation proof below + green CI + founder signature. **This DRAFT arms nothing** — it
> defines the catalog and the proof; the checker standing instructions are unchanged until the founder signs.
> Merged ≠ accepted; DRAFT ≠ authority. **Base:** main `068276e`. Governed by `docs/contracts/component-classification.md` (D3, signed).

## How to read this
Each shortcut is a way a check *reports done/clean without proving it*. For each: the **shortcut**, the **required
detection semantics** (what an armed checker must do instead), and the **seeded fixture** — an input a *bare* checker
passes but an *armed* checker must FLAG. The seeded-shortcut detection proof is: run the catalog's detector over all
12 fixtures; a bare checker misses ≥1; the armed checker flags all 12 (and flags zero on a clean control). A detector
that cannot be shown to flag a seeded shortcut is itself vacuous (shortcut #1) and rejected.

## The 12 shortcuts

**#1 — Vacuous assertion.** Shortcut: a test/claim that passes regardless of the code (asserts a tautology, or never
exercises the target). Detection: every assertion must be shown non-vacuous by a **mutation** — break the target, the
check must go RED. Fixture: a selftest asserting `true === true` beside a broken implementation → armed checker flags
"no mutation coverage."

**#2 — Happy-path only.** Shortcut: verifies the success case, never the failure/refusal/fail-closed case. Detection:
require a negative test for every guard (the refusal path must be exercised). Fixture: a validator with only a
valid-input test → flag "no rejection test."

**#3 — Mock masks reality.** Shortcut: asserts against a stub/mock that always returns success instead of the real
component. Detection: the proof must bind to the real module (or a fixture that fails when the real behavior is
wrong); mocks may model *inputs*, never *the verdict*. Fixture: a check that passes only because the mock returns
`{ok:true}` → flag "verdict sourced from mock."

**#4 — Grep-for-string ≠ behavior.** Shortcut: confirms a keyword/comment/label exists instead of proving the
behavior. Detection: behavior claims require behavioral evidence (run it), not a text match. Fixture: "read-only
proven" because the file contains the comment `// read-only` → flag "claim from text, not behavior" (this is the D3
§2 side-effect-certification principle).

**#5 — Self-certification.** Shortcut: the author's own "looks good / authority-ready" accepted as the check.
Detection: author ≠ checker (§12); an author-lane readiness claim is inadmissible as verification. Fixture: a report
whose only evidence is "the builder says it's clean" → flag "self-certification" (the withdrawn SHWL self-cert is the
canonical case).

**#6 — Stale-SHA / wrong-artifact.** Shortcut: checks an older SHA, a different branch, or a different artifact than
the one under review. Detection: the checker records `git rev-parse HEAD` and asserts it equals the exact review SHA;
every cited path is read at that SHA. Fixture: a report whose `HEAD` ≠ the claimed review SHA → flag "wrong SHA."

**#7 — Count-not-content.** Shortcut: asserts *N items exist* without verifying each resolves / is correct. Detection:
enumerate AND verify each element (each SHA resolves, each path exists, each row is well-formed). Fixture: "30/30
anchors" where one SHA does not resolve → flag "unverified element."

**#8 — Swallowed error.** Shortcut: a `try/catch` (or `.catch(()=>{})`) that hides a failure and reports pass.
Detection: scan for empty/again-pass catch blocks around the assertion; a caught failure must surface, not pass.
Fixture: a check wrapping the assertion in `try { assert(...) } catch {}` → flag "swallowed failure."

**#9 — Partial-scope as full.** Shortcut: checks a subset and reports the whole as done (a closed "these are all the
components" claim over an incomplete list). Detection: completeness must be a mechanical criterion, not a hand-curated
closed list (the D3 §4 fix is the canonical example). Fixture: an inventory claiming closure while omitting a
CI-gated component → flag "completeness gap."

**#10 — Absence-not-proven.** Shortcut: claims "no X" (no leak, no act edge, no secret) without a scan that would find
X. Detection: a negative claim requires a scan proven to catch a planted X (seed one, confirm the scan flags it).
Fixture: "no secret leak" with no test that plants a secret → flag "unproven absence."

**#11 — Green-CI ≠ product-works.** Shortcut: treats CI/tests green (or "merged") as acceptance of product behavior.
Detection: acceptance requires the product-behavior evidence (witness/soak/gate), separate from CI; MERGED ≠ ACCEPTED.
Fixture: "VB-x accepted because CI is green" with no founder gate → flag "CI-as-acceptance."

**#12 — Transport-success ≠ operational-success** (live incident 2026-07-16). Shortcut: an HTTP 200 / `res.ok` /
transport-layer success treated as operational success, masking a backend `ok:false`. Detection: operation success is
asserted ONLY on explicit backend body proof (`ok` + `enacted` + lifecycle fields), never `res.ok` / status-code
alone. Fixture: a response `{ httpStatus: 200, body: { ok: false, enacted: false } }` reported as success → flag
"transport masking operational failure."

## Seeded-shortcut detection proof (design; built when armed)
- One fixture per shortcut (`fixtures/shortcut-##.json` or a `.mjs` case) reproducing the shortcut, plus a clean
  control that must NOT flag.
- The detector runs over all 13 (12 + control). **Acceptance:** a *bare* checker (detector disabled) misses ≥1
  seeded shortcut; the *armed* checker flags all 12 and flags zero on the control. This is itself a mutation proof
  (shortcut #1): disabling the detector must turn the proof RED.
- The proof is evaluation-class; arming it into the checker standing instructions requires the founder signature.

## What this DRAFT does NOT do
It does not edit the checker standing instructions, arms nothing, and changes no checker behavior. The catalog + proof
design bind only when the founder signs the release below.

## Queued founder-gate sentence (queued — NOT executed)
> "I sign the Checker Shortcut Catalog (docs/contracts/checker-shortcut-catalog.md @ main <SHA>) as independently checked CLEAN and ARM it into the checker standing instructions as an evaluation-class change: every checker applies the 12 detection semantics; the seeded-shortcut detection proof (a fixture per shortcut a bare checker misses and an armed checker must flag, plus a clean control) is a required, mutation-verified gate; the catalog is itself evaluation-class (founder signature to amend). One builder + one independent adversarial checker built and verified the proof before this signature."
