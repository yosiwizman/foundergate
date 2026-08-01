// Witness fixture — a tiny local counter (non-sensitive, no external calls, no secrets).
// Seed: only `increment` exists. The provider task is to extend this safely.
export function createCounter(start = 0) {
  let n = Number.isFinite(start) ? start : 0;
  return {
    value: () => n,
    increment: () => { n += 1; return n; },
    // TODO(provider): add decrement(), reset(), and clamp to a [min,max] range if provided.
  };
}
