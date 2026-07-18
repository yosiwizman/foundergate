// ORC-1R recovery self-test — effect-aware law + journal + verdict (the
// machine-verifiable subset of the Phase-12 cases; reboot/process cases are
// covered by the reused singleton/supervisor-core primitives + starter wiring).
import { recoveryDecision, postOutageCertainty, heldActionBoundaryOk, EFFECT_CLASSES } from "./recovery-law.mjs";
import { writeCheckpoint, appendAction, readJournal, resumeState, recoveryVerdict } from "./recovery-journal.mjs";
import { mkdtempSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

// ---- Effect-aware law ----
ok("31 unknown effect class fails closed + routes gate", recoveryDecision({ effect_class: "WAT" }).decision === "park_route_gate" && recoveryDecision({}).gate === "TRUE_FOUNDER_GATE");
ok("31b missing effect class fails closed", recoveryDecision({}).decision === "park_route_gate");
ok("32 read-only retries after state validation", recoveryDecision({ effect_class: "READ_ONLY" }, { state_validated: true }).decision === "retry");
ok("32b read-only without validation parks", recoveryDecision({ effect_class: "READ_ONLY" }, {}).decision === "park_route_gate");
ok("33 reversible-local resumes after rollback+dup", recoveryDecision({ effect_class: "REVERSIBLE_LOCAL" }, { rollback_done: true, duplicate_checked: true }).decision === "resume");
ok("33b reversible-local without checks parks", recoveryDecision({ effect_class: "REVERSIBLE_LOCAL" }, {}).decision === "park_route_gate");
ok("34 repo-mutation needs reconciliation", recoveryDecision({ effect_class: "REPOSITORY_MUTATION" }, {}).decision === "park_route_gate" && recoveryDecision({ effect_class: "REPOSITORY_MUTATION" }, { repo_reconciled: true }).decision === "reconcile_then_retry");
ok("35 external-idempotent needs key+external+authority", recoveryDecision({ effect_class: "EXTERNAL_IDEMPOTENT", idempotency_key: "k" }, { external_state_reconciled: true, authority_permits: true }).decision === "retry");
ok("35b external-idempotent missing key blocks", recoveryDecision({ effect_class: "EXTERNAL_IDEMPOTENT" }, { external_state_reconciled: true, authority_permits: true }).decision === "park_route_gate");
ok("35c external-idempotent missing external reconcile blocks", recoveryDecision({ effect_class: "EXTERNAL_IDEMPOTENT", idempotency_key: "k" }, { authority_permits: true }).decision === "park_route_gate");
ok("36 external-uncertain never auto-retries", recoveryDecision({ effect_class: "EXTERNAL_UNCERTAIN" }, { authority_permits: true, external_state_reconciled: true }).decision === "park_route_gate");
ok("37 irreversible never auto-retries -> human-expert gate", recoveryDecision({ effect_class: "IRREVERSIBLE" }, {}).gate === "HUMAN_EXPERT_GATE");
ok("38 relabel (downgrade) to weaker class is blocked", recoveryDecision({ effect_class: "READ_ONLY", declared_original_class: "IRREVERSIBLE" }, { state_validated: true }).decision === "park_route_gate");
ok("25 sealed action is terminal (no re-exec)", recoveryDecision({ effect_class: "READ_ONLY", lifecycle: "EVIDENCE_SEALED" }, { state_validated: true }).terminal === true);
// held-action boundary
ok("38b external action must pass held-action sink", heldActionBoundaryOk({ effect_class: "EXTERNAL_IDEMPOTENT" }, {}).ok === false);
ok("38c external via held-action sink ok", heldActionBoundaryOk({ effect_class: "EXTERNAL_IDEMPOTENT" }, { via_held_action_sink: true }).ok === true);
ok("38d local action needs no sink", heldActionBoundaryOk({ effect_class: "READ_ONLY" }, {}).ok === true);
// certainty
ok("24 completed-not-sealed -> COMPLETED_EVIDENCE_UNSEALED", postOutageCertainty({ lifecycle: "ACTION_COMPLETED" }) === "COMPLETED_EVIDENCE_UNSEALED");
ok("cert started -> UNCERTAIN", postOutageCertainty({ lifecycle: "ACTION_STARTED" }) === "UNCERTAIN");

// ---- Journal ----
const tmp = mkdtempSync(join(tmpdir(), "orc-"));
const jp = join(tmp, "action-journal.jsonl");
const A = (id, lc, extra = {}) => ({ run_id: "R", action_id: id, effect_class: "READ_ONLY", lifecycle: lc, exact_sha: "s", ts: 1, ...extra });
ok("journal append requires fields", appendAction(jp, { action_id: "x" }).appended === false);
appendAction(jp, A("a1", "INTENT_RECORDED")); appendAction(jp, A("a1", "ACTION_STARTED")); appendAction(jp, A("a1", "ACTION_COMPLETED")); appendAction(jp, A("a1", "EVIDENCE_SEALED"));
appendAction(jp, A("a2", "INTENT_RECORDED")); appendAction(jp, A("a2", "ACTION_STARTED")); // interrupted
ok("resume folds to latest lifecycle per action", (() => { const r = resumeState(jp); return r.actions.find((a) => a.action_id === "a1").lifecycle === "EVIDENCE_SEALED" && r.actions.find((a) => a.action_id === "a2").certainty === "UNCERTAIN"; })());
ok("25b sealed action in incomplete set? no", resumeState(jp).incomplete.every((a) => a.action_id !== "a1"));
// 8 truncated final line tolerated; prior records intact
appendFileSync(jp, '{"run_id":"R","action_id":"a3","effect_class":"READ_ONL'); // truncated
const rd = readJournal(jp);
ok("08 truncated final line dropped; prior records intact", rd.dropped_tail === true && rd.records.length === 6);
// 26 duplicate action after seal -> blocked
const jp2 = join(tmp, "j2.jsonl");
appendAction(jp2, A("d1", "EVIDENCE_SEALED")); appendAction(jp2, A("d1", "ACTION_STARTED"));
ok("26 duplicate action id after seal detected", resumeState(jp2).duplicates.includes("d1"));

// ---- Verdict ----
writeCheckpoint(join(tmp, "cp.json"), { original_deadline: 1000 });
ok("28 original deadline expired -> RUN_DEADLINE_EXPIRED", recoveryVerdict({ original_deadline: 1000 }, { incomplete: [], duplicates: [] }, { now: 2000 }).verdict === "RUN_DEADLINE_EXPIRED");
ok("27 original deadline active -> not expired", recoveryVerdict({ original_deadline: 9999 }, { incomplete: [], duplicates: [], dropped_tail: false }, { now: 100 }).verdict === "RECOVERED_AUTOMATICALLY");
ok("verdict: uncertain external -> POSSIBLE_EXTERNAL_ACTION_CONFLICT", recoveryVerdict({ original_deadline: 9999 }, { incomplete: [{ action_id: "e", certainty: "UNCERTAIN", effect_class: "EXTERNAL_UNCERTAIN" }], duplicates: [] }, { now: 1 }).verdict === "POSSIBLE_EXTERNAL_ACTION_CONFLICT");
ok("verdict: uncertain local -> ONE_DECISION_REQUIRED", recoveryVerdict({ original_deadline: 9999 }, { incomplete: [{ action_id: "l", certainty: "UNCERTAIN", effect_class: "REVERSIBLE_LOCAL" }], duplicates: [] }, { now: 1 }).verdict === "ONE_DECISION_REQUIRED");
ok("verdict: duplicate -> RECOVERY_BLOCKED", recoveryVerdict({ original_deadline: 9999 }, { incomplete: [], duplicates: ["d1"] }, { now: 1 }).verdict === "RECOVERY_BLOCKED");
ok("effect classes are the 6 required", EFFECT_CLASSES.length === 6);


// ---- ORC starter-integration wiring guards ----
import { readFileSync as _rf2 } from "node:fs";
import { fileURLToPath as _fp } from "node:url";
import { dirname as _dn, join as _jn } from "node:path";
const _H = _dn(_fp(import.meta.url));
const _recRun = _rf2(_jn(_H, "../../tools/terminal0/paes/recover-run.mjs"), "utf8");
const _starter = _rf2(_jn(_H, "../../tools/terminal0/paes/start-wave2-session"), "utf8");
const _create = _rf2(_jn(_H, "../../tools/terminal0/paes/create-wave2-run.mjs"), "utf8");
ok("W1 recover-run uses the tested recovery law + journal", /recovery-journal/.test(_recRun) && /recovery-law/.test(_recRun));
ok("W2 starter routes to recovery before new run", /recover-run\.mjs/.test(_starter));
ok("W3 new run writes immutable recovery checkpoint + original deadline", /checkpoint\.json/.test(_create) && /original_deadline/.test(_create) && /recovery-checkpoint-1/.test(_create));
ok("W4 recovery never extends deadline (deadline_extended:false recorded)", /deadline_extended: false/.test(_recRun));

rmSync(tmp, { recursive: true, force: true });
console.log(`\nORC-1R RECOVERY SELFTEST: ${n - fails.length}/${n} passed`);
if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
process.exit(0);
