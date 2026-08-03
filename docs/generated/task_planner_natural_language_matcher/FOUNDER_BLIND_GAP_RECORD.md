# Founder-Blind Gap Record (preserved)
Distinct from the earlier false-green: the false-green was fixed previously; THIS run fixes a natural-language
product gap only.

- Founder-blind test (2026-08-03): founder typed `build to do app`.
- Result BEFORE this run: **UNSUPPORTED_LOCAL_TEMPLATE** — no DONE, no PASS, no preview (honest, NOT false-green).
- Root cause: the task_planner matcher had `/\bto-?do\b/` (matches "todo"/"to-do") but not "to do" (spaced),
  and no other planner pattern matched "build to do app".
- Prior classification: PRODUCT_GAP_CONFIRMED · NO_FALSE_GREEN · GATE_8_BLOCKED (source: founder-blind retest
  packet FounderGate_FounderBlind_Retest_Packet_20260803T0715ET).
- Gate 8 remains BLOCKED. Founder-blind acceptance has NOT yet happened after this correction.
