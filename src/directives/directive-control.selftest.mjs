// DCL-1 self-test — the 30 named Phase-19 cases. Exit 0 == all pass.
import {
  sha256, verifyCapture, validateDirectiveRecord, canRun, validateTransition,
  safeToCompact, safeToStop, resolveDependencies, enqueueIdempotent,
  classifyHistorical, DIRECTIVE_REQUIRED, isTerminal,
  supersessionValid, detectDroppedDirectives,
} from "./directive-control.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

const BODY = "FOUNDERGATE DCL-1 body ... end.";
const REC = {
  sha256: sha256(BODY), byte_count: Buffer.byteLength(BODY, "utf8"),
  beginning_anchor: BODY.slice(0, 40), ending_anchor: BODY.slice(-40),
};

// 1 missing body; 2 missing digest; 3 digest mismatch; 4 truncated; 5 changed after capture; 6 summary substituted
ok("01 missing body rejected", verifyCapture("", REC).verified === false);
ok("02 missing digest rejected", verifyCapture(BODY, { ...REC, sha256: undefined }).verified === false);
ok("03 digest mismatch rejected", verifyCapture(BODY, { ...REC, sha256: "deadbeef" }).verified === false);
ok("04 truncated body rejected", verifyCapture(BODY.slice(0, 20), REC).verified === false);
ok("05 body changed after capture rejected", verifyCapture(BODY + " tampered", REC).verified === false);
ok("06 summary substituted rejected", validateDirectiveRecord({ body_is_summary: true }).problems.some((p) => p.includes("summary")));

// 7 queue entry without body; 8 body without queue
ok("07 queue entry without body flagged", verifyCapture(null, REC).problems.includes("missing body"));
ok("08 body without queue -> not safe to compact", safeToCompact([{ directive_id: "d", current_state: "CAPTURED", digest_verified: true, queue_state_exists: false, recovery_state_exists: true, next_safe_action: "x" }]).safe === false);

// 9 dependency missing; 10 dependency reversed
ok("09 dependency missing -> waiting", resolveDependencies({ dependencies: ["arlc-1"] }, []).state === "WAITING_ON_DEPENDENCY");
ok("10 dependency satisfied -> ready", resolveDependencies({ dependencies: ["arlc-1"] }, ["arlc-1"]).state === "READY");

// 11 silently dropped; 12 duplicate directive
ok("11 dropped directive detected (in index, absent from queue)", detectDroppedDirectives(["a", "b"], ["a"]).dropped.includes("b") && detectDroppedDirectives(["a"], ["a"]).ok === true);
const q = enqueueIdempotent(["a"], "b");
ok("12 duplicate directive idempotent", enqueueIdempotent(q.queue, "b").idempotent === true);

// 13 supersession without record
ok("13 SUPERSEDED without superseded_by rejected; with record accepted", supersessionValid({ current_state: "SUPERSEDED" }).valid === false && supersessionValid({ current_state: "SUPERSEDED", superseded_by: "dcl-1" }).valid === true);

// 14 compaction before capture unsafe; 15 safe after capture
ok("14 compaction before capture -> COMPACTION_UNSAFE", safeToCompact([{ directive_id: "d", current_state: "RECEIVED", digest_verified: false, queue_state_exists: false, recovery_state_exists: false, next_safe_action: null }]).verdict === "COMPACTION_UNSAFE");
ok("15 safe compaction after full capture", safeToCompact([{ directive_id: "d", current_state: "QUEUED", digest_verified: true, queue_state_exists: true, recovery_state_exists: true, next_safe_action: "run" }]).verdict === "SAFE");

// 16 restart recovery; 17 duplicate resume
ok("16 restart recovery ready when deps satisfied + recovery exists", canRun({}, { body_exists: true, digest_verifies: true, dependencies_satisfied: true, recovery_state_exists: true, writer_ownership_valid: true }).ok === true);
ok("17 duplicate resume idempotent", enqueueIdempotent(["d"], "d").appended === false);

// 18 wrong machine; 19 writer collision
ok("18 wrong machine rejected", validateDirectiveRecord({ machine: "m1", expected_machine: "mac-mini-pro" }).problems.some((p) => p.includes("machine")));
ok("19 writer ownership invalid blocks RUN", canRun({}, { body_exists: true, digest_verifies: true, dependencies_satisfied: true, recovery_state_exists: true, writer_ownership_valid: false }).ok === false);

// 20 shutdown with actionable work
ok("20 shutdown blocked by READY directive", safeToStop([{ directive_id: "d", current_state: "READY" }]).safe === false);
ok("20b shutdown safe when nothing actionable", safeToStop([{ directive_id: "d", current_state: "COMPLETED" }]).safe === true);

// 21 true founder gate stop; 22 human-expert gate stop
ok("21 TRUE_FOUNDER_GATE is a valid non-terminal stop", !isTerminal("TRUE_FOUNDER_GATE"));
ok("22 HUMAN_EXPERT_GATE is a valid non-terminal stop", !isTerminal("HUMAN_EXPERT_GATE"));

// 23 failed directive preserved
ok("23 FAILED is terminal (preserved, not deleted)", isTerminal("FAILED"));

// 24 historical received-not-locked; 25 missing historical not reconstructed
ok("24 found+unqueued -> RECEIVED_NOT_LOCKED", classifyHistorical(true, false) === "HISTORICAL_RECEIVED_NOT_LOCKED");
ok("25 not found -> NOT_PROVEN (no reconstruction)", classifyHistorical(false, false) === "NOT_PROVEN");

// 26 current directive self-capture; 27 transcript/disk digest equality
ok("26 self-capture verifies", verifyCapture(BODY, REC).verified === true);
ok("27 digest equality is discriminating (matches identical, rejects altered)", sha256(BODY) === REC.sha256 && sha256(BODY + "x") !== REC.sha256);

// 28 immutable prompt-body enforcement
ok("28 body modified after capture flagged", validateDirectiveRecord({ body_modified_after_capture: true }).problems.some((p) => p.includes("modified after capture")));

// 29 idempotent queue processing
ok("29 idempotent queue processing", enqueueIdempotent(["x", "y"], "x").appended === false);

// 30 complete final proof capsule (transition needs full fields incl RUN preconditions)
const goodT = { prior_state: "EVIDENCE_SEALING", next_state: "COMPLETED", reason: "seal", actor: "MOD-014",
  timestamp: "t", idempotency_key: "k", next_safe_action: "close", prompt_digest: REC.sha256 };
ok("30 complete transition validates", validateTransition(goodT).valid === true);
ok("30b RUNNING without durability blocked", validateTransition({ ...goodT, next_state: "RUNNING" }, {}).valid === false);

console.log(`\nDCL-1 SELFTEST: ${n - fails.length}/${n} passed`);
if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
process.exit(0);
