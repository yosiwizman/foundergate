// FounderGate — RELIABILITY SOAK ACCUMULATOR (AKIOR-HARVEST #5; adopt-now, wide-safe).
//
// Folds many health-sample WINDOWS (each carrying a real timestamp) over wall-clock
// into a single rolling aggregate + SLO verdict, and emits an availability + duration
// SUB-RESULT — NOT the gate verdict — ONLY when the run GENUINELY spans the claimed
// duration AND meets the SLO. If the run is short or the SLO is missed it emits an honest
// "NOT PASSED (still running / incomplete)" line. W1-H1: this tool NEVER emits the bare
// gate-pass token "<label> <N>-HOUR SOAK PASS" — that token belongs ONLY to the AND-gate
// verdict (availability SLO AND QUIET_HOST eligibility AND frozen-code integrity), which
// the soak driver's computeVerdict emits. The accumulator can attest availability+duration
// only; it cannot see quiet-host or freeze integrity, so labelling its output as a
// sub-result prevents it from being read as — or parsed as — the gate verdict. This is
// the rolling tool the Honest-Duration & Soak-Proof Law (Assembly Manual §29) demands.
//
// Pure Node, zero-dependency: timestamps are DATA passed in (no Date.now()); no network.
// Adapted as an original implementation from the AKIOR pattern (scripts/_lib/
// akior-reliability-soak.mjs) surveyed in docs/lanes/authority/akior-harness-harvest-report.md (#5).

const parseTs = (ts) => { const n = Date.parse(String(ts).replace(" ", "T")); return Number.isNaN(n) ? null : n; };

export function newSoak(claimHours, { sloTarget = 0.99, label = "FOUNDERGATE HARNESS" } = {}) {
  if (!(claimHours > 0)) throw new Error("claimHours must be > 0");
  return { claimHours, sloTarget, label, windows: [], ok: 0, fail: 0, startTs: null, endTs: null };
}

// Add a health-sample window. `ok`/`fail` are counts observed in that window; `ts` is
// the window's real timestamp (ISO 8601). Tracks the earliest start and latest end.
export function addWindow(soak, { ts, ok = 0, fail = 0, note } = {}) {
  const t = parseTs(ts);
  if (t == null) throw new Error(`soak window needs a parseable timestamp, got: ${ts}`);
  soak.windows.push({ ts, ok, fail, note });
  soak.ok += ok; soak.fail += fail;
  if (soak.startTs == null || t < parseTs(soak.startTs)) soak.startTs = ts;
  if (soak.endTs == null || t > parseTs(soak.endTs)) soak.endTs = ts;
  return soak;
}

export function slo(soak) {
  const samples = soak.ok + soak.fail;
  const availability = samples ? soak.ok / samples : 0;
  const spanHours = (soak.startTs && soak.endTs) ? (parseTs(soak.endTs) - parseTs(soak.startTs)) / 3600000 : 0;
  return {
    samples, ok: soak.ok, fail: soak.fail, availability, spanHours,
    meetsDuration: spanHours + 1e-9 >= soak.claimHours,
    meetsSlo: availability + 1e-12 >= soak.sloTarget,
  };
}

// Emit the soak accumulator output as a committable report STRING. On a met claim it emits an
// explicitly LABELED availability+duration SUB-RESULT (W1-H1) — never the bare gate-pass token
// "<label> <N>-HOUR SOAK PASS"; otherwise an honest NOT-PASSED line with the numbers.
export function soakReport(soak, { sha } = {}) {
  const s = slo(soak);
  const hdr = `${soak.label} ${soak.claimHours}-HOUR SOAK`;
  const meta = [
    `start: ${soak.startTs || "UNKNOWN"}`,
    `end: ${soak.endTs || "UNKNOWN"}`,
    `span: ${s.spanHours.toFixed(2)}h (claim ${soak.claimHours}h)`,
    `availability: ${(s.availability * 100).toFixed(3)}% (SLO ${(soak.sloTarget * 100).toFixed(2)}%)`,
    `samples: ${s.samples} (ok ${s.ok} / fail ${s.fail})`,
    `SHA under test: ${sha || "UNKNOWN"}`,
  ].join("\n");
  // W1-H1: label the availability+duration sub-result so it can never be read as — or parsed as —
  // the gate verdict. The rendered line "${hdr} availability+duration PASS" contains no "SOAK PASS"
  // substring (SOAK is followed by " availability+duration"), so validateSoakClaims / a gate-token
  // scan match it on ZERO lines; the gate-pass token is emitted ONLY by the AND-gate (computeVerdict).
  if (s.meetsDuration && s.meetsSlo && s.samples > 0) {
    return `SUB-RESULT (availability + duration only — NOT the gate verdict): ${hdr} availability+duration PASS\n${meta}`;
  }
  const why = [
    !s.meetsDuration ? `span ${s.spanHours.toFixed(2)}h < claim ${soak.claimHours}h` : null,
    !s.meetsSlo ? `availability ${(s.availability * 100).toFixed(3)}% < SLO` : null,
    s.samples === 0 ? "no samples yet" : null,
  ].filter(Boolean).join("; ");
  return `${hdr} — NOT PASSED (still running / incomplete): ${why}\n${meta}`;
}

export function passed(soak) {
  const s = slo(soak);
  return s.meetsDuration && s.meetsSlo && s.samples > 0;
}
