# Independent Adversarial Checker Report — File Cabinet secret-hiding (A3-FC)

> **Plain English.** Per the sensitivity ruling, an independent adversarial checker tried to make a secret leak
> through the File Cabinet classification/access core before merge. Round 1 it **succeeded** — it found two
> confirmed HIGH content-leaks. All findings were fixed in-scope and locked by tests; round 2 confirms the fixes.

## Round 1 — verdict: **FAIL** (two confirmed content-leaks)

| # | Finding (severity) | Attack the checker proved | Fix | Locked by test |
|---|--------------------|---------------------------|-----|----------------|
| 1 | **HIGH** — broken `**` glob | `{match:"analytics/**",class:SECRET}` did not escalate nested `analytics/pii/users.js` → it stayed viewable; fake SSN data extracted | `globToRe` rewritten single-pass (`**`→`.*` cross-slash, `*`→`[^/]*`, `?`→`[^/]`) | `no-secret-leak.selftest`: "nested ** escalation actually escalates" |
| 2 | **HIGH** — no realpath (symlink) | `README.md → .env` returned the live token via preview AND download; `roadmap.md → /etc/hosts` leaked host file | `gated()` resolves `realpathSync`, requires the real path inside the project, and **re-classifies by the real target** (most-restrictive of name/target class wins) | `no-secret-leak.selftest`: "safe-named symlink to a secret is BLOCKED" + "symlink pointing OUTSIDE the project is BLOCKED" |
| 3 | MEDIUM — case/ext misclassification | `.ENV`, `.env ` (trailing space), `.p8/.ppk/.jks` → UNKNOWN not SECRET (blocked today, brittle) | `isSecretPath` lowercases + trims, adds extensions/`.pgpass`/`passwd`, excludes `.pub` | `classify.selftest`: "case/extension/whitespace secret variants → SECRET" |
| 4 | LOW — uncaught throw | a viewable-classifying `../` path crashed the caller instead of a blocked object | `gated()` wrapped in try/catch → fail-closed blocked object | `no-secret-leak.selftest`: "traversal path returns a blocked object (no throw)" |

Confirmed-safe in round 1: default is UNKNOWN/blocked (fail-safe); rules are escalate-only (never loosen); reason
strings never echo content; lexical `..` containment correct.

## Round 2 — re-review of the fixes

See `checker-report-round2.md` (same independent checker re-reviewed the diff, tried to defeat the realpath
re-classification and the new glob). All findings must be **CLOSED** before merge.

## Evidence
Post-fix self-tests green: `V8A3-CLASSIFY-SELFTEST: PASS (11)`, `V8A3-NO-SECRET-LEAK-PROOF: PASS (9)`; full suite
**28/28**. This is the sensitive FC-CLASS path; it was built by one builder and adversarially reviewed by one
independent checker (report = evidence) before merge, per the ruling.
