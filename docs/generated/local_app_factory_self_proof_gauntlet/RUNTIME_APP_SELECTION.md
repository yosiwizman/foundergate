# Runtime App Selection (recorded BEFORE build)
- Seed (timestamp-derived): `20260803T0835ET`
- Selection method: deterministic LCG shuffle of the safe local archetype pool, first 4.
- Pool: habit_tracker, budget_tracker, inventory_list, flashcards, notes_board, score_keeper
- Excluded by rule: calculator, task_planner (appointment/task planner)
- **Selected (4):** score_keeper, budget_tracker, inventory_list, notes_board

This selection is mechanically reproducible: same seed + same pool → same 4 apps.
