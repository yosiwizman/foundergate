// Witness fixture — a tiny local counter (non-sensitive, no external calls, no secrets).
export function createCounter(start = 0, options = {}) {
  const origin = Number.isFinite(start) ? start : 0;
  const { min, max } = options || {};
  const hasMin = Number.isFinite(min);
  const hasMax = Number.isFinite(max);

  const clamp = (v) => {
    let out = v;
    if (hasMin && out < min) out = min;
    if (hasMax && out > max) out = max;
    return out;
  };

  let n = clamp(origin);

  return {
    value: () => n,
    increment: () => { n = clamp(n + 1); return n; },
    decrement: () => { n = clamp(n - 1); return n; },
    reset: () => { n = clamp(origin); return n; },
  };
}
