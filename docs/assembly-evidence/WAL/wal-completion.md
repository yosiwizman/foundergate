# WRITTEN-AUTHORITY LAW (WAL) — completion report

**Bundle:** WAL (process-only, no product code). **Authority:** `docs/lanes/POST-ACCEPTANCE-QUEUE.md` @ `5e7fef3`
(the queued WAL entry, committed and resolving on disk). First bundle after Run 7's results were committed, as the
founder directed.

This report itself carries the **AUTHORITY column** the law mandates; every authority below resolves on disk (path
exists + SHA resolves under CI full-history checkout).

## Disk-proof completion table
| Lane | What landed | Evidence (file) | Authority (path @ SHA) |
|---|---|---|---|
| CI full history | `fetch-depth: 0` on the selftests checkout so every cited PR/SHA/authority resolves in CI | `.github/workflows/selftests.yml` | `docs/lanes/POST-ACCEPTANCE-QUEUE.md` @ `5e7fef3` |
| Assembly Manual section | §28 THE WRITTEN-AUTHORITY LAW (authority must resolve on disk before the work it governs) | `docs/ASSEMBLY_MANUAL.md` | `docs/lanes/POST-ACCEPTANCE-QUEUE.md` @ `5e7fef3` |
| Ledger AUTHORITY column + retroactive sweep | Every Evidence-Ledger bundle row now carries `Authority (path @ SHA)` — a resolving artifact, or `AUTHORITY-UNRECORDED (historical)` for chat-only authority (gap visible forever) | `docs/assembly-evidence/EVIDENCE_LEDGER.md` | `docs/lanes/POST-ACCEPTANCE-QUEUE.md` @ `5e7fef3` |
| Guard (i) — evidence-integrity | Check 5: each ledger row's AUTHORITY path must exist + SHA resolve, else CI-red | `src/tools/evidence-integrity.selftest.mjs` | `docs/lanes/POST-ACCEPTANCE-QUEUE.md` @ `5e7fef3` |
| Guard (ii) — completion-report AUTHORITY | `validateAuthorityCells` — a report whose authority path/SHA does not resolve is INVALID like a phantom SHA | `src/tools/report-provenance.mjs` + `report-provenance.selftest.mjs` | `docs/lanes/POST-ACCEPTANCE-QUEUE.md` @ `5e7fef3` |

## Retroactive sweep result
All ~35 existing Evidence-Ledger rows were audited and stamped: rows with a committed governing artifact cite it
(roadmap, V8-A1..A4 lane packets/proposals, V8-A2/A3/B contracts, the FD design spec, stranger-run records, the
Run-6 diagnosis); six chat-only-authority rows (Copy-polish, A3-PARALLEL, VA-PREP+WIDE, VA-HONESTY-RESTORE,
VA-PREACCEPT-AUDIT, VA-FIXTURE-HARDEN) are honestly marked `AUTHORITY-UNRECORDED (historical)`. The FD design
package — the artifact that seeded this law — is already committed at `docs/lanes/founder-design-v2/`.

## Verification
- Suite green; `evidence-integrity` check 5 validates every ledger AUTHORITY; `report-provenance` proves the
  AUTHORITY column (resolvable = valid, non-resolvable = INVALID, historical = accepted).
- The WAL bundle's own merge PR + SHA are stamped into the Evidence Ledger WAL row immediately after this PR merges
  (living-ledger maintenance by the merge sheriff), with the same AUTHORITY.
