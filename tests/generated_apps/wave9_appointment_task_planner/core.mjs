// Wave 9 generated app — Appointment / Task Planner core (SYNTHETIC, LOCAL-ONLY).
// Pure, zero-dependency logic shared by the browser app and the node self-test.
// No network, no real calendar, no account, no storage side effects (state is passed in/out).

export function createStore(seed = []) {
  // deterministic ids from a counter kept in the store (no Date.now/Math.random)
  return { items: seed.map((s, i) => ({ id: i + 1, title: String(s.title || s), when: s.when || '', done: !!s.done })), _next: seed.length + 1 };
}

export function addItem(store, title, when = '') {
  const t = String(title == null ? '' : title).trim();
  if (t === '') return { ok: false, error: 'EMPTY_ITEM_REJECTED', store };       // reject empty
  const item = { id: store._next, title: t, when: String(when || '').trim(), done: false };
  const next = { items: [...store.items, item], _next: store._next + 1 };
  return { ok: true, item, store: next };
}

export function listItems(store) { return store.items.slice(); }

export function completeItem(store, id) {
  let found = false;
  const items = store.items.map(it => { if (it.id === id) { found = true; return { ...it, done: true }; } return it; });
  return { ok: found, error: found ? null : 'ITEM_NOT_FOUND', store: { ...store, items } };
}

export function filterItems(store, mode = 'all') {
  const m = String(mode).toLowerCase();
  if (m === 'active') return store.items.filter(it => !it.done);
  if (m === 'completed' || m === 'done') return store.items.filter(it => it.done);
  return store.items.slice();
}

// synthetic-only guard: this module never touches network/account/calendar/fs.
export const SYNTHETIC_ONLY = true;
export const CAPABILITIES = { network: false, account: false, calendar: false, storage: false, deploy: false };
