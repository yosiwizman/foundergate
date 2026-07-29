# PHASE 5 — Launcher Build Report

built_utc: 2026-07-29T16:41Z

## Deliverable
- `~/Desktop/Start_FounderGate_RunGrid_Autonomy.command` (installed, chmod +x)
- Source of truth: `launchers/Start_FounderGate_RunGrid_Autonomy.command` in this package.

## What it does (one founder action = double-click)
1. Verifies required tools (git, gh, tmux, node, npm, zip, unzip, shasum, python3, pbcopy, osascript, caffeinate).
2. Verifies the canonical repo exists (notes, does not block on, an uncommitted tree — work uses isolated worktrees).
3. Refuses to start if a **competing active operation lock** exists (STOP, no changes).
4. Verifies gh auth and the pinned baseline **read-only**: PR #201 head `a6a1595`, PR #200 head `7d865fe`,
   origin/main `4f2394a`. Any drift → STOP.
5. Creates a timestamped run workspace `~/Desktop/FounderGate_RunGrid_Wave_<ts>/`.
6. Ensures tmux sessions fg-build/fg-control/fg-review (creates if absent; **never kills** existing).
7. Creates an evidence ledger + a read-only monitor `.command` and opens it.
8. Stages the Terminal-0 supervisor prompt with MACHINE/WHEN/paths filled and copies it to the clipboard.
9. Prints the single next action (paste into the visible Claude window).

## Safety properties
- Performs **NO** merge, mark-ready, deploy, provider activation, key enrollment, PR mutation, main push,
  AKIOR, or M1 — it only reads Git/GitHub state and stages a prompt.
- Fails safe (`fail()` → STOP with a clear reason) on any missing tool, competing lock, auth failure, or baseline drift.
- The founder no longer opens eight windows by hand or relays prompts between routine gates.

## Validation
- `bash -n` on the launcher: **OK**.
- `bash -n` on the embedded read-only monitor heredoc: **OK**.
- Installed copy on Desktop is identical to the packaged source and executable.
