# FounderGate Evidence Note — Demo

A small, local, non-sensitive demo of an "evidence note" generator. It takes a
JSON description of a project's testing/review status and renders a plain-English
note for a founder. It does not call any network or external service, does not
touch a database, requires no authentication, and adds no new dependencies.

This is a **local demo, not production code, and not a production-readiness
certification.** It is confined to this directory and does not touch any other
part of the repository.

## Honesty guarantees

- Any missing or empty input field is rendered as `UNKNOWN` and listed under
  "Unknown/missing fields" — the tool never invents a value.
- The rendered note never asserts "production-ready", "customer-ready",
  "final-beta", "secure", or "compliant".
- A `SHIP` decision line is only shown when the input's `decision` is exactly
  `"SHIP"` **and** `limitations` is a non-empty array. Any other decision
  (e.g. `DO_NOT_SHIP`, `INSUFFICIENT_EVIDENCE`, `SAFE_TO_CONTINUE_INTERNAL_ONLY`)
  is shown verbatim.
- Field values are sanitized (control/ANSI characters stripped, HTML-escaped)
  so hostile or injected content in an input field is rendered inert.

## Files

- `evidence-note.mjs` — pure functions `buildEvidenceNote(input)` and
  `renderEvidenceNoteText(note)`.
- `cli.mjs` — reads a JSON file (default `sample-input.json`), builds a note,
  prints it.
- `evidence-note.selftest.mjs` — dependency-free assertions covering full
  input, missing fields, forbidden claims, the SHIP condition, and hostile
  input handling.
- `sample-input.json` — example input.

## Run it

From the repository root:

```
node demo/non_sensitive_project_proof/cli.mjs
```

Or against your own input file:

```
node demo/non_sensitive_project_proof/cli.mjs path/to/your-input.json
```

## Run the self-test

```
node demo/non_sensitive_project_proof/evidence-note.selftest.mjs
```

Prints `PASSED n/n` and exits 0 on success.
