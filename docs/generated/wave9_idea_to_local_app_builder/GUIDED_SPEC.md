# Lane B — Guided Spec (plain English)
- **User story:** As a founder, I can add tasks/appointments, see them, complete them, and filter
  active vs completed — all locally with synthetic data.
- **Features:** add item (title + optional when); list items; complete item; filter all/active/completed; reject empty.
- **Non-features (out of scope):** real calendar sync, accounts/login, email/reminders, persistence,
  network, deploy, billing, customer data.
- **Data model:** item { id (deterministic), title, when, done }. Store { items[], _next }.
- **Acceptance tests:** add creates id; list returns all; complete sets done + rejects unknown id;
  filter active/completed/all; empty/null rejected; deterministic ids; no real-world capabilities.
- **UI outline:** input + when + Add; filter select; list with Complete buttons; synthetic banner.
- **Evidence requirements:** idea + spec + build plan + app files + test result + preview + decision + limitations.
- **Limitations:** in-memory only; synthetic only; not production/secure/SaaS/customer/commercial.
- **Blocked real-world items:** deploy, billing, real calendar/account/email, customer data, merge, PR #200.
