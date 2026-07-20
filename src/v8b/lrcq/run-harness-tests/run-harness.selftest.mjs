// FounderGate LRCQ — run-harness test matrix (setup pipeline + separation + replay + packet).
import { runSetup, standardChecks, STEP_ORDER } from "../run-harness/setup-pipeline.mjs";
import { SeparationJob } from "../run-harness/separation.mjs";
import { ReplayStream } from "../run-harness/replay.mjs";
import { buildUnsignedPacket } from "../run-harness/activation-packet.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

// ---- SETUP PIPELINE ----
const goodEnv = { host_model: "Mac16,11", repo_origin_ok: true, lrcq_base_ok: true, provider_candidate_ok: true, run_harness_candidate_ok: true, master_digest: "M", expected_master_digest: "M", frr_digest: "F", expected_frr_digest: "F", provider_identity: "ID", expected_provider_identity: "ID", activation: null, activation_bindings: {}, lease: null, lease_bindings: {}, blast_budget: null, active_run: false, lock_acquired: true, run_id: "r", evidence_root: "/ev", ledger_ready: true, replay_ready: true, tx_registry_ready: true, branches_ok: true, worktrees_ok: true, identity_ok: true, controller_real: true, backlog_loaded: true, dep_graph_ok: true, console_started: true, ready_recorded: true, scheduling_allowed: true };
// override the 3 validator-backed steps to pass deterministically for the ordering test
const passChecks = { ...standardChecks(goodEnv), validate_activation_record: () => ({ ok: true }), validate_capability_lease: () => ({ ok: true }), validate_blast_budget: () => ({ ok: true }) };
{ const r = runSetup(passChecks, goodEnv);
  ok("01 all 25 steps run in order and READY", r.ok && r.ready && r.results.length === 25 && r.results.every((x, i) => x.step === STEP_ORDER[i])); }
{ const bad = { ...passChecks, verify_host: () => ({ ok: false, actual: "wrong host" }) }; const r = runSetup(bad, goodEnv);
  ok("02 failed host stops later steps (all after BLOCKED)", r.failed_step === "verify_host" && r.results.slice(1).every((x) => x.status === "BLOCKED")); }
{ const bad = { ...passChecks, verify_provider_identity: () => ({ ok: false }) }; const r = runSetup(bad, goodEnv);
  ok("03 failed provider identity stops later steps", r.failed_step === "verify_provider_identity" && !r.ready); }
{ const bad = { ...passChecks, validate_dependency_graph: () => ({ ok: false }) }; const r = runSetup(bad, goodEnv);
  ok("04 failed dep-graph blocks console/ready/scheduling", r.results.find((x) => x.step === "record_ready").status === "BLOCKED"); }
{ const missing = { ...passChecks }; delete missing.acquire_run_lock; const r = runSetup(missing, goodEnv);
  ok("05 missing verifier fails closed (not silently passed)", r.failed_step === "acquire_run_lock"); }

// ---- BUILDER/CHECKER SEPARATION ----
const B = { session_id: "builder-1", prompt_digest: "pb", read_only: false };
const C = { session_id: "checker-1", prompt_digest: "pc", read_only: true };
{ const j = new SeparationJob("j1"); j.startBuilder(B); j.builderResult(true);
  ok("06 builder exit0 alone does NOT complete (state=MACHINE_VERIFICATION)", j.state === "MACHINE_VERIFICATION");
  let threw = false; try { j.complete(); } catch { threw = true; }
  ok("07 cannot COMPLETE without CHECKER_CLEAN", threw && j.state === "MACHINE_VERIFICATION"); }
{ const j = new SeparationJob("j2"); j.startBuilder(B); j.builderResult(true); j.machineVerification(true); j.startChecker(C); j.checkerResult(true); j.complete();
  ok("08 full flow builder->machine->checker-clean->COMPLETED", j.state === "COMPLETED"); }
{ const j = new SeparationJob("j3"); j.startBuilder(B); j.builderResult(true); j.machineVerification(true);
  let threw = false; try { j.startChecker({ session_id: "builder-1", prompt_digest: "px", read_only: true }); } catch { threw = true; }
  ok("09 checker with builder's session refused (not independent)", threw); }
{ const j = new SeparationJob("j4"); j.startBuilder(B); j.builderResult(true); j.machineVerification(true);
  let threw = false; try { j.startChecker({ session_id: "checker-x", prompt_digest: "pb", read_only: true }); } catch { threw = true; }
  ok("10 checker with builder's prompt digest refused", threw); }
{ const j = new SeparationJob("j5"); j.startBuilder(B); j.builderResult(true); j.machineVerification(true);
  let threw = false; try { j.startChecker({ session_id: "c", prompt_digest: "pc", read_only: false }); } catch { threw = true; }
  ok("11 non-read-only checker refused", threw); }
{ const j = new SeparationJob("j6", 3);
  for (let i = 0; i < 3; i++) { j.startBuilder(B); j.builderResult(true); j.machineVerification(true); j.startChecker({ session_id: "c" + i, prompt_digest: "pc" + i, read_only: true }); j.checkerResult(false); }
  ok("12 park after 3 checker-finding cycles", j.state === "PARKED"); }
{ const j = new SeparationJob("j7"); ok("13 job can never merge/accept", j.canMerge() === false && j.canAccept() === false); }

// ---- REPLAY STREAM ----
const mkEv = (o = {}) => ({ run_id: "r", job_id: "j", attempt: 1, role: "builder", provider: "claude-code", model_id: "opus", cli_version: "2.1.215", executable_identity: "id", policy_version: "pv", candidate_stack: "s", prompt_digest: "pd", allowed_tools_digest: "ad", denied_tools_digest: "dd", lease_digest: "ld", blast_budget_digest: "bd", stdout_digest: "od", stderr_digest: "ed", transcript_digest: "td", branch: "lane/j", worktree: "/wt/j", pre_fingerprint: "pf", post_fingerprint: "pf2", checkpoint_before: "cb", checkpoint_after: "ca", transaction_state: "SEALED", reconciliation_state: "RESULT_COMPLETE", evidence_path: "/ev", timestamp: 1, ...o });
{ const rs = new ReplayStream("r"); rs.append(mkEv()); rs.append(mkEv({ timestamp: 2 })); rs.append(mkEv({ timestamp: 3 }));
  ok("14 append-only chain verifies", rs.verifyChain().ok && rs.records.length === 3); }
{ const rs = new ReplayStream("r"); rs.append(mkEv()); rs.append(mkEv({ timestamp: 2 }));
  rs.records[0].timestamp = 999; // tamper
  ok("15 tampered event detected (digest mismatch)", rs.verifyChain().ok === false); }
{ const rs = new ReplayStream("r"); rs.append(mkEv()); rs.records.splice(0, 0, { ...mkEv({ timestamp: 0 }), seq: 99, prev: "x", digest: "y" }); // insert
  ok("16 inserted event detected (chain break)", rs.verifyChain().ok === false); }
{ const rs = new ReplayStream("r"); rs.append(mkEv()); rs.append(mkEv({ run_id: "OTHER", timestamp: 2 }));
  ok("17 other-run event not current", rs.currentEvents("r").length === 1); }
{ const rs = new ReplayStream("r"); let threw = false; try { rs.append({ ...mkEv(), api_key: "sk-secret" }); } catch { threw = true; }
  ok("18 refuses to record a raw secret field", threw); }

// ---- UNSIGNED ACTIVATION PACKET ----
{ const resolved = { lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "H", run_harness_candidate_tree: "HT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_executable_path: "/claude", provider_version: "2.1.215", provider_executable_identity: "ID", policy_version: "pv", capability_lease_digest: "LD", blast_radius_budget_digest: "BD" };
  const { packet, would_validate_when_signed, dry_run_refusals } = buildUnsignedPacket(resolved);
  ok("19 packet is UNSIGNED (founder_signature null, unsigned true)", packet.founder_signature === null && packet.unsigned === true);
  ok("20 packet binds three-layer candidate + backlog digests", packet.provider_candidate_sha === "P" && packet.run_harness_candidate_sha === "H" && packet.first_real_run_backlog_digest === "FD");
  ok("21 packet within V3 upper bounds", packet.max_parallel_width <= 3 && packet.max_budget_usd <= 10 && packet.external_calls === 0);
  ok("22 would validate WHEN signed (dry-run)", would_validate_when_signed === true && dry_run_refusals.length === 0); }

console.log("\nLRCQ RUN-HARNESS SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
