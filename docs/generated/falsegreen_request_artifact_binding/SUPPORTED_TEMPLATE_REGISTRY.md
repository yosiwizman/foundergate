# Lane B — Supported Template Registry
Deterministic, local, synthetic. Source: `src/idea_builder/template-registry.mjs`.

## Supported templates
| template_id | request patterns (examples) | generated app | tests |
| --- | --- | --- | --- |
| `task_planner` | task planner, appointment planner, appointment, todo, tasks, planner | `tests/generated_apps/wave9_appointment_task_planner` | add / complete / filter (planner.selftest → PASS 13/13) |
| `calculator` | calculator, arithmetic, calculate | `tests/generated_apps/calculator` | add / sub / mul / div / clear / invalid-expression (calculator.selftest → PASS 12/12) |

Match order: **calculator before task_planner** — a "calculator" request can never fall through to the planner.

## Unsupported / held (NO DONE/PASS, NO preview)
- **UNSUPPORTED_LOCAL_TEMPLATE:** CRM, email sender, customer-data app, private-repo app, real calendar,
  real-account/integration app, or any idea matching no supported template.
- **HELD_REQUIRES_FOUNDER_GATE:** deploy / host / go-live, merge, edit PR #200.

Unsupported and held requests are refused honestly and never present a green build or a preview.
