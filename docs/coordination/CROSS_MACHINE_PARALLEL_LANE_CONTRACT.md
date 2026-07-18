# Cross-Machine Parallel Lane Contract (M1 qualification ⟂ Pro sandbox development)

**Status:** DESIGN · Phase 5 · no runtime. **This contract supersedes the prior "the Pro becomes globally read-only while an M1 soak runs" rule.** The correct isolation is **cross-machine lane + ref isolation**, not a global Pro freeze. The M1 rerun is **NOT started** by this phase.

## Why the global freeze was overbroad
A Pro commit/push to an **isolated branch** does not, and cannot, move the M1's **detached** qualification HEAD: git refs are per-worktree/per-checkout, and a detached HEAD tracks a fixed SHA, not a branch. The M1's freeze integrity depends on *the M1 not moving its own HEAD*, not on the Pro being idle. So the Pro may keep developing on a separate branch, provided the two lanes never share a mutable resource and the Pro cannot trigger M1 automation.

## Domain M1 — Qualification Domain
- **Machine:** Apple M1 qualification host. **Worktree:** dedicated **detached** qualification worktree. **Evaluated SHA:** `b9af1def60009ac9dae69bf519b5e0a2680d4600` (checked out detached, isolated from any branch).
- **Permitted during active run:** write uncommitted run evidence; update local run ledger; update local recovery state; operate the qualification driver; operate `caffeinate`; operate the independent sentinel.
- **Forbidden during active run:** commit · push · fetch · pull · checkout · switch · branch · tag · merge · rebase · reset · stash · ref update · worktree move · worktree removal · force push · evidence commit. (Evidence is committed only **after** driver exit + verdict seal + lease RELEASE — see Case 4.)

## Domain PRO — Sandbox Development Domain
- **Machine:** Apple M4 Pro Mac Mini.
- **Permitted:** a separate worktree; a separate branch; commits to that branch; pushes to that branch; one draft PR; tests scoped to that lane; disk-ledgered evidence.
- **Forbidden:** touching the M1 worktree / evidence directory / evidence branch / evaluated-SHA checkout; merges to `main` during the soak; tags during the soak; force pushes; deleting/renaming soak branches; modifying shared qualification scripts during the soak; triggering M1 automation; accepting or signing VB2.

## Remote-GitHub rule
Pro commits/pushes to an isolated branch **do not alter the M1's detached local HEAD**. While the M1 run is active: `main` must not merge; the M1 must not fetch or pull; the Pro must not modify the M1 evidence branch; **no shared self-hosted runner may execute Pro work on the M1**; no branch protection or automation may rewrite the qualification ref; no force push or deletion of qualification-related refs.

## M1 automation / self-hosted runner finding (Phase 0 audit, this run)
**M1_PUSH_TRIGGER_RISK: NONE.** Repo has **0 registered self-hosted runners**; both workflows (`selftests`, `Copilot`) run on GitHub-hosted infrastructure (`ubuntu-latest`); `selftests` push-trigger is `branches: [main]` only; its `pull_request` trigger also runs on `ubuntu-latest` (GitHub-hosted), never the M1; no local git hooks (only `.sample`), no launchd agents, no cron, and no repo scripts SSH into the M1. Therefore a Pro-branch push or PR **cannot execute any job on the M1**. Design mitigation retained anyway: Pro branch names use the `design/…` / `spike/…` prefixes and never `main`, so even a future self-hosted runner keyed to `main` would not fire on Pro work.

## Collision rule
The lanes **collide** (⇒ **HOLD**) if they share any of: worktree · branch · evidence directory · runtime process · VM · Docker daemon · qualification script under active evaluation · self-hosted runner · merge target · a mutable Git ref required by both lanes. None of these are shared in the designed topology (M1 detached SHA on the M1 host; Pro branch/worktree on the Pro; no self-hosted runner; no main merge during the soak).

## Cross-machine safety cases (verified in Phase 8, this run)
- **Case 1 (Pro branch commit)** must not alter the M1 detached HEAD, the evaluated SHA, any soak evidence branch, or `main`.
- **Case 2 (Pro push)** must not trigger a self-hosted M1 runner / SSH job / launch agent / qualification script.
- **Case 3 (M1 active soak)** allows Pro branch commits/pushes/draft-PR updates; forbids main merges, qualification-script changes, soak-branch changes, tags, force pushes.
- **Case 4 (M1 release)** allows the M1 to create+push its new evidence branch **only after** driver exit + verdict seal + lease RELEASE + final manifest + evidence hash + artifact index.
- **Case 5 (post-run audit)** allows the Pro to independently fetch+audit the new evidence branch **without modifying it**.

## Machine-readable state
Live status is maintained in `docs/coordination/CROSS_MACHINE_PARALLEL_STATE.json` (atomic writes).
