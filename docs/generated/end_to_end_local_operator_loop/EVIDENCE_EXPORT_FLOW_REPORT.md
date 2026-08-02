# Evidence Export Flow
- Export is disabled before a successful eligible run.
- Export uses the real local `/api/export` (seals a ZIP, verifies with `unzip -t`).
- `SEALED_EXPORT_LOCAL` is shown only when integrity verification passes; failure → EXPORT_FAILED.
- The founder-facing evidence receipt includes: **source label, objective, safety classification,
  test result, decision (never SHIP), limitations, and what was NOT proven**, plus "send the ZIP to
  ChatGPT only if asked".
- No raw ZIP internals or full SHA are shown to the founder.
Verified (E2E): export disabled pre-run; after run → SEALED with a receipt containing
source/objective/classification/limitations/not-proven; repeated exports stable.
