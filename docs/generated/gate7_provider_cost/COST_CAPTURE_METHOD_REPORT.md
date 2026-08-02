# Cost Capture Method Report
Method: `claude -p "<prompt>" --model claude-haiku-4-5-20251001 --max-budget-usd 0.50 --output-format json`.
The JSON result includes `total_cost_usd` (exact USD for the call) and `usage` (input/output/cache tokens) and model identity. This is exact per-call cost capture. Belt-and-suspenders: `--max-budget-usd 0.50` hard-caps provider spend at half the founder ceiling for the single call.
