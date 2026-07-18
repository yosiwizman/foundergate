# Durable Directive Control (DCL-1)

**Founder authorization:** *"No autonomous FounderGate directive may depend solely on Claude Code conversational memory."*

Every material directive must, before execution, have an exact stored body, a
reproducing SHA-256, byte/line counts, beginning/ending anchors, issuer, receipt
timestamp, dependency graph, queue state, atomic recovery state, an append-only
event ledger, next safe action, and completion/stop predicates.

## Self-capture (Phase 0) — the crux
DCL-1 captured **its own** complete body from the session transcript before
depending on memory. The body was recovered from **two independent transcript
records** (a `queue-operation.content` and an `attachment.prompt`) that are
byte-identical, then stored to `.foundergate/directives/dcl-1/prompt.txt`,
re-read, and its digest recomputed. Transcript SHA-256 == stored SHA-256
(`dde0e32a…`), byte_count 21949, line_count 883. State: `DIGEST_VERIFIED`.

## Immutability
The stored prompt body is immutable. Corrections require a **new directive
version and new digest** — a historical body is never overwritten.

## Compaction safety
Context compaction is **not** treated as safe until every active directive is
captured, digest-verified, queued, and has dependencies + recovery + a next safe
action. Otherwise: `COMPACTION_UNSAFE`. Enforced by
`src/directives/directive-control.mjs::safeToCompact` (tests 14–15).

## Honest historical recovery (Phase 6)
| Directive | Result |
|---|---|
| STACK-1E | HISTORICAL_RECEIVED_NOT_LOCKED (body captured, `c46e554a…`) |
| STACK-1F | HISTORICAL_RECEIVED_NOT_LOCKED (body captured, `2d0a5424…`) |
| ARLC-1 | HISTORICAL_RECEIVED_NOT_LOCKED (body captured, `d1aa7cad…`) |
| ARE-1 | CAPTURED_NOT_QUEUED (received, not durably queued; core work preserved on its branch) |
| **V8B-NIGHTSHIFT-1** | **NOT_PROVEN** — the title appears in the transcript **only as a reference inside DCL-1's own Phase-6 list**; no directive message ever started with it. **Not reconstructed, not backdated.** |

This is the exact failure DCL-1 exists to catch: an assumed directive that was
never actually received.

## Library & tests
`src/directives/directive-control.mjs` — state machine, capture verification,
directive-record validation, RUN preconditions, compaction/stop safety, queue
idempotency, dependency resolution, historical classification. 32/32 self-test
(the 30 named Phase-19 cases + 2 supporting). Gate classification is delegated
to the active **ARLC-1** policy — not duplicated.
