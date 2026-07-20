#!/usr/bin/env node
// Deterministic PRODUCTIVE provider stub for the LRCQ end-to-end rehearsal. NO model request.
// Detects its role from the -p prompt (BUILDER vs CHECKER), reads its identity from ./identity.json
// (as a real worker would be told its identity in the prompt), and emits a schema-valid structured
// stdout object. Builder writes ONLY to its allowed file. Mode from ./stub-mode drives negatives.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
const argv = process.argv.slice(2);
const pi = argv.indexOf("-p"); const prompt = pi >= 0 ? argv[pi + 1] : "";
const role = /INDEPENDENT CHECKER/.test(prompt) ? "checker" : "builder";
const mode = existsSync("stub-mode") ? readFileSync("stub-mode", "utf8").trim() : "success";
const id = existsSync("identity.json") ? JSON.parse(readFileSync("identity.json", "utf8")) : {};

if (mode === "fail") { process.stderr.write("stub failure\n"); process.exit(1); }
if (mode === "malformed") { process.stdout.write("not-json"); process.exit(0); }
if (mode === "noout") { process.exit(0); }
if (mode === "wrong-role") { // builder emits checker output or vice versa
  process.stdout.write(JSON.stringify({ schema: role === "builder" ? "lrcq-checker-output-1" : "lrcq-builder-output-1", role: role === "builder" ? "checker" : "builder" })); process.exit(0);
}

if (role === "builder") {
  // modify ONLY the allowed file
  if (mode !== "no-change" && id.allowed_file) { try { mkdirSync(dirname(id.allowed_file), { recursive: true }); writeFileSync(id.allowed_file, "// produced by builder for " + id.job_id + " attempt " + id.attempt + "\n"); } catch { /* */ } }
  process.stdout.write(JSON.stringify({
    schema: "lrcq-builder-output-1", role: "builder", run_id: id.run_id, job_id: id.job_id, attempt: id.attempt,
    session_id: id.session_id, prompt_digest: id.prompt_digest, outcome: "SUCCESS",
    changed_files: mode === "no-change" ? [] : [id.allowed_file_rel || "src/x.mjs"], tests_requested: id.tests || [], forbidden_used: [], limitations: [],
  }));
  process.exit(0);
}
// checker: read-only; emit a structured verdict echoing identity + criteria
const verdict = mode === "checker-findings" ? "FINDINGS" : mode === "checker-insufficient" ? "INSUFFICIENT_EVIDENCE" : "CLEAN";
const criteria = [
  { criterion_id: "diff_within_allowed", result: verdict === "CLEAN" ? "PASS" : "FAIL", evidence: "diff" },
  { criterion_id: "tests_executed", result: verdict === "CLEAN" ? "PASS" : "FAIL", evidence: "mv-report" },
  { criterion_id: "evidence_present", result: verdict === "CLEAN" ? "PASS" : "FAIL", evidence: "evidence" },
];
process.stdout.write(JSON.stringify({
  schema: "lrcq-checker-output-1", role: "checker", run_id: id.run_id, job_id: id.job_id, attempt: id.attempt,
  checker_session_id: id.checker_session_id, checker_prompt_digest: id.checker_prompt_digest,
  reviewed_builder_transaction_id: id.builder_transaction_id, reviewed_machine_verifier_digest: id.machine_verifier_digest,
  criteria, verdict, findings: verdict === "FINDINGS" ? ["example finding"] : [], limitations: [],
}));
process.exit(0);
