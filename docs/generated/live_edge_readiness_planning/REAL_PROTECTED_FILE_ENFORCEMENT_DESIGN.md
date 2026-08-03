# Lane B — Real Protected-File Enforcement Design (DESIGN ONLY — not activated)

## Model
- **Classification states:** ALLOWED · BLOCKED_SECRET · BLOCKED_CUSTOMER · BLOCKED_PRODUCTION ·
  BLOCKED_PRIVATE · UNCLASSIFIED.
- **Default-deny:** an UNCLASSIFIED file is BLOCKED until a rule classifies it (fail-safe).
- **Allowlist** (path/glob) + **blocklist** (path/glob + content signatures for secrets).
- **Secrets handling:** detect by filename (*.env, *_key, id_rsa) + content patterns; never read/echo
  the secret value; store only a redacted match location; never seal a secret into evidence.

## Refusal evidence
- Each block emits a founder-safe record: rule matched, classification, "blocked for safety" — no raw
  content, no secret value, no full path leakage beyond what the founder needs.

## Safe UI wording (planned)
- "Protected-file enforcement (LOCAL) — blocks secrets/customer/production/private by default."
- Until activation the UI keeps the current **LOCAL_SYNTHETIC_ENFORCEMENT_DEMO** label.

## No real scanning until authorized
- No real filesystem is scanned in this design phase. Real scanning is gated behind the founder phrase below.

## Tests required BEFORE activation
- Default-deny on unclassified; secret redaction (no value leak); allow/block matrix; no evidence
  leakage of secrets; performance bound + timeout; refusal-record integrity; adversarial filenames.

## Founder authorization phrase (INACTIVE)
`I AUTHORIZE FounderGate to build and locally test real protected-file enforcement on a folder I own and identify, default-deny, secrets redacted, no secret values in evidence, and no customer/private/production data — as a local design/build only, not production or security-reviewed.`
