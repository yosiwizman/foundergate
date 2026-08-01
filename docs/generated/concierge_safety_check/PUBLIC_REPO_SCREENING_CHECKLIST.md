# Public Repo Screening Checklist (per candidate repo)
Before accepting a repo for a run, confirm:
- [ ] Repo is **public** (open it in a private/incognito window — does it load without login?).
- [ ] No obvious **secrets** (search for `.env`, `secret`, `token`, `key`, `password` — and run the secret scan).
- [ ] No **customer/private/production data** (no PII, DB dumps, prod configs, real user records).
- [ ] License permits you to run and modify a local copy.
- [ ] Objective touches only **non-sensitive, bounded** paths.
- [ ] You are NOT expected to push, deploy, or merge into it.

Any unchecked box → **decline the repo** (offer to try a different, safer one).
