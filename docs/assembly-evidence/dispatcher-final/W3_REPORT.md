# W3 (docs) — Dispatcher Final-Authority DRAFT · lane report

**STATUS: DRAFT — PENDING INDEPENDENT CHECK.** This lane wrote ONE new design-authority draft that
**supersedes `dispatcher-proposal.md` in authority** by reference (no edit to the proposal or its
checker report). It **authorizes nothing**, makes **no readiness claim**, and claims **no soak-pass**.

## What this lane produced
- `docs/lanes/dispatcher-final-authority.md` — new DRAFT authority doc. Carries forward the proposal's
  five hard rules and F1–F7 dispositions, and adds six mechanical hard rules: signed out-of-band routing
  envelope (HR-1), replay protection via nonce + freshness (HR-2), origin→destination DENY matrix with
  **CTO↔Advisor = DENY** (HR-3), named Key-Custody Authority **dependency** — not granted here (HR-4),
  hardware-backed step-up on the founder gate (HR-5), anchored append-only ledger (HR-6).

## Authority (§28) — full 40-char SHAs, resolvable via `git -C <worktree> rev-parse HEAD:<path>`

| Cited artifact | AUTHORITY (path @ SHA) |
|---|---|
| Superseded proposal (carried forward) | `docs/lanes/dispatcher-proposal.md` @ `3200874d3b4ac72d9a8484b069c5da58d06bf7f2` |
| Round-1 adversarial checker report (F1–F7) | `docs/assembly-evidence/dispatcher/checker-report.md` @ `6436eadf58d218ed59d5291234713b8237c9d292` |
| Separation-of-duties authority | `docs/lanes/authority/separation-of-duties.md` @ `1817cf2ba5aaec2f6fe9c26972e57ba4654ba936` |

## Host discipline
Docs-only. No local test/build/soak/service was run. Read-only git/gh + docs writes only. This draft
must go to an independent adversarial checker before it can back any authorization.
