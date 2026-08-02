# Lane E — Persistent Local Run History
Run history persists in the browser via localStorage (clearly labeled local/browser-only, opt-in,
clearable). Records: source label, objective, adapter/result, decision (never SHIP), exported y/n,
status. Does NOT store customer data, private repo content, raw logs, secrets, or full SHA. A
"Clear local history" button empties it. Verified (E2E): persists across reload; Clear empties it;
25-row soak persistence.
