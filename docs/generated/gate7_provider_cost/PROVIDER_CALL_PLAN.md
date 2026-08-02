# Provider Call Plan
- Calls planned: EXACTLY 1 (max 2 permitted; second only if first < $0.70 and needed).
- Model: claude-haiku-4-5-20251001 (cheapest — minimize spend).
- Prompt: provider/PROVIDER_PROMPT_EXACT.txt (bounded JSON assessment of synthetic/self-owned evidence).
- Provider-enforced cap: --max-budget-usd 0.50. Founder hard ceiling: $1.00.
- Expected max spend: << $0.05 for a haiku call of ~150 input words + small JSON output. Planned worst case bounded by the $0.50 CLI cap.
- Cost capture: total_cost_usd from --output-format json. If missing -> HOLD_COST_CAPTURE_FAILED, no second call.
