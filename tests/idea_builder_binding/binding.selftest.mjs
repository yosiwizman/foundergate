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

const total = pass + fail;
if (fail === 0) { console.log(`ALL GREEN: ${pass}/${total} binding selftest(s) passed.`); process.exit(0); }
else { console.error(`RED: ${fail}/${total} failed.`); process.exit(1); }
