# A30 Evidence — V8-A2 Proposal Only (Bundle B4)

> **Plain English.** This records that Bundle B4 produced exactly one thing: a *proposal* for V8-A2. No code, no
> "while we're here" work. It's the evidence that the proposal matches the roadmap's V8-A2 scope.

## Deliverable

- **Proposal document:** `docs/lanes/V8-A2-proposal.md` — Preview Bay + Bug Collector, scoped to Roadmap V8.11
  §16 (Preview Bay §4.5 / §4.5.1; Bug Collector §4.7).
- **PR:** `#B4PR` · **merge SHA:** `B4SHA` (stamped on merge) · CI: green (docs-only).

## Scope match check (proposal ↔ Roadmap V8-A2)

| Roadmap V8-A2 item | In the proposal? |
|--------------------|------------------|
| Preview Bay: Start/Stop/Restart/Refresh/Clear-cache/Open-fullscreen/Report-Problem/Read-Aloud [V8-A2] | ✅ listed as in-scope |
| Required preview labels + No-Naked-Localhost + preview-failure C7 | ✅ |
| Preview Bay isolation (§4.5.1, untrusted app) | ✅ |
| Approve/Reject/Defer = V8-B+ (view-only/absent in V8-A2) | ✅ listed as non-goal |
| Bug Collector: Report Problem → screenshot+context → mark/note/voice → auto data-class → store in `.foundergate/bugs` | ✅ |
| Bug Collector Playwright V8-A2 smoke (bug-screen render) | ✅ |
| Worker fix / CTO triage / resolved card / anti-repeat = V8-B (captures only in V8-A2) | ✅ listed as non-goal |
| Reset Test Data / Record Witness = V8-B+/gated; no live path | ✅ listed as non-goal |

## Honest posture

Proposal only. No V8-A2 code. Law 69 governs: V8-A1 remains the only active build contract until the founder
approves V8-A2 start at **G4**. Nothing here authorizes implementation.
