// Wave 9 generated app — deterministic self-test (zero-dep, no network, no install).
import { createStore, addItem, listItems, completeItem, filterItems, SYNTHETIC_ONLY, CAPABILITIES } from '../core.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error('FAIL: ' + m); } };

// create task/appointment
let s = createStore();
let r = addItem(s, 'Dentist', 'Mon 09:00'); ok(r.ok && r.item.id === 1 && r.item.done === false, 'add item');
s = r.store;
r = addItem(s, 'Groceries'); s = r.store; ok(r.ok && r.item.id === 2, 'add second item');

// list items
ok(listItems(s).length === 2, 'list items = 2');

// complete item
r = completeItem(s, 1); s = r.store; ok(r.ok && listItems(s).find(i => i.id === 1).done === true, 'complete item 1');
ok(!completeItem(s, 999).ok, 'complete unknown id rejected');

// filter active / completed
ok(filterItems(s, 'active').length === 1, 'filter active = 1');
ok(filterItems(s, 'completed').length === 1, 'filter completed = 1');
ok(filterItems(s, 'all').length === 2, 'filter all = 2');

// reject empty item
ok(!addItem(s, '   ').ok && addItem(s, '   ').error === 'EMPTY_ITEM_REJECTED', 'reject empty item');
ok(!addItem(s, null).ok, 'reject null item');

// synthetic-only / no real-world capabilities
ok(SYNTHETIC_ONLY === true, 'synthetic-only flag');
ok(CAPABILITIES.network === false && CAPABILITIES.account === false && CAPABILITIES.calendar === false && CAPABILITIES.deploy === false, 'no network/account/calendar/deploy capabilities');

// deterministic: same inputs -> same ids (no Date.now/Math.random)
const s2 = addItem(createStore(), 'Dentist', 'Mon 09:00');
ok(s2.item.id === 1 && s2.item.title === 'Dentist', 'deterministic ids');

const total = pass + fail;
if (fail === 0) { console.log(`ALL GREEN: ${pass}/${total} planner self-test(s) passed.`); process.exit(0); }
else { console.error(`RED: ${fail}/${total} failed.`); process.exit(1); }
