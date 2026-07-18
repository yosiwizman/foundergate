# Outage Recovery Coordinator (ORC-1R)

Minimum Outage Recovery Floor so an outage recovers with ONE founder click, not a technical operator.

## Effect-aware recovery law (executable: src/recovery/recovery-law.mjs)
Every recoverable action carries one effect class: READ_ONLY, REVERSIBLE_LOCAL, REPOSITORY_MUTATION, EXTERNAL_IDEMPOTENT, EXTERNAL_UNCERTAIN, IRREVERSIBLE. UNKNOWN/MISSING FAILS CLOSED (park + route gate). External-uncertain and irreversible never auto-retry. A worker cannot downgrade an effect class to dodge a gate. The existing held-action sink is the ONLY external-action boundary.

## Recovery journal (src/recovery/recovery-journal.mjs)
Lifecycle INTENT_RECORDED->ACTION_STARTED->ACTION_COMPLETED->EVIDENCE_SEALED. After an outage: STARTED-without-COMPLETED = UNCERTAIN; COMPLETED-without-SEALED = COMPLETED_EVIDENCE_UNSEALED; SEALED = terminal (no re-exec). Truncation-tolerant; a reboot NEVER extends the original deadline.

## Reuse, not duplication
Reuses the existing singleton/lease/heartbeat/deadline/PANIC/held-action primitives (see reuse-map.json). No second authority created.

## This directive does NOT start the 9h run and does NOT consume the activation decision.
