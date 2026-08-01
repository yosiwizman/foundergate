// FounderGate Demo Tasks — task-ledger
// A tiny, pure, local-only module for tracking task status + attaching evidence notes.
// No network, no secrets, no auth, no database, no customer data. Deterministic.

export const STATUSES = ['todo', 'doing', 'blocked', 'done'];

export function createLedger() {
  return { tasks: [], seq: 0 };
}

export function addTask(ledger, title, { status = 'todo' } = {}) {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('task title must be a non-empty string');
  }
  if (!STATUSES.includes(status)) {
    throw new Error(`invalid status: ${status}`);
  }
  const id = ++ledger.seq;
  ledger.tasks.push({ id, title: title.trim(), status, notes: [] });
  return id;
}

export function findTask(ledger, id) {
  return ledger.tasks.find(t => t.id === id) || null;
}

export function setStatus(ledger, id, status) {
  if (!STATUSES.includes(status)) throw new Error(`invalid status: ${status}`);
  const t = findTask(ledger, id);
  if (!t) throw new Error(`no task with id ${id}`);
  t.status = status;
  return t;
}

export function addEvidenceNote(ledger, id, note) {
  if (typeof note !== 'string' || note.trim() === '') {
    throw new Error('evidence note must be a non-empty string');
  }
  const t = findTask(ledger, id);
  if (!t) throw new Error(`no task with id ${id}`);
  t.notes.push(note.trim());
  return t.notes.length;
}

export function summarize(ledger) {
  const counts = Object.fromEntries(STATUSES.map(s => [s, 0]));
  for (const t of ledger.tasks) counts[t.status]++;
  const total = ledger.tasks.length;
  const done = counts.done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, counts, donePercent: pct };
}

// Honest decision discipline: never returns "SHIP". Mirrors FounderGate's honesty law.
export function decision(ledger) {
  const s = summarize(ledger);
  if (s.total === 0) return 'INSUFFICIENT';
  if (s.counts.blocked > 0) return 'DO_NOT_SHIP';
  if (s.donePercent === 100) return 'ALL_DONE_LOCAL_DEMO';   // not "SHIP" — local demo only
  return 'IN_PROGRESS';
}

export function toJSON(ledger) {
  return JSON.stringify({ tasks: ledger.tasks, summary: summarize(ledger), decision: decision(ledger) }, null, 2);
}

export function fromData(data) {
  const ledger = createLedger();
  for (const row of (data.tasks || [])) {
    const id = addTask(ledger, row.title, { status: row.status || 'todo' });
    for (const n of (row.notes || [])) addEvidenceNote(ledger, id, n);
  }
  return ledger;
}
