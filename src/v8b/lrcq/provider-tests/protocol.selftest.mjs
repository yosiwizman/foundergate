// FounderGate LRCQ — identity-envelope (FG-LRCQ-ACT-009) + transport-envelope (Phase 3) protocol.
import { buildIdentityEnvelope, validateEnvelope, promptContractDigest, renderPrompt, renderedPromptDigest, parseIdentityFromPrompt, IDENTITY_ENVELOPE_SCHEMA } from "../provider/identity-envelope.mjs";
import { parseTransport, wrapTransport } from "../provider/transport-envelope.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const F = (over = {}) => ({ role: "builder", run_id: "R", job_id: "j1", attempt: 1, session_id: "s1", candidate_sha: "SHA", candidate_tree: "TREE", backlog_digest: "sha256:b", resolved_plan_digest: "sha256:p", branch: "lane/real-run-R-j1", worktree: "/wt/R/j1", lease_id: "L", lease_digest: "sha256:l", allowed_tools_digest: "sha256:a", denied_tools_digest: "sha256:d", evidence_path: "/ev/j1", deadline_epoch: 9e12, session_cost_cap_usd: 0.25, ...over });

// ---- identity envelope ----
ok("01 valid builder envelope validates", validateEnvelope(buildIdentityEnvelope(F())).valid === true);
ok("02 missing field refused", validateEnvelope(buildIdentityEnvelope(F({ run_id: "" }))).valid === false);
ok("03 checker envelope requires builder tx + mv digest", validateEnvelope(buildIdentityEnvelope(F({ role: "checker" }))).valid === false && validateEnvelope(buildIdentityEnvelope(F({ role: "checker", builder_transaction_id: "tx", machine_verifier_report_digest: "sha256:m" }))).valid === true);
// non-recursive prompt contract: digest over identity+instructions, NOT the rendered prompt
{ const env = buildIdentityEnvelope(F()); const instr = "do the fixture work";
  const pcd = promptContractDigest(env, instr);
  const prompt = renderPrompt(env, instr);
  ok("04 prompt_contract_digest is stable + independent of rendered text", pcd === promptContractDigest(env, instr) && pcd.startsWith("sha256:"));
  ok("05 rendered_prompt_digest differs from prompt_contract_digest (separate)", renderedPromptDigest(prompt) !== pcd);
  ok("06 rendered prompt embeds identity + the contract digest", prompt.includes(pcd) && prompt.includes(env.session_id) && prompt.includes(env.job_id));
  // worker reads identity from the rendered prompt — NO identity.json
  const read = parseIdentityFromPrompt(prompt);
  ok("07 worker recovers exact identity + contract digest from the rendered prompt (no identity.json)", read && read.identity.session_id === "s1" && read.identity.job_id === "j1" && read.prompt_contract_digest === pcd); }
ok("08 every required binding value is present in the rendered prompt", (() => { const env = buildIdentityEnvelope(F()); const p = renderPrompt(env, "x"); return ["R", "j1", "s1", "lane/real-run-R-j1", "SHA", "TREE"].every((v) => p.includes(v)); })());

// ---- transport envelope ----
{ const payload = { schema: "lrcq-builder-output-1", role: "builder", run_id: "R", job_id: "j1", attempt: 1 };
  const wrapped = wrapTransport(payload, 0.2);
  const r = parseTransport(wrapped);
  ok("09 supported transport parses -> payload + cost separated", r.ok === true && r.payload.role === "builder" && r.cost_usd === 0.2 && r.payload_digest !== r.transport_digest);
  ok("10 unknown envelope type refused", parseTransport(JSON.stringify({ type: "assistant", result: "{}" })).ok === false);
  ok("11 ambiguous (array) transport refused", parseTransport(JSON.stringify([{ type: "result", result: "{}" }])).ok === false);
  ok("12 non-JSON transport refused", parseTransport("not json").ok === false);
  ok("13 error transport refused", parseTransport(JSON.stringify({ type: "result", is_error: true, result: "{}", total_cost_usd: 0 })).ok === false);
  ok("14 malformed cost metadata refused", parseTransport(JSON.stringify({ type: "result", result: "{}" })).ok === false);
  ok("15 non-JSON model payload refused", parseTransport(JSON.stringify({ type: "result", result: "not-json", total_cost_usd: 0.1 })).ok === false);
  ok("16 absent result refused", parseTransport(JSON.stringify({ type: "result", result: "", total_cost_usd: 0.1 })).ok === false); }

console.log("\nLRCQ PROTOCOL SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
