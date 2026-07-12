# FounderGate — HARNESS STRESS LOG (breakage treated as DATA)

**Purpose (AKIOR-HARVEST #6):** a deliberate redline log of where FounderGate's OWN build/CI/evidence/checker harness
wedges, false-positives, saturates, or nearly leaks — under rapid parallel work. Breakage is DATA, not shame: each
entry names the defect class, what caught it, and the permanent fix. **Authority:**
`docs/lanes/authority/akior-harness-harvest-report.md` (#6).

## Adopted doctrine (from the AKIOR survey)
- **Never `git add -A`.** Secret-shaped scratch files can dodge gitignore (AKIOR B4: a `*.copy` file). FounderGate
  now gitignores `*.copy` / `cycle-*` (#9) AND every commit is secret-scanned; stage explicit paths, not `-A`.
  (This session already hit the class twice — see S3/S5 — via `git add -A` sweeping in uncommitted run sheets.)
- **Hermetic mocks mask shell/CLI-contract bugs; live drives expose them.** A test can be green while the real
  shell/CLI/filesystem contract is broken. FounderGate's version: passing *unit* self-tests give false confidence
  about *isolation/geometry* — an adversarial checker or a live drive is what catches it (see S2, S4).
- **CI-concurrency coalescing.** Rapid pushes serialize/saturate the runner. Added a `concurrency` group with
  `cancel-in-progress` to `selftests.yml` (#9).
- **Worktree hygiene.** Isolated git worktrees accumulate; prune stale ones (this session used a worktree for a
  ledger stamp — removed after; `.claude/worktrees/` gitignored).
- **Wide read-only auditor fan-out (#10).** Scale the one-checker doctrine to N INDEPENDENT read-only auditors,
  blind to each other, then synthesize — many perspectives without a second writer. Keep it READ-ONLY. Watch the
  subagent concurrency cap (AKIOR probed ~6-wide sustained cleanly; untested far above 6).

## FounderGate stress events observed (real data, this session)
| ID | Defect class | What caught it | Fix (permanent) |
|----|--------------|----------------|------------------|
| S1 | **False confidence from passing tests** — VB0 had 26 green isolation self-tests, yet a 32-bit `projectId` hash was attacker-collidable (a distinct project silently dropped, wrong root activated), plus leaf/intermediate symlink + case-insensitive nesting escapes | the **independent adversarial checker** (builder ≠ checker), 3 rounds — R1 found 1 HIGH + 2 MED + 1 LOW; R2 caught that the first fixes were incomplete | crypto id on a symlink+case-canonicalized key; realpath containment; load-time id↔root verification; each locked by a new committed proof |
| S2 | **Over-broad heuristic false-positive** — the report-provenance claim detector flagged `**bold**` prose and any table row containing a lane token (`M1`, `V8-B`) as an un-provenanced claim | dogfooding the validator on the completion reports | require a real bullet (`- ` with whitespace) / table row; stamp lane rows with resolving PR+SHA |
| S3 | **Committed-fixture corruption via `FG_PROJECT_ROOT` pointed at the real fixture** (a live preview wrote `run_state.json`) | the **fixture-pristine guard** (content-hash manifest) | restore + re-bless; manual viewing uses a throwaway copy; servers default to a throwaway copy (VA-FIXTURE-HARDEN) |
| S4 | **Hex-vs-decimal SHA ambiguity** — an all-digit 7-char merge-SHA prefix (`8211993`) was skipped by the SHA detector (looks like a decimal), so a completion-report authority cell read as "no SHA" | dogfooding report-provenance | cite the FULL 40-char SHA in authority/lane cells |
| S5 | **`git add -A` sweep** repeatedly staged uncommitted stranger-run sheets (run-5) that must NOT be committed until dictated | pre-commit `git status` review | stage explicit paths only; never `-A` |

**Standing lesson:** every one of these was invisible to the confirmation-oriented tests and visible only to an
adversarial or dogfooding pass. Keep the independent-checker + dogfood-the-guard practices; treat a green suite as
necessary, never sufficient.
