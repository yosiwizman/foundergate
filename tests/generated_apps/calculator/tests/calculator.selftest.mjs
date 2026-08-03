// Calculator selftest (zero-dep, deterministic). Bound to the "calculator" template.
import { add, sub, mul, div, evaluate, press } from '../core.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('FAIL: ' + m); } };

// 1-4: four operations
ok(add(2, 3) === 5, 'addition 2+3=5');
ok(sub(9, 4) === 5, 'subtraction 9-4=5');
ok(mul(6, 7) === 42, 'multiplication 6*7=42');
ok(div(20, 4).ok && div(20, 4).value === 5, 'division 20/4=5');
// 5: division by zero handled
ok(div(1, 0).ok === false && div(1, 0).error === 'DIV_BY_ZERO', 'division by zero → error, not crash');
// 6-8: expression evaluator
ok(evaluate('12+30').ok && evaluate('12+30').value === 42, 'evaluate "12+30"=42');
ok(evaluate('7*8').value === 56, 'evaluate "7*8"=56');
ok(evaluate('10/0').ok === false, 'evaluate "10/0" → error');
// 9: invalid expression handled
ok(evaluate('2++').ok === false && evaluate('2++').error === 'INVALID_EXPRESSION', 'invalid expression → error');
// 10-12: button reducer + clear/reset
let s = { display: '' };
s = press(s, '4'); s = press(s, '+'); s = press(s, '5'); s = press(s, '=');
ok(s.display === '9', 'button flow 4+5= → 9');
s = press(s, 'C');
ok(s.display === '', 'clear/reset → empty');
s = press({ display: '' }, '='); // equals on empty → error, not crash
ok(s.display.startsWith('Error'), 'equals on empty → Error (no crash)');

const total = pass + fail;
if (fail === 0) { console.log(`ALL GREEN: ${pass}/${total} calculator selftest(s) passed.`); process.exit(0); }
else { console.error(`RED: ${fail}/${total} failed.`); process.exit(1); }
