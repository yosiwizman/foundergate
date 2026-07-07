# Redaction checklist — before a proof package is emitted or shared

**Plain English:** a proof package is PRIVATE by default. Run this checklist before trusting or sharing one.
The scanner (`redact.mjs`) enforces the mechanical items automatically and fails closed; the judgment items are
for a human.

## Mechanical (enforced by `redact.mjs`, fail-closed)
- [ ] No secret-shaped token: `Bearer …`, JWTs, `gho_/ghp_/ghs_/ghr_/ghu_`, `github_pat_…`, `xox…` (Slack),
      `AKIA…` (AWS), `AIza…` (Google), `sk-…` (OpenAI-style), `key=value` secret fields, PEM private-key blocks.
- [ ] No PII shape: email address, phone number, US SSN, credit-card-length digit run.
- [ ] Git SHAs, PR numbers, ISO timestamps, and branch names are **allowed** (required output) and must not be
      redacted.

## Judgment (human)
- [ ] Every item carries an explicit label; nothing is unlabeled.
- [ ] No overclaim: `docs/spec` is not counted as runtime; `preview-only` does not enact or send; `gated` is
      fail-closed; `working-runtime` is only a real, checkable local effect (diagnostic / CI gate), never a
      provider send.
- [ ] The package is marked PRIVATE (`private: true`, `no_public_sharing: true`); do not publish externally.
- [ ] No infrastructure detail (internal hostnames, ports, private store paths) is embedded in prose.

**One next action:** run `node src/proof-packages/build-proof-package.mjs --check` — a clean exit means the
mechanical gate passed; then eyeball the judgment items above.
