// Self-contained self-test for task-ledger. Runnable: node tests/task-ledger.selftest.mjs
// Prints "ALL GREEN: N/N" on success; exits non-zero on any failure.
import assert from 'node:assert/strict';
import { createLedger, addTask, removeTask, setStatus, findTask, addEvidenceNote, summarize, decision, toJSON, fromData, STATUSES }
  from '../src/task-ledger.mjs';

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error(`FAIL: ${name}\n  ${e.message}`); } }

t('createLedger is empty', () => { const l = createLedger(); assert.equal(l.tasks.length, 0); assert.equal(l.seq, 0); });
t('addTask returns incrementing ids', () => { const l = createLedger(); assert.equal(addTask(l, 'a'), 1); assert.equal(addTask(l, 'b'), 2); });
t('addTask default status todo', () => { const l = createLedger(); addTask(l, 'a'); assert.equal(l.tasks[0].status, 'todo'); });
t('addTask trims title', () => { const l = createLedger(); addTask(l, '  hi  '); assert.equal(l.tasks[0].title, 'hi'); });
t('addTask rejects empty title', () => { const l = createLedger(); assert.throws(() => addTask(l, '   ')); });
t('addTask rejects non-string title', () => { const l = createLedger(); assert.throws(() => addTask(l, 42)); });
t('addTask rejects invalid status', () => { const l = createLedger(); assert.throws(() => addTask(l, 'a', { status: 'nope' })); });
t('findTask finds and misses', () => { const l = createLedger(); const id = addTask(l, 'a'); assert.ok(findTask(l, id)); assert.equal(findTask(l, 999), null); });
t('setStatus updates', () => { const l = createLedger(); const id = addTask(l, 'a'); setStatus(l, id, 'done'); assert.equal(findTask(l, id).status, 'done'); });
t('setStatus rejects bad status', () => { const l = createLedger(); const id = addTask(l, 'a'); assert.throws(() => setStatus(l, id, 'x')); });
t('setStatus rejects unknown id', () => { const l = createLedger(); assert.throws(() => setStatus(l, 7, 'done')); });
t('addEvidenceNote appends', () => { const l = createLedger(); const id = addTask(l, 'a'); assert.equal(addEvidenceNote(l, id, 'n1'), 1); assert.equal(addEvidenceNote(l, id, 'n2'), 2); });
t('addEvidenceNote rejects empty', () => { const l = createLedger(); const id = addTask(l, 'a'); assert.throws(() => addEvidenceNote(l, id, '  ')); });
t('addEvidenceNote rejects unknown id', () => { const l = createLedger(); assert.throws(() => addEvidenceNote(l, 5, 'n')); });
t('summarize counts', () => { const l = createLedger(); addTask(l, 'a', { status: 'done' }); addTask(l, 'b', { status: 'todo' }); const s = summarize(l); assert.equal(s.total, 2); assert.equal(s.counts.done, 1); assert.equal(s.donePercent, 50); });
t('summarize empty is 0%', () => { assert.equal(summarize(createLedger()).donePercent, 0); });
t('decision INSUFFICIENT when empty', () => { assert.equal(decision(createLedger()), 'INSUFFICIENT'); });
t('decision DO_NOT_SHIP when blocked', () => { const l = createLedger(); addTask(l, 'a', { status: 'blocked' }); assert.equal(decision(l), 'DO_NOT_SHIP'); });
t('decision IN_PROGRESS', () => { const l = createLedger(); addTask(l, 'a', { status: 'doing' }); assert.equal(decision(l), 'IN_PROGRESS'); });
t('decision never returns SHIP when all done', () => { const l = createLedger(); addTask(l, 'a', { status: 'done' }); assert.equal(decision(l), 'ALL_DONE_LOCAL_DEMO'); assert.notEqual(decision(l), 'SHIP'); });
t('STATUSES has four', () => { assert.deepEqual(STATUSES, ['todo','doing','blocked','done']); });
t('toJSON is valid JSON with summary+decision', () => { const l = createLedger(); addTask(l, 'a'); const o = JSON.parse(toJSON(l)); assert.ok(o.summary); assert.ok(o.decision); });
t('fromData round-trips tasks + notes', () => { const l = fromData({ tasks: [{ title: 'a', status: 'done', notes: ['n'] }] }); assert.equal(l.tasks.length, 1); assert.equal(l.tasks[0].notes[0], 'n'); });
t('fromData handles empty', () => { const l = fromData({}); assert.equal(l.tasks.length, 0); });

t('summarize has other bucket = 0 for normal data', () => { const l = createLedger(); addTask(l, 'a', { status: 'done' }); const s = summarize(l); assert.equal(s.counts.other, 0); });
t('summarize counts unknown status under other (defensive)', () => { const l = createLedger(); addTask(l, 'a', { status: 'done' }); l.tasks.push({ id: 99, title: 'raw', status: 'archived', notes: [] }); const s = summarize(l); assert.equal(s.counts.other, 1); });
t('summarize buckets always sum to total', () => { const l = createLedger(); addTask(l, 'a', { status: 'done' }); addTask(l, 'b', { status: 'todo' }); l.tasks.push({ id: 98, title: 'x', status: 'weird', notes: [] }); const s = summarize(l); const sum = s.counts.todo + s.counts.doing + s.counts.blocked + s.counts.done + s.counts.other; assert.equal(sum, s.total); });

t('removeTask removes the requested task', () => { const l = createLedger(); const a = addTask(l, 'a'); const b = addTask(l, 'b'); const r = removeTask(l, a); assert.equal(r.id, a); assert.equal(findTask(l, a), null); assert.ok(findTask(l, b)); assert.equal(l.tasks.length, 1); });
t('removeTask throws on unknown id', () => { const l = createLedger(); addTask(l, 'a'); assert.throws(() => removeTask(l, 999)); });
t('removeTask does not renumber remaining ids', () => { const l = createLedger(); const a = addTask(l, 'a'); const b = addTask(l, 'b'); const c = addTask(l, 'c'); removeTask(l, b); assert.deepEqual(l.tasks.map(t => t.id), [a, c]); assert.equal(addTask(l, 'd'), 4); });

console.log(fail === 0 ? `ALL GREEN: ${pass}/${pass+fail} self-test(s) passed.` : `RED: ${pass}/${pass+fail} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
