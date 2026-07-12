# LANE A — Dispatcher-Design proposal (DRAFT) — completion report

**Lane:** LANE A (docs-only, DISPATCHER-DESIGN). **Status of the deliverable:** a DRAFT design
proposal — not authorized to build. **Authority:** `docs/lanes/authority/separation-of-duties.md` @
`7098261b4a019adad4e3c304a4d3be9a89c47097` (committed verbatim before it backs any claim, per §28).

This report carries the **AUTHORITY column** the Written-Authority Law mandates. Every authority below
resolves on disk (the path exists and the 40-character commit SHA resolves under `git cat-file`). All
SHAs are full 40-character hex, per the report-provenance rule against short or all-decimal tokens.

## Disk-proof completion table

| Claim | Evidence (file) | Authority (path @ commit) |
|---|---|---|
| A DRAFT dispatcher proposal was written, with the DRAFT status line at the top | `docs/lanes/dispatcher-proposal.md` | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| Rule one — the dispatcher gets its own lane, never folded into the builder or the auditor | `docs/lanes/dispatcher-proposal.md` | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| Rule two — the builder role and the auditor role are separate identities and authorities | `docs/lanes/dispatcher-proposal.md` | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| Rule three — audit work routes to the auditor, build work to the builder, and the two never cross | `docs/lanes/dispatcher-proposal.md` | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| Rule four — gate signatures are never auto-issued; only the founder signs | `docs/lanes/dispatcher-proposal.md` | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| Rule five — the dispatcher is a sensitive surface, one builder plus one independent checker | `docs/lanes/dispatcher-proposal.md` | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| A routing table maps each work class to exactly one destination, one-way | `docs/lanes/dispatcher-proposal.md` | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| The separation-of-duties principle is captured verbatim as a committed authority | `docs/lanes/authority/separation-of-duties.md` | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |
| The phantom lesson (from Assembly Manual and the harness stress log) is captured verbatim | `docs/lanes/authority/separation-of-duties.md` | `docs/lanes/authority/separation-of-duties.md` @ `7098261b4a019adad4e3c304a4d3be9a89c47097` |

## What this lane did NOT touch

- No product code, no soak lane, no file outside `docs/`.
- The shared Evidence Ledger and Founder-Gate Ledger were not edited — those are stamped
  post-merge by the merge sheriff. All authority citations stay inside this lane's files.
- Repository visibility, license, and collaborators were not changed; the repo stays private.

## Verification

- Secret-scanned the staged diff before each commit — no keys or tokens.
- `npm test` was run from the worktree; the full self-test suite stays green with these new docs
  (including the report-provenance and evidence-integrity self-tests). Pass count recorded in the PR.
- The report-provenance validator was run against this report and the proposal; every AUTHORITY
  cell resolves (path exists and the 40-character commit SHA resolves).

## Note on the DRAFT status

The proposal is a DRAFT design document. It is **not** authorized to build. Any dispatcher build
would be its own gated, evidence-first lane under one builder and one independent adversarial checker,
and this sensitive lane also gets an independent checker before any merge.
