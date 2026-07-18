// PAES-HANDOFF-HOTFIX-2 heartbeat observation core (testable).
// Requires >=3 STRICTLY-INCREASING heartbeat values after the supervisor's
// startup warmup. Prefers the monotonic seq; falls back to ms ts. The threshold
// floor is 3 and must never be lowered.

export const HEARTBEAT_MIN_ADVANCING = 3; // floor — qualification requires >= this

// Extract a strictly-comparable value from a heartbeat record.
export function heartbeatValue(hb) {
  if (!hb) return null;
  if (typeof hb.seq === "number") return hb.seq;
  if (typeof hb.ts === "number") return hb.ts;
  return null;
}

// Fold a sequence of heartbeat readings into the count of STRICTLY-advancing
// values. A static/repeated value does not advance; equal values do not count.
export function foldAdvancing(readings, need = HEARTBEAT_MIN_ADVANCING) {
  const advancing = []; let last = -Infinity;
  for (const hb of readings || []) {
    const v = heartbeatValue(hb);
    if (typeof v === "number" && v > last) { advancing.push(v); last = v; }
    if (advancing.length >= need) break;
  }
  return { advancing, count: advancing.length, satisfied: advancing.length >= need };
}

// Effective requirement can never drop below the floor of 3.
export function requiredAdvancing(requested) {
  const r = Number(requested);
  return Number.isFinite(r) ? Math.max(HEARTBEAT_MIN_ADVANCING, r) : HEARTBEAT_MIN_ADVANCING;
}

// Qualification timeout is DERIVED from the heartbeat cadence (never a fixed
// period shorter than the required sequence): need*interval + startup + warmup grace.
export function deriveTimeoutMs(need, intervalMs) {
  const n = requiredAdvancing(need);
  const i = Number(intervalMs) > 0 ? Number(intervalMs) : 1000;
  return n * i + 8000 + 6 * i;
}
