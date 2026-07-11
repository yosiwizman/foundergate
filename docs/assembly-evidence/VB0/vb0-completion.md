# VB0 — Attached Projects Registry (persistent attach) — completion report

**Bundle:** V8-B VB0 (sensitive foundation; read-only, no executor/live path). **Authority:** the LIVE V8-B build
contract `docs/lanes/V8-B-build-contract.md` @ `b442734` (defines VB0 + its cross-project isolation boundary + the
sensitivity ruling), authorized by the founder-signed `G1-B-VB0` gate (Founder Gate Ledger, 2026-07-11). Lane
PR + SHA are stamped into these rows and the Evidence-Ledger row after this PR merges.

## Disk-proof completion table (with AUTHORITY column)
| Lane | What landed | Evidence (file) | Authority (path @ SHA) |
|---|---|---|---|
| Schema-first (Law 53) |(PR #84, SHA `041c80d`) — Registry config schema (paths + metadata only; never content) | `src/v8b0/schemas/attached_projects.schema.json` | `docs/lanes/V8-B-build-contract.md` @ `b442734` |
| Registry module |(PR #84, SHA `041c80d`) — Persistent attach registry: attach/detach/setActive/activeRoot/list; crypto identity keyed on a symlink- + case-canonicalized path; realpath-based `withinProject`; load-time id↔root verification | `src/v8b0/attached-projects.mjs` | `docs/lanes/V8-B-build-contract.md` @ `b442734` |
| Isolation proofs (committed CI) |(PR #84, SHA `041c80d`) — 26 checks across 4 self-tests: no-auto-attach, no-cross-project-bleed (collision, secret-never-persisted, leaf/intermediate symlink, `..`, case aliasing, nesting), honest-UNKNOWN, core+persistence+schema | `src/v8b0/{attached-projects,no-auto-attach,no-cross-project-bleed,honest-unknown}.selftest.mjs` | `docs/lanes/V8-B-build-contract.md` @ `b442734` |
| Independent adversarial checker |(PR #84, SHA `041c80d`) — Builder-independent read-only checker, 3 rounds: R1 found 1 HIGH + 2 MED + 1 LOW; R2 confirmed 2 closed + 2 still-open; R3 ALL FINDINGS CLOSED (mergeable). Reports committed verbatim | `docs/assembly-evidence/VB0/checker-report.md` + `-round2.md` + `-round3.md` | `docs/lanes/V8-B-build-contract.md` @ `b442734` |

## Boundary — verified enforced
- **Never auto-attach:** missing/corrupt registry loads empty; `attach()` is the only add path; `activeRoot()` is UNKNOWN until the founder `setActive()`s; corruption/forgery never auto-activates.
- **Founder chooses active:** no default/auto-select; a rogue/orphan `active_id` → UNKNOWN.
- **No cross-project bleed:** registry stores paths/metadata only (a project secret is never persisted); `activeRoot()` returns only the active root; crypto identity (no hash-collision drop); leaf + intermediate symlink escapes and `..` rejected; nested/case-alias attach rejected.
- **Law-54 honest UNKNOWN:** no active / unknown id / detached / unreadable `.foundergate` → UNKNOWN, never another project, never a guess.

## Notes
- **No founder-facing surface** in this headless foundation → no Visual Self-Review applies; the project-switcher UI is a wide-safe shell that follows.
- **Read-only foundation:** no executor, no runs, no live/provider/send/payment path.
- **Pending before acceptance:** the Terminal Advisor pre-signature audit, to be committed verbatim at
  `docs/assembly-evidence/VB0/advisor-pre-signature-audit.md` (founder's separate read-only lane).

## Verification
Suite 54/54 green (50 prior + 4 VB0 proofs, 26 checks); evidence-integrity (incl. §28 authority) green; all checker
findings CLOSED across 3 rounds. Recommended by the independent checker for merge.
