# Founder Hand-Burden Plan

Yossi Wiseman is post-hand-surgery. Goal: reduce founder actions from "one prompt relay per gate" to
"one action per wave," with zero shell/Git/log work.

## Before RunGrid (observed across L2 → L3 → L4 → PR201)
Each stage ended with a sealed ZIP and required the founder to relay a fresh, long prompt to launch the next
stage — roughly one manual relay per gate (4+ relays across this chain), each a copy/paste keyboard action.

## With RunGrid
- **One founder action per wave:** double-click `~/Desktop/Start_FounderGate_RunGrid_Autonomy.command`.
- The launcher verifies state, stages the Terminal-0 supervisor prompt, and Terminal-0 then advances the
  macro-queue **autonomously** across build → freeze → Checker → Gate Advisor → reconcile → package.
- The founder is **only** interrupted at a TRUE gate (mark-ready / merge / provider / key / deploy /
  main-push / evidence contradiction), where a single plain-English decision is surfaced with a sealed ZIP.

## What the founder never has to do
- No shell commands, no Git operations, no SHA reconciliation, no reading raw logs, no transporting bugs
  between windows, no opening eight terminals by hand, no relaying prompts between routine internal gates.

## Net reduction
Routine per-gate prompt relays → **0**. Founder actions per wave → **1** (launch) **+** decisions **only** at
true gates. All evidence remains on disk and in sealed ZIPs for review at the founder's convenience.
