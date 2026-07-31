#!/usr/bin/env node
// Level-3C move-resilient duration classifier.
// SOURCE OF TRUTH for any duration claim. Decides PASS strictly from the
// monitor AND ledger log timestamps on disk — NEVER from a wall-clock timer.
// A completed timer with missing/short evidence is NOT a pass.
//
// Pure core (classifyDuration) takes already-read data so it is fully
// deterministic and unit-testable with synthetic lines (no clock, no fs).

const TS_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/;

export function extractTimestamps(lines) {
  const ts = [];
  for (const ln of lines || []) {
    const m = typeof ln === "string" && ln.match(TS_RE);
    if (m) { const t = Date.parse(m[1]); if (Number.isFinite(t)) ts.push(t); }
  }
  return ts;
}

function spanMinutes(ts) {
  if (ts.length < 2) return 0;
  return (ts[ts.length - 1] - ts[0]) / 60000;
}
function maxGapMinutes(ts) {
  let g = 0;
  for (let i = 1; i < ts.length; i++) g = Math.max(g, (ts[i] - ts[i - 1]) / 60000);
  return g;
}

// Pure verdict core.
//   monitorLines, ledgerLines : arrays of log lines
//   statusState               : contents of status.json "state" (or null)
//   minMinutes                : required span (e.g. 120)
//   maxGapMin                 : largest allowed gap between consecutive samples
export function classifyDuration({ monitorLines = [], ledgerLines = [], statusState = null, minMinutes = 120, maxGapMin = 5 } = {}) {
  // Fail-closed: an evidence-write failure can never be a pass.
  if (statusState === "HELD_EVIDENCE_WRITE_FAILURE") {
    return { verdict: "HELD_EVIDENCE_WRITE_FAILURE", pass: false, reason: "evidence write failure marker present" };
  }
  const mts = extractTimestamps(monitorLines);
  const lts = extractTimestamps(ledgerLines);
  const monitorSpan = spanMinutes(mts);
  const ledgerSpan = spanMinutes(lts);
  const base = {
    pass: false, min_minutes: minMinutes,
    monitor_samples: mts.length, ledger_samples: lts.length,
    monitor_span_min: Math.round(monitorSpan * 10) / 10,
    ledger_span_min: Math.round(ledgerSpan * 10) / 10,
    monitor_max_gap_min: Math.round(maxGapMinutes(mts) * 10) / 10,
    ledger_max_gap_min: Math.round(maxGapMinutes(lts) * 10) / 10,
  };
  // Missing or single-sample evidence (incl. timer-completed-but-ledger-missing).
  if (mts.length < 2 || lts.length < 2) {
    return { ...base, verdict: "INSUFFICIENT_EVIDENCE", reason: "monitor and/or ledger has < 2 timestamped samples" };
  }
  // Duration bar: BOTH streams must span the threshold.
  if (monitorSpan < minMinutes || ledgerSpan < minMinutes) {
    return { ...base, verdict: "LEVEL2_DURATION_NOT_PROVEN", reason: `monitor=${base.monitor_span_min}min ledger=${base.ledger_span_min}min < required ${minMinutes}min` };
  }
  // Continuity: a large gap (e.g. logs died mid-run) breaks the claim.
  if (base.monitor_max_gap_min > maxGapMin || base.ledger_max_gap_min > maxGapMin) {
    return { ...base, verdict: "INSUFFICIENT_EVIDENCE", reason: `evidence gap exceeds ${maxGapMin}min (monitor gap=${base.monitor_max_gap_min}, ledger gap=${base.ledger_max_gap_min})` };
  }
  return { ...base, verdict: "LEVEL2_TWO_HOUR_PROVEN", pass: true, reason: "monitor and ledger both span >= threshold with continuous samples" };
}

// CLI: node fg_duration_classify.mjs --monitor f --ledger f [--status f] [--min N] [--max-gap M]
import { pathToFileURL } from "node:url";
function readLines(fs, p) { try { return fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean); } catch { return []; } }
function readState(fs, p) { try { return JSON.parse(fs.readFileSync(p, "utf8")).state ?? null; } catch { return null; } }

// Robust main-module detection: pathToFileURL encodes spaces the same way
// import.meta.url does, so a workspace path with spaces still matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fs = await import("node:fs");
  const a = process.argv.slice(2); const opt = {};
  for (let i = 0; i < a.length; i += 2) opt[a[i].replace(/^--/, "")] = a[i + 1];
  const out = classifyDuration({
    monitorLines: opt.monitor ? readLines(fs, opt.monitor) : [],
    ledgerLines: opt.ledger ? readLines(fs, opt.ledger) : [],
    statusState: opt.status ? readState(fs, opt.status) : null,
    minMinutes: opt.min ? Number(opt.min) : 120,
    maxGapMin: opt["max-gap"] ? Number(opt["max-gap"]) : 5,
  });
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  process.exit(out.pass ? 0 : 1);
}
