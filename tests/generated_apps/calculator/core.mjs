// FounderGate generated app — Calculator (LOCAL, synthetic, zero-dep, deterministic).
// Pure arithmetic core. No eval, no network, no accounts, no storage. Bound to the "calculator" template.

export function add(a, b) { return a + b; }
export function sub(a, b) { return a - b; }
export function mul(a, b) { return a * b; }
export function div(a, b) {
  if (b === 0) return { ok: false, error: 'DIV_BY_ZERO' };
  return { ok: true, value: a / b };
}

const OPS = { '+': add, '-': sub, '*': mul, '/': div };

// evaluate a single binary expression "a OP b" (deterministic, no eval). Returns {ok, value} or {ok:false,error}.
export function evaluate(expr) {
  const s = String(expr == null ? '' : expr).trim();
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return { ok: false, error: 'INVALID_EXPRESSION' };
  const a = Number(m[1]), op = m[2], b = Number(m[3]);
  const fn = OPS[op];
  const r = fn(a, b);
  if (op === '/') return r.ok ? { ok: true, value: r.value } : r;
  return { ok: true, value: r };
}

// a tiny reducer for button-driven UI state (display string + clear)
export function press(state, key) {
  const st = state && typeof state.display === 'string' ? state : { display: '' };
  if (key === 'C') return { display: '' };
  if (key === '=') { const r = evaluate(st.display); return { display: r.ok ? String(r.value) : ('Error: ' + r.error) }; }
  if (st.display.startsWith('Error')) return { display: String(key) };
  return { display: st.display + String(key) };
}
