# Lane A — Idea Intake Record
- **Idea (default):** "Build a simple local appointment/task planner demo with synthetic data only.
  Add, list, complete, and filter tasks or appointments locally. No real calendar, no account, no
  email, no reminders, no customer data, no deployment."
- **Scope:** local, in-memory, synthetic data; add/list/complete/filter.
- **Forbidden real-world items:** real calendar/account/email/reminders, network, deploy, billing,
  customer data.
- **Synthetic-only boundary:** the generated app has no network/account/calendar/storage/deploy
  capabilities (declared in core.mjs CAPABILITIES = all false).
- **Founder-readable summary:** "A little planner that runs on your machine with made-up data — you
  can add items, mark them done, and filter them. Nothing is sent anywhere."
- **Safety classification:** SAFE_LOCAL_SYNTHETIC. (Unsafe ideas are refused/held — see Lane J.)
