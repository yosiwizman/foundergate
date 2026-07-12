// FounderGate — RELIABILITY SOAK ACCUMULATOR (AKIOR-HARVEST #5; adopt-now, wide-safe).
//
// Folds many health-sample WINDOWS (each carrying a real timestamp) over wall-clock
// into a single rolling aggregate + SLO verdict, and emits the §29-compliant
// "FOUNDERGATE HARNESS <N>-HOUR SOAK PASS" line ONLY when the run GENUINELY spans the
// claimed duration AND meets the SLO. If the run is short or the SLO is missed it emits
// an honest "NOT PASSED (still running / incomplete)" line and NEVER the string
// "SOAK PASS" — the tool itself cannot fabricate a soak. Its PASS output is, by
// construction, VALID under report-provenance `validateSoakClaims` (start/end
// timestamps span ≥ the claim). This is the rolling tool the Honest-Duration &
// Soak-Proof Law (Assembly Manual §29) demands.
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

// Emit the soak verdict as a committable report STRING. Emits a "<N>-HOUR SOAK PASS"
// line (with start/end timestamps that span the claim) ONLY when duration AND SLO are
// met with samples present; otherwise an honest NOT-PASSED line with the numbers and
// NEVER "SOAK PASS".
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
  if (s.meetsDuration && s.meetsSlo && s.samples > 0) return `${hdr} PASS\n${meta}`;
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
