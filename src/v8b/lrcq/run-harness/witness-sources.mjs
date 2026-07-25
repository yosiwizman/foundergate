// FounderGate LRCQ — read-only AUTHORITATIVE-SOURCE parsers for the witness (FG-LRCQ-ACT-021).
// These are strictly read-only readers of EXISTING durable authorities (supervisor state dir, the run's
// evidence index, the git protected-main ref, and OS process state). They create NO new authority and NEVER
// write. Every function fails CLOSED (returns an explicit unknown/false) rather than a safe default.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
// FG-CHK-197-02: fixed absolute executables in a minimal environment — never PATH-resolved.
import { fixedGit, fixedPs } from "../assurance/fixed-executables.mjs";
import { join } from "node:path";
import { readSupervisorState, supervisorAlive } from "./supervisor.mjs";

export function psStartIdentity(pid) { try { return fixedPs(["-o", "lstart=", "-p", String(pid)]); } catch { return null; } }
export function childPids(pid) { try { return execFileSync("pgrep", ["-P", String(pid)], { encoding: "utf8" }).trim().split(/\s+/).filter(Boolean); } catch { return []; } }
// Resolve a child process's actual command line (argv) so the witness can compare the REAL provider
// executable to the manifest-bound expected path — NOT a self-comparison of a config value.
// `-ww` disables ps's column truncation so a long provider path is fully visible (not cut off).
export function processArgs(pid) { try { return fixedPs(["-ww", "-o", "args=", "-p", String(pid)]); } catch { return null; } }

// Count DISTINCT live supervisor owners for a run by enumerating the authoritative supervisor state dir.
// The supervisor's own atomic startup refusal prevents a second live owner; the witness independently
// confirms exactly one live owner here (>1 => duplicate => FAILED upstream).
export function liveSupervisorOwners(supervisorDir, runId) {
  let owners = 0;
  try {
    for (const f of readdirSync(supervisorDir)) {
      if (!/\.state\.json$/.test(f)) continue;
      let s = null; try { s = JSON.parse(readFileSync(join(supervisorDir, f), "utf8")); } catch { continue; }
      if (s && s.run_id === runId && s.state === "RUN_ACTIVE" && typeof s.supervisor_pid === "number" && supervisorAlive(s.supervisor_pid)) owners++;
    }
  } catch { /* dir unreadable -> 0 owners, caller fails closed */ }
  return owners;
}

// Strict read-only evidence-index parser. Validates each JSONL record and counts only VALID, current-run,
// non-duplicate records whose job is in the reviewed backlog. Malformed / foreign-run / fabricated-job /
// duplicate records DO NOT establish progress and are surfaced for a fail-closed verdict.
export function parseEvidenceIndex(path, { runId, jobIds }) {
  const out = { valid_records: 0, sealed_jobs: 0, malformed: 0, foreign_run: 0, foreign_job: 0, duplicates: 0, non_monotonic: 0, last_event_epoch: null, present: false };
  if (!path || !existsSync(path)) return out;
  out.present = true;
  const allow = jobIds && jobIds.length ? new Set(jobIds) : null;
  const seen = new Set(); let lastT = -Infinity; const sealed = new Set();
  let text; try { text = readFileSync(path, "utf8"); } catch { out.malformed++; return out; }
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    let r; try { r = JSON.parse(raw); } catch { out.malformed++; continue; }
    if (!r || typeof r !== "object" || typeof r.job !== "string" || typeof r.t !== "number") { out.malformed++; continue; }
    if (runId != null && r.run_id != null && r.run_id !== runId) { out.foreign_run++; continue; }
    if (allow && !allow.has(r.job)) { out.foreign_job++; continue; }
    const key = r.job + "#" + (r.attempt == null ? "" : r.attempt) + "#" + (r.sealed ? "S" : "-");
    if (seen.has(key)) { out.duplicates++; continue; }
    seen.add(key);
    if (r.t < lastT) out.non_monotonic++; else lastT = r.t;
    out.valid_records++; out.last_event_epoch = Math.max(out.last_event_epoch ?? 0, r.t);
    if (r.sealed === true) sealed.add(r.job);
  }
  out.sealed_jobs = sealed.size;
  return out;
}

// Read the AUTHORITATIVE protected-main ref (default the remote-tracking ref) and compare to the reviewed
// baseline. Returns ok=null (UNKNOWN) on any git failure — the caller must FAIL CLOSED, never assume unchanged.
export function protectedMainState({ repoRoot, ref, baseline }) {
  if (!baseline) return { ok: null, reason: "no reviewed protected-main baseline", ref: ref || null, current: null };
  const useRef = ref || "refs/remotes/origin/main";
  let current = null;
  try { current = fixedGit(["-C", repoRoot || ".", "rev-parse", useRef]); }
  catch { return { ok: null, reason: "cannot read protected-main ref " + useRef, ref: useRef, current: null }; }
  return { ok: current === baseline, ref: useRef, current, baseline };
}

// Build the current supervisor observation from durable state + OS.
export function supervisorObservation(supervisorDir, runId, baselineIdentity) {
  const s = readSupervisorState(supervisorDir, runId) || {};
  const alive = typeof s.supervisor_pid === "number" && supervisorAlive(s.supervisor_pid) && (!baselineIdentity || psStartIdentity(s.supervisor_pid) === baselineIdentity);
  return { s, alive };
}
