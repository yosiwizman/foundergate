# Matcher Correction Report (narrow, template-matcher only)
**Scope:** `src/idea_builder/template-registry.mjs` only (plus tests). No new app type, no AI generation, no UI
simplification, no unrelated change.

## What changed
- Broadened `task_planner` patterns to founder-natural local-list wording: `to do` (spaced), `to-do`, `todo`,
  `to do/todo list`, `task list`, `tasks`, `checklist`, `simple list`, `appointment list`, `planner`,
  `appointment`, `task planner`.
- Hardened REFUSE so unsafe intent stays held/refused **before** any template match: added
  `real reminders`, `reminder emails`/`email reminders`, `push notification`, `sms`/`text message`, and
  `emails to customers/users/people/clients`. Existing guards (calendar/google/account, billing, production
  data, security/SaaS, private repo, CRM) unchanged. GATE (deploy/merge/PR#200) unchanged.

## Why this is safe (no false-green risk)
`classifyRequest` evaluates GATE → REFUSE → template match → unsupported-default, in that order. Because
REFUSE/GATE run BEFORE the template match, broadening task_planner patterns cannot let an unsafe request
(reminders+calendar, emailing customers, deploy, PR#200) bind to task_planner — those are caught first and
returned as HELD/UNSUPPORTED with no DONE/PASS and no preview.

## Verified mapping (deterministic classifier)
| Request | Result |
| --- | --- |
| build to do app | task_planner ✅ |
| build a to-do app / make a todo app | task_planner ✅ |
| simple task list / checklist app | task_planner ✅ |
| build a real reminders app connected to Google Calendar | UNSUPPORTED (refused) 🚫 |
| send reminder emails to customers | UNSUPPORTED (refused) 🚫 |
| deploy my todo app | HELD_REQUIRES_FOUNDER_GATE ⛔ |
| edit PR #200 for this todo app | HELD_REQUIRES_FOUNDER_GATE ⛔ |
| Build a simple calculator app. | calculator ✅ |
| build a social network platform | UNSUPPORTED (no false-green) 🚫 |

Preview for task_planner still derives from the bound task_planner manifest (not a hardcoded link).
