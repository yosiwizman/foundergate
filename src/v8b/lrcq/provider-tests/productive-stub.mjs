#!/usr/bin/env node
// TEST-ONLY: answer the provider-binding version check (FG-LRCQ-ACT-022) deterministically.
if (process.argv.includes("--version")) { console.log("stub-1"); process.exit(0); }
// Deterministic PRODUCTIVE provider stub for the LRCQ end-to-end rehearsal. NO model request.
// PROTOCOL mode (FG-LRCQ-ACT-009): identity is recovered ONLY from the rendered prompt (no
// identity.json); output is wrapped in the documented CLI transport envelope with a deterministic
// cost. LEGACY mode (older rehearsal): identity from identity.json; raw payload. Mode from ./stub-mode.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parseIdentityFromPrompt } from "../provider/identity-envelope.mjs";
import { wrapTransport } from "../provider/transport-envelope.mjs";

const argv = process.argv.slice(2);
const pi = argv.indexOf("-p"); const prompt = pi >= 0 ? argv[pi + 1] : "";
const role = /INDEPENDENT CHECKER/.test(prompt) ? "checker" : "builder";
const mode = existsSync("stub-mode") ? readFileSync("stub-mode", "utf8").trim() : "success";

if (mode === "fail") { process.stderr.write("stub failure\n"); process.exit(1); }
if (mode === "malformed") { process.stdout.write("not-json"); process.exit(0); }
if (mode === "noout") { process.exit(0); }
if (mode === "unknown-envelope") { process.stdout.write(JSON.stringify({ type: "assistant", result: "{}" })); process.exit(0); }

// PROTOCOL mode: identity strictly from the rendered prompt.
const fromPrompt = parseIdentityFromPrompt(prompt);
const protocol = !!fromPrompt;
const id = protocol ? fromPrompt.identity : (existsSync("identity.json") ? JSON.parse(readFileSync("identity.json", "utf8")) : {});
const pcd = protocol ? fromPrompt.prompt_contract_digest : (id.prompt_contract_digest || null);
// deterministic session cost derived from the per-session cap (never exceeds it)
const cost = protocol ? Math.round((id.session_cost_cap_usd || 0.2) * 0.8 * 100) / 100 : 0.2;
// the allowed output file: PROTOCOL parses it from the prompt instructions; LEGACY from identity.json
function allowedFileFromPrompt() { const m = prompt.match(/Allowed files \(ONLY these\):\s*([^\n]+)/); if (!m) return null; return m[1].split(",")[0].trim(); }
const outFileRel = protocol ? allowedFileFromPrompt() : id.allowed_file_rel;
const outFileAbs = protocol ? outFileRel : id.allowed_file; // protocol writes relative to cwd (=worktree)

const emit = (payload) => process.stdout.write(protocol ? wrapTransport(payload, cost) : JSON.stringify(payload));

if (mode === "wrong-role") { emit({ schema: role === "builder" ? "lrcq-checker-output-1" : "lrcq-builder-output-1", role: role === "builder" ? "checker" : "builder" }); process.exit(0); }

if (role === "builder") {
  if (mode !== "no-change" && outFileAbs) { try { mkdirSync(dirname(outFileAbs), { recursive: true }); writeFileSync(outFileAbs, "// FounderGate LRCQ ENDURANCE_FIXTURE — builder " + id.job_id + " attempt " + id.attempt + "\n"); } catch { /* */ } }
  emit({ schema: "lrcq-builder-output-1", role: "builder", run_id: id.run_id, job_id: id.job_id, attempt: id.attempt, session_id: id.session_id, prompt_digest: id.prompt_digest || id.session_id, prompt_contract_digest: pcd, outcome: "SUCCESS", changed_files: mode === "no-change" ? [] : [outFileRel || "src/x.mjs"], tests_requested: id.tests || [], forbidden_used: [], limitations: [] });
  process.exit(0);
}
// checker: read-only structured verdict
const verdict = mode === "checker-findings" ? "FINDINGS" : mode === "checker-insufficient" ? "INSUFFICIENT_EVIDENCE" : "CLEAN";
const criteria = [
  { criterion_id: "diff_within_allowed", result: verdict === "CLEAN" ? "PASS" : "FAIL", evidence: "diff" },
  { criterion_id: "tests_executed", result: verdict === "CLEAN" ? "PASS" : "FAIL", evidence: "mv-report" },
  { criterion_id: "fixture_marker_present", result: verdict === "CLEAN" ? "PASS" : "FAIL", evidence: "evidence" },
];
emit({ schema: "lrcq-checker-output-1", role: "checker", run_id: id.run_id, job_id: id.job_id, attempt: id.attempt, checker_session_id: id.checker_session_id || id.session_id, checker_prompt_digest: id.checker_prompt_digest || id.session_id, prompt_contract_digest: pcd, reviewed_builder_transaction_id: id.builder_transaction_id, reviewed_machine_verifier_digest: id.machine_verifier_digest || id.machine_verifier_report_digest, criteria, verdict, findings: verdict === "FINDINGS" ? ["example finding"] : [], limitations: [] });
process.exit(0);
