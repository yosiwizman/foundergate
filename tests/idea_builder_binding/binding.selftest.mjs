// Request→Template binding selftest (zero-dep, deterministic). Proves the registry binds requests to the
// correct template, refuses unsupported/held requests, and NEVER lets a calculator request reach the planner.
import { classifyRequest, requestHash, TEMPLATES } from '../../src/idea_builder/template-registry.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL: ' + m); } };

// 1: calculator request → calculator template
const calc = classifyRequest('Build a simple calculator app.');
ok(calc.kind === 'SUPPORTED' && calc.template_id === 'calculator', 'calculator request → calculator template');
// 2: FALSE_GREEN_REGRESSION — calculator must NOT bind to task planner
ok(calc.template_id !== 'task_planner' && !/wave9_appointment_task_planner/.test(TEMPLATES[calc.template_id].preview_url),
  'FALSE_GREEN_REGRESSION: calculator request must NOT select/preview the task planner');
// 3: task planner request → task_planner template
const tp = classifyRequest('Build a simple appointment/task planner.');
ok(tp.kind === 'SUPPORTED' && tp.template_id === 'task_planner', 'task-planner request → task_planner template');
// 4: todo phrasing still → task_planner
ok(classifyRequest('a todo list app').template_id === 'task_planner', '"todo list" → task_planner');
// 5: unsupported (CRM) → UNSUPPORTED_LOCAL_TEMPLATE, no template
const crm = classifyRequest('Build a CRM for my sales team.');
ok(crm.kind === 'UNSUPPORTED_LOCAL_TEMPLATE' && crm.template_id === null, 'CRM → UNSUPPORTED_LOCAL_TEMPLATE (no template)');
// 6: real-world integration refused
ok(classifyRequest('connect my real google calendar').kind === 'UNSUPPORTED_LOCAL_TEMPLATE', 'real calendar → unsupported');
// 7: protected gate held
ok(classifyRequest('deploy the app to production').kind === 'HELD_REQUIRES_FOUNDER_GATE', 'deploy → HELD_REQUIRES_FOUNDER_GATE');
// 8: generic safe-but-unsupported idea is NOT auto-green
ok(classifyRequest('build a social network').kind === 'UNSUPPORTED_LOCAL_TEMPLATE', 'unknown idea → unsupported, not green');
// 9: negated disclaimer does not trigger refuse (task planner "no real calendar")
ok(classifyRequest('a task planner with no real calendar, no account').template_id === 'task_planner', 'negated disclaimer stays task_planner');
// 10: request_hash deterministic + bound to text
ok(requestHash('Build a simple calculator app.') === requestHash('Build a simple calculator app.') &&
   requestHash('a') !== requestHash('b'), 'request_hash deterministic and text-bound');
// 11: request_id derives from hash
ok(calc.request_id === 'req_' + calc.request_hash, 'request_id binds to request_hash');

// ---- Natural-language task_planner matcher correction (founder-blind gap: "to do app") ----
const tp2 = (t) => classifyRequest(t);
// 12: FOUNDER_BLIND_REGRESSION_TO_DO_APP_MUST_BIND_TO_TASK_PLANNER
ok(tp2('build to do app').kind === 'SUPPORTED' && tp2('build to do app').template_id === 'task_planner',
  'FOUNDER_BLIND_REGRESSION_TO_DO_APP_MUST_BIND_TO_TASK_PLANNER');
// 13-16: natural-language variants → task_planner
ok(tp2('build a to-do app').template_id === 'task_planner', '"to-do app" → task_planner');
ok(tp2('make a todo app').template_id === 'task_planner', '"todo app" → task_planner');
ok(tp2('simple task list').template_id === 'task_planner', '"simple task list" → task_planner');
ok(tp2('checklist app').template_id === 'task_planner', '"checklist app" → task_planner');
// 17: real reminders + calendar → HELD/REFUSED, NOT task_planner
{
  const r = tp2('build a real reminders app connected to Google Calendar');
  ok(r.template_id !== 'task_planner' && r.kind !== 'SUPPORTED', 'real reminders + Google Calendar → refused (not task_planner)');
}
// 18: reminder emails to customers → refused
ok(tp2('send reminder emails to customers').kind === 'UNSUPPORTED_LOCAL_TEMPLATE', 'reminder emails to customers → UNSUPPORTED (refused)');
// 19: deploy my todo app → HELD (gate wins over template)
ok(tp2('deploy my todo app').kind === 'HELD_REQUIRES_FOUNDER_GATE', 'deploy my todo app → HELD');
// 20: edit PR #200 for todo app → HELD
ok(tp2('edit PR #200 for this todo app').kind === 'HELD_REQUIRES_FOUNDER_GATE', 'edit PR #200 (todo) → HELD');
// 21: calculator still calculator
ok(tp2('Build a simple calculator app.').template_id === 'calculator', 'calculator still → calculator');
// 22: unrelated idea still unsupported (no false-green)
ok(tp2('build a social network platform').kind === 'UNSUPPORTED_LOCAL_TEMPLATE', 'unrelated idea → UNSUPPORTED (no false-green)');

const total = pass + fail;
if (fail === 0) { console.log(`ALL GREEN: ${pass}/${total} binding selftest(s) passed.`); process.exit(0); }
else { console.error(`RED: ${fail}/${total} failed.`); process.exit(1); }
