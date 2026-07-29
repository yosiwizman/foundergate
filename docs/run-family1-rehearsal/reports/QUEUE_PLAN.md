# PHASE 3 — Deterministic Rehearsal Queue Plan
8 fixed jobs (evidence/queue/queue.json), executed in order, each writing start/end/verdict + recovery state:
1 worktree lifecycle · 2 builder handoff (harmless additive fixture, no provider) · 3 machine verifier ·
4 checker proof · 5 gate advisor proof · 6 recovery · 7 duplicate-resume refusal · 8 budget/deadline.
No real provider. No merge. No PR mutation. Deterministic (fixed inputs; UTC stamps recorded, not seeded into logic).
