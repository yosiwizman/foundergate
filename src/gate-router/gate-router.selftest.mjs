// FGRI-1 gate-router self-test — the Phase-11 invariants (pure-logic subset).
import {
  detectInteractiveQuestion, classifyGate, handleWorkerOutput, buildGateRequest,
  verifyDecision, classifyCost, actualSpendRequiresGate, shouldNotify,
  founderOptionsFor, safeDefault, digest, AUTO_REFUSED_OPTIONS,
} from "./gate-router.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
const ENV = { MODELED_COST_WARNING_USD: 15, MODELED_COST_FOUNDER_GATE_USD: 25 };

// 1-5 interactive-question / stdin / unresolved-authority detection
ok("01 interactive question detected", detectInteractiveQuestion("Please select option 1 or 2?").intercepted === true);
ok("02 option menu detected", detectInteractiveQuestion("Which option would you like?").intercepted === true);
ok("03 stdin read detected", detectInteractiveQuestion("const x = process.stdin.read()").intercepted === true);
ok("04 wait-for-keyboard detected", detectInteractiveQuestion("press enter to continue").intercepted === true);
ok("05 unresolved authority in final answer detected", detectInteractiveQuestion("I need your permission to proceed").intercepted === true);
ok("05b normal output NOT intercepted", detectInteractiveQuestion("wrote file; tests pass").intercepted === false);

// 6-7 lane parks; unrelated continues
const h = handleWorkerOutput("How should I proceed? Please choose.", { lane: "L1", action: "activate", exact_sha: "s", now: 1000, nonce: "abcd1234" });
ok("06 affected lane parks + routes", h.action === "park_and_route" && h.lane === "L1");
ok("07 unrelated work continues + no silent grant", h.unrelated_work_continues === true && h.granted_authority === false);
ok("07b intercept never grants authority", h.gate.current_state === "AWAITING_DECISION");

// 8 gate request on disk (structural), 11 safe default
const req = buildGateRequest({ lane: "L1", action: "a", why: "w", requested_authority: "unknown", exact_sha: "s" }, 1000, "nonce123");
ok("08 gate request has required fields", req.gate_id && req.gate_type && req.safe_default && req.anti_replay_nonce);
ok("11 safe default is park-and-continue", safeDefault() === "PARK_AFFECTED_LANE_AND_CONTINUE_OTHERS");

// 9-10 notification dedupe
const sent = new Set();
const nt1 = shouldNotify("g1", "d1", 1, sent); sent.add(nt1.key);
ok("09 one notification emitted", nt1.notify === true);
ok("10 duplicate notification rejected", shouldNotify("g1", "d1", 1, sent).notify === false);

// 12-14 unsafe option / dangerous flag / direct-push refusal
for (const bad of ["FULL_AUTONOMY", "DANGEROUSLY_SKIP_PERMISSIONS", "DIRECT_PUSH_TO_MAIN"]) {
  const r = { gate_id: "g", request_digest: digest(req), anti_replay_nonce: "nonce123", selected_option: bad };
  ok(`12-14 ${bad} auto-refused`, verifyDecision(req, r).valid === false);
}
ok("12b unsafe options absent from founder UI", founderOptionsFor(req).every((o) => !AUTO_REFUSED_OPTIONS.some((x) => o.toUpperCase().includes(x.replace(/_/g, " ")))));

// 15-24 decision integrity
const good = { gate_id: req.gate_id, request_digest: digest(req), anti_replay_nonce: "nonce123", selected_option: "ACTIVATE_SAFE_NARROW_ALLOWLIST", exact_sha: "s", action: "a", one_time_use: true, deciding_authority: "founder", decision_source: "founder_inbox" };
ok("15 missing decision rejected", verifyDecision(req, null).valid === false);
ok("16/17 expired decision rejected", verifyDecision(req, good, { now: req.expires_at + 1 }).valid === false);
ok("18 wrong gate id rejected", verifyDecision(req, { ...good, gate_id: "other" }).valid === false);
ok("19 wrong SHA rejected", verifyDecision(req, good, { exact_sha: "different" }).valid === false);
ok("20 altered request rejected", verifyDecision({ ...req, title: "changed" }, good).valid === false);
ok("21 replayed decision rejected", verifyDecision(req, { ...good, anti_replay_nonce: "wrong" }).valid === false);
ok("22 duplicate consumption rejected", verifyDecision(req, good, { already_consumed: true }).valid === false);
ok("23 generated decision rejected", verifyDecision(req, { ...good, decision_source: "generated" }).valid === false);
ok("24 builder self-approval rejected", verifyDecision(req, { ...good, deciding_authority: "builder" }).valid === false);
ok("25 valid one-time resolution accepted", verifyDecision(req, good, { now: 1500, exact_sha: "s", expected_action: "a" }).valid === true);

// 30-33 cost classification (modeled vs actual)
ok("30 cost warning at $15", classifyCost(15, ENV).level === "WARNING");
ok("31 cost gate at $25 parks LLM-heavy", classifyCost(25, ENV).action === "park_llm_heavy_and_route_gate");
ok("32 modeled cost not claimed as actual billing", classifyCost(30, ENV).note.includes("NOT actual"));
ok("33 actual new billable spend requires gate", actualSpendRequiresGate(true) === true && actualSpendRequiresGate(false) === false);

// 38 UNKNOWN fails closed
ok("38 unknown gate fails closed to founder gate", classifyGate({ requested_authority: "unknown" }) === "TRUE_FOUNDER_GATE");
ok("38b null request -> UNKNOWN", classifyGate(null) === "UNKNOWN");
ok("39 production authority -> founder gate", classifyGate({ requested_authority: "production deployment" }) === "TRUE_FOUNDER_GATE");
ok("40 operational authority stays autonomous", classifyGate({ requested_authority: "run repo selftests" }) === "OPERATIONAL_AUTONOMOUS");

console.log(`\nFGRI-1 GATE-ROUTER SELFTEST: ${n - fails.length}/${n} passed`);
if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
process.exit(0);
