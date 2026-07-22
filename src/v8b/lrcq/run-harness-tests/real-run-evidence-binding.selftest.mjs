// FounderGate LRCQ — path-independent real-run evidence authority (FG-LRCQ-ACT-027).
// Positive proof against the ACTUAL committed authoritative record + M01-M20 mutation matrix on disposable
// fixtures. Read-only on the real repo (never rewrites raw REAL-RUN evidence); mutations use temp copies.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { buildBinding, verifyBinding, CODES, BINDING_SCHEMA, BINDING_SCHEMA_VERSION } from "../../../../tools/terminal0/lrcq/real-run-evidence-binding.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const REPO = new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
const INCIDENT_REL = ".foundergate/evidence/lrcq-assurance-factory/real-run-teardown-terminal-incident.json";
const BINDING_REL = ".foundergate/evidence/lrcq-assurance-factory/REAL_RUN_EVIDENCE_BINDING.json";

// ---- Phase 7: positive proof against the ACTUAL preserved (committed) evidence ----
const built = buildBinding(REPO);
ok("P1 binding construction SUCCEEDS on the actual committed incident", built.ok === true);
const B = built.binding;
ok("P2 exactly one historical run identity (run_id + activation)", B.run_id === "lrcq-first-internal-5h-run" && /^sha256:ba4e4880/.test(B.activation_identity));
ok("P3 activation consumed once + replay blocked", B.activation_consumed_once === true && B.replay_blocked === true);
ok("P4 held outcome represented honestly (HELD_TEARDOWN_DEFECT) + observed-old-label preserved", /HELD_TEARDOWN_DEFECT/.test(B.authoritative_outcome_status) && /STOPPED_EXHAUSTED/.test(B.observed_historical_label));
ok("P5 productive_jobs_completed = 0", B.productive_jobs_completed === 0);
ok("P6 provider was NOT productively invoked", B.provider_attempt_status === "PROVIDER_NOT_ATTEMPTED");
ok("P7 cost statement matches source precision (~0)", B.cost_usd === 0);
ok("P8 authoritative source digest present + it is the committed incident", B.authoritative_source.path === INCIDENT_REL && /^sha256:[0-9a-f]{64}$/.test(B.authoritative_source.sha256));
ok("P9 does NOT authorize a retry + carries the honest statement", B.does_not_authorize_retry === true && /consumed once and replay-blocked/.test(B.allowed_statement));
ok("P10 the committed binding manifest round-trips (verifyBinding OK)", existsSync(join(REPO, BINDING_REL)) && verifyBinding(REPO, JSON.parse(readFileSync(join(REPO, BINDING_REL), "utf8"))).ok === true);

// ---- Phase 8: mutation matrix on disposable fixtures ----
const base = mkdtempSync(join(tmpdir(), "fg-rrev-"));
try {
  // a disposable repo containing ONLY the evidence dir (buildBinding/verifyBinding read the incident by rel path)
  const mkFix = () => {
    const r = mkdtempSync(join(base, "fix-"));
    const d = join(r, ".foundergate/evidence/lrcq-assurance-factory"); mkdirSync(d, { recursive: true });
    cpSync(join(REPO, INCIDENT_REL), join(d, "real-run-teardown-terminal-incident.json"));
    const bb = buildBinding(r); writeFileSync(join(d, "REAL_RUN_EVIDENCE_BINDING.json"), JSON.stringify(bb.binding, null, 2) + "\n");
    return r;
  };
  const load = (r) => JSON.parse(readFileSync(join(r, BINDING_REL), "utf8"));
  const incidentPath = (r) => join(r, INCIDENT_REL);
  const setIncident = (r, mut) => { const i = JSON.parse(readFileSync(incidentPath(r), "utf8")); mut(i); writeFileSync(incidentPath(r), JSON.stringify(i, null, 2) + "\n"); };
  const code = (r, b) => verifyBinding(r, b).code;
  const fails2 = (r, b, expected) => { const c = code(r, b); return c !== CODES.OK && (!expected || c === expected); };

  // clean fixture passes
  let r = mkFix(); ok("00 clean fixture verifies OK", verifyBinding(r, load(r)).ok === true);

  // M01 — literal REAL-RUN dir absent while valid held evidence exists -> still OK (path-independent)
  r = mkFix(); ok("M01 no literal REAL-RUN dir, valid held evidence -> STILL VALID (path-independent)", verifyBinding(r, load(r)).ok === true);
  // M02 — fabricated recovery-state with no source binding -> binding has no authoritative_source
  r = mkFix(); { const b = load(r); delete b.authoritative_source; ok("M02 fabricated binding, no source -> REFUSED", fails2(r, b)); }
  // M03 — authoritative source removed
  r = mkFix(); { const b = load(r); rmSync(incidentPath(r)); ok("M03 authoritative source removed -> MISSING", fails2(r, b, CODES.REAL_RUN_EVIDENCE_MISSING)); }
  // M04 — authoritative source altered after binding
  r = mkFix(); { const b = load(r); setIncident(r, (i) => { i.tag = "TAMPERED"; }); ok("M04 source altered after binding -> SOURCE_DIGEST_MISMATCH", fails2(r, b, CODES.SOURCE_DIGEST_MISMATCH)); }
  // M05 — raw manifest digest altered in the binding
  r = mkFix(); { const b = load(r); b.raw_evidence_manifest_digest = "sha256:deadbeef"; ok("M05 raw manifest digest altered -> RAW_MANIFEST_DIGEST_MISMATCH", fails2(r, b, CODES.RAW_MANIFEST_DIGEST_MISMATCH)); }
  // M06 — wrong run_id
  r = mkFix(); { const b = load(r); b.run_id = "some-other-run"; ok("M06 wrong run_id -> RUN_ID_MISMATCH", fails2(r, b, CODES.RUN_ID_MISMATCH)); }
  // M07 — wrong activation identity
  r = mkFix(); { const b = load(r); b.activation_identity = "sha256:" + "0".repeat(64); ok("M07 wrong activation identity -> ACTIVATION_IDENTITY_MISMATCH", fails2(r, b, CODES.ACTIVATION_IDENTITY_MISMATCH)); }
  // M08 — activation marked unconsumed
  r = mkFix(); { const b = load(r); b.activation_consumed_once = false; ok("M08 activation unconsumed -> CONSUMPTION_STATE_MISMATCH", fails2(r, b, CODES.CONSUMPTION_STATE_MISMATCH)); }
  // M09 — replay marked reusable
  r = mkFix(); { const b = load(r); b.replay_blocked = false; ok("M09 replay reusable -> REPLAY_STATE_MISMATCH", fails2(r, b, CODES.REPLAY_STATE_MISMATCH)); }
  // M10 — productive jobs 0 -> positive
  r = mkFix(); { const b = load(r); b.productive_jobs_completed = 5; ok("M10 productive jobs falsified -> PRODUCTIVE_JOB_COUNT_MISMATCH", fails2(r, b, CODES.PRODUCTIVE_JOB_COUNT_MISMATCH)); }
  // M11 — provider-not-attempted -> completed
  r = mkFix(); { const b = load(r); b.provider_attempt_status = "PROVIDER_COMPLETED"; ok("M11 provider falsified to completed -> PROVIDER_ATTEMPT_MISMATCH", fails2(r, b, CODES.PROVIDER_ATTEMPT_MISMATCH)); }
  // M12 — cost changed beyond source precision
  r = mkFix(); { const b = load(r); b.cost_usd = 7.5; ok("M12 cost falsified -> COST_EVIDENCE_MISMATCH", fails2(r, b, CODES.COST_EVIDENCE_MISMATCH)); }
  // M13 — two candidate authoritative runs: incident says witness reached (contradiction w/ held)
  r = mkFix(); { setIncident(r, (i) => { i.real_run.production_witness_reached = true; }); const bb = buildBinding(r); ok("M13/M14 contradictory outcome (witness reached on a held run) -> build REFUSED", bb.ok === false && bb.code === CODES.OUTCOME_CONTRADICTION); }
  // M15 — unrelated run evidence substituted (incident missing real_run block)
  r = mkFix(); { setIncident(r, (i) => { delete i.real_run; }); const bb = buildBinding(r); ok("M15 unrelated/!real_run source -> build REFUSED (MISSING)", bb.ok === false && bb.code === CODES.REAL_RUN_EVIDENCE_MISSING); }
  // M16 — source path escapes approved roots
  r = mkFix(); { const b = load(r); b.authoritative_source.path = "../../../etc/passwd"; ok("M16 source path escape -> UNAUTHORIZED_SOURCE_PATH", fails2(r, b, CODES.UNAUTHORIZED_SOURCE_PATH)); }
  // M17 — stale binding copied from another SHA (schema_version bumped)
  r = mkFix(); { const b = load(r); b.schema_version = 999; ok("M17 stale binding (wrong schema_version) -> STALE_BINDING", fails2(r, b, CODES.STALE_BINDING)); }
  // M18 — empty evidence inventory claims 'no run': buildBinding on a repo with no incident -> MISSING
  r = mkdtempSync(join(base, "empty-")); mkdirSync(join(r, ".foundergate/evidence/lrcq-assurance-factory"), { recursive: true });
  ok("M18 empty inventory: buildBinding REFUSES (cannot synthesize a run) ", buildBinding(r).ok === false && buildBinding(r).code === CODES.REAL_RUN_EVIDENCE_MISSING);
  // M19 — missing literal REAL-RUN path must NOT yield a false 'no run' when the incident is present: covered by M01 (still VALID)
  ok("M19 missing literal REAL-RUN path does NOT produce a false no-run (incident-bound) ", verifyBinding(mkFix(), load(mkFix())).ok === true);
  // M20 — compatibility recovery-state alone (no incident) cannot satisfy verification
  r = mkdtempSync(join(base, "compat-")); const cd = join(r, ".foundergate/evidence/lrcq-assurance-factory"); mkdirSync(cd, { recursive: true });
  writeFileSync(join(cd, "REAL_RUN_EVIDENCE_BINDING.json"), JSON.stringify({ schema: BINDING_SCHEMA, schema_version: BINDING_SCHEMA_VERSION, authoritative_source: { path: INCIDENT_REL, sha256: "sha256:" + "0".repeat(64) } }, null, 2));
  ok("M20 compatibility binding without the real incident source -> REFUSED (MISSING/DIGEST)", !verifyBinding(r, JSON.parse(readFileSync(join(cd, "REAL_RUN_EVIDENCE_BINDING.json"), "utf8"))).ok);

  // restore-clean proof
  r = mkFix(); ok("Z restore: clean fixture passes again after all mutations", verifyBinding(r, load(r)).ok === true);
} finally { try { rmSync(base, { recursive: true, force: true }); } catch { /* */ } }

console.log("\nLRCQ REAL-RUN-EVIDENCE-BINDING SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
