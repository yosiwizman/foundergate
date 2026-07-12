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
| The round-1 adversarial checker report is committed verbatim as evidence | `docs/assembly-evidence/dispatcher/checker-report.md` | `docs/assembly-evidence/dispatcher/checker-report.md` @ `4a03eb8a847c84cc8f2c5b635e560d6781e4e2be` |
| The five rules were upgraded from prose to mechanical requirements, closing the seven checker gaps | `docs/lanes/dispatcher-proposal.md` | `docs/assembly-evidence/dispatcher/checker-report.md` @ `4a03eb8a847c84cc8f2c5b635e560d6781e4e2be` |

## Round-1 adversarial check (docs-only response)

An independent checker returned §28 authority integrity **CLEAN** but the DRAFT design **NOT-CLEAN**:
the five rules were prose assertions with no enforcement mechanism (seven gaps, findings one through
five must-fix-before-authorization). Per the DRAFT posture, the response was to make the rules
mechanical and record the gaps — not to abandon them. The revised proposal now: requires a verifiable
caller identity and disjoint role credentials on input; accepts a returning result only if attested by
the routed-to role's identity; binds the founder signature to a bundle path @ SHA plus a one-time
nonce and forbids forwarding or replay; names a build-lane validator/CI guard for checker-not-builder;
routes dispatcher-self-modification to the founder via a bootstrap path; and requires an immutable
routing log with low-confidence items held for the founder. Runtime attestation is recorded as future
build-lane hardening. All findings are dispositioned in the proposal's open-gaps section.

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
