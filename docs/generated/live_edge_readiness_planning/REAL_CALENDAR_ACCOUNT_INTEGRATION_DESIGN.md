# Lane C — Real Calendar / Account Integration Design (DESIGN ONLY — not connected)

## Access boundary
- **Read-only first.** No send/invite/update/delete until a SEPARATE later gate.
- OAuth/account-linking is its own explicit gate; scopes minimized to read-only calendar events.
- **Synthetic → real transition:** the current synthetic calendar stays the default; a real account is
  used only after the founder links it under an explicit phrase, and even then read-only.

## Data minimization
- Fetch only event titles/times needed for the check; do not store attendee PII; redact/aggregate;
  no email bodies, no contacts, no attachments.

## Evidence + revocation
- Evidence records "read-only calendar check performed on N synthetic-or-consented events" — no PII.
- One-click revocation (delete token, forget account); revocation leaves no residual data.

## Failure / refusal states
- No token → UNKNOWN (never fake). Scope escalation requested → REFUSED_NEEDS_AUTHORIZATION.
  Write attempted → REFUSED (read-only phase). Rate/limit error → HOLD.

## Founder authorization phrase (INACTIVE)
`I AUTHORIZE FounderGate to design/build a READ-ONLY calendar integration behind an explicit account-linking gate, minimized scopes, no send/invite/update/delete, no PII stored, revocable — as a local design/build only, not production and not customer data.`
