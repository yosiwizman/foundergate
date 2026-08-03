# Calculator — Limitations (local synthetic demo)
- In-memory only; no storage, no network, no accounts, no backend, no deploy.
- Single binary-expression evaluator (`a OP b`) — not a full expression parser.
- Synthetic/local demo generated from the `calculator` template. **Not** production, not secure, not SaaS,
  not customer-ready, not commercially validated. Decision is never "ship".
- Exists to prove request→artifact binding: a "calculator" request generates and previews THIS app and runs
  THIS app's tests — it does not open the task planner.
