# Proof-package builder (generic sample)

**Plain English — what this is:** a small, offline generator that assembles a **private proof package** — a
single labeled, human-auditable rollup of what a run actually delivered (merged PRs, CI/reviewer/advisor posture,
founder gates, runtime evidence) — and refuses to emit it if it carries any secret or personal data.

**Why it matters:** it is the honesty layer for reporting outcomes. Every item is labeled with exactly what it
is (`working-runtime` / `preview-only` / `docs/spec` / `gated` / `planned`), so a spec can never be dressed up as
a shipped runtime capability, and a preview can never be reported as a live send.

**What can go wrong (and the guards):**
- *Overclaiming* → the builder enforces no-overclaim invariants (e.g. `working-runtime` is allowed only for the
  diagnostic + CI-safety gate, never a provider send) and fails closed on violation.
- *Leaking a secret/PII* → a fail-closed secret + PII scanner (`redact.mjs`) runs over the whole package before
  it is trusted or written; a matching token/email/phone/SSN/card shape aborts the build.
- *Silent drift* → the build is deterministic; the self-test asserts the on-disk `data/proof-package.json`
  byte-matches a fresh build.

**What the founder can test now:**
```bash
node src/proof-packages/proof-package.selftest.mjs   # PROOF-PACKAGE-SELFTEST: PASS
node src/proof-packages/build-proof-package.mjs --check   # build in memory, assert clean, do not write
```

**One next action:** to model a real run, edit `proof-package.model.mjs` (the single human-auditable source),
then run the build — the scanner and invariants will reject anything unsafe or overclaimed.

## Files
- `proof-package.model.mjs` — the source model (a fictional `your-org/your-project` sample; edit this).
- `build-proof-package.mjs` — the offline generator (labels → no-overclaim → rollup → scan → deterministic write).
- `redact.mjs` — the fail-closed secret + PII scanner.
- `proof-package.selftest.mjs` — the hermetic self-test.
- `data/proof-package.json` — the deterministic build output.
- `REDACTION_CHECKLIST.md` — the pre-emit safety checklist.

> This dataset is a **generic sample**. It contains no real merge history, infrastructure details, or private
> paths — it exists only to prove the builder's logic in this repo.
