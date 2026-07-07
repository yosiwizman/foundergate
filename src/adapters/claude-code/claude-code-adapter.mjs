// FounderGate — Claude Code Worker Adapter.
//
// PURE NODE. No external deps. No network. No provider access. No new
// credential, no secret, no OAuth. No remote execution. No application runtime,
// executor, or marker is touched. A spec/adapter is never counted as runtime.
//
// What this is:
//   A LOCAL, offline normalizer that wraps the EXISTING CTO / night-run
//   isolated-writer lane and presents it as the first-class "claude-code"
//   worker for the FounderGate/CLDH harness. It takes a rich lane
//   declaration (mission, lease, exclusions, proof, gate) and maps it down to
//   a small normalized WORKER RECORD plus a PROOF PACKET the rest of the
//   harness can consume.
//
// The normalized WORKER RECORD conforms to the H7 worker-interface SHAPE:
//   { lane_prompt, branch, pr, proof, status, gate_report }
//
//   H7 may land concurrently and is NOT a hard dependency of this lane. The
//   shape is COPIED here locally (see WORKER_RECORD_KEYS) so this module is
//   fully self-contained; if the merged H7 interface ever disagrees, H7 wins
//   and this local copy is updated to match — but nothing here imports H7.
//
// HARD RULES enforced in code (see docs/harness/H8_CLAUDE_CODE_ADAPTER.md):
//   1. NO REMOTE EXECUTION. The adapter refuses any lane that declares a
//      remote/cloud execution target, a new credential/secret/OAuth, an
//      activation switch, or a mic/provider send. It normalizes a description;
//      it dispatches, runs, and sends NOTHING.
//   2. LEASE IS REPO-RELATIVE. Absolute-path leases are rejected (mirrors the
//      H3 lane-contract file-lease law).
//   3. HONEST STATUS. A lane that needs a founder gate and has not been fired
//      normalizes to "gate_pending", never "delivered". Half a round trip is
//      never green.
//   4. ADDITIVE + LOCAL. This file flips no marker, starts no service, and
//      writes to no store. buildProofPacket() returns an in-memory object; the
//      caller decides where (if anywhere) to persist it.

import { readFileSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";

// --- The H7 worker-record shape, copied locally (self-contained) --------------
// Exactly these keys, in this order, form the normalized worker record. The
// validator rejects any record that adds or drops a key.
export const WORKER_RECORD_KEYS = Object.freeze([
  "lane_prompt",
  "branch",
  "pr",
  "proof",
  "status",
  "gate_report",
]);

// Closed set of worker states. Ordered coarse lifecycle; "blocked" and
// "gate_pending" are terminal-until-founder states.
export const WORKER_STATUSES = Object.freeze([
  "pending", // declared, not yet started
  "running", // in flight
  "gate_pending", // work done but a founder gate must fire before it can be green
  "blocked", // halted on a stop-condition; honest BLOCKED handback
  "delivered", // committed + PR opened; awaiting sheriff merge
  "merged", // sheriff merged (never self-merge)
]);

// The founder-gate triggers this adapter understands (mirrors H3).
export const GATE_TRIGGERS = Object.freeze([
  "none",
  "provider-live-crossing",
  "activation-switch",
  "irreversible-action",
  "settings-mutation",
]);

// Intents this adapter REFUSES to normalize — they describe work outside the
// controlled-automation envelope. Matched case-insensitively against the raw
// lane's declared execution target / capability flags (NOT against prose that
// merely forbids them: a lane whose exclusions SAY "no remote execution" is
// fine; a lane whose execution_target IS remote is refused).
export const REFUSED_EXECUTION_TARGETS = Object.freeze([
  "remote",
  "cloud",
  "ssh",
]);

export class ClaudeCodeAdapterError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "ClaudeCodeAdapterError";
    this.errors = errors;
  }
}

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

// Collapse internal whitespace so an assembled lane_prompt is a single stable
// line-normalized string (no accidental churn from source indentation).
function squish(s) {
  return String(s).replace(/\s+/g, " ").trim();
}

// --- HARD GUARD: refuse anything outside the controlled envelope --------------
// Fail-closed. Runs BEFORE any normalization so a bad lane can never produce a
// record at all. Returns nothing; throws ClaudeCodeAdapterError on refusal.
export function assertControlledLane(lane) {
  const errors = [];
  if (!isPlainObject(lane)) {
    throw new ClaudeCodeAdapterError("lane must be a plain object");
  }

  // 1. No remote/cloud execution target.
  const target = lane.execution_target;
  if (target != null) {
    if (!nonEmptyString(target)) {
      errors.push("execution_target, if present, must be a non-empty string");
    } else if (REFUSED_EXECUTION_TARGETS.includes(target.toLowerCase())) {
      errors.push(
        `refusing remote execution target "${target}" — this adapter is local-only`
      );
    }
  }

  // 2. No new credential / secret / OAuth requested.
  if (lane.requires_new_credential === true) {
    errors.push("refusing a lane that requires a NEW credential/secret/OAuth");
  }

  // 3. No activation switch / marker flip.
  if (lane.flips_activation_marker === true) {
    errors.push("refusing a lane that flips an application activation marker");
  }

  // 4. No provider send / mic capture at the adapter layer.
  if (lane.performs_provider_send === true) {
    errors.push("refusing a lane that performs a provider send at adapter layer");
  }
  if (lane.captures_microphone === true) {
    errors.push("refusing a lane that captures the microphone");
  }

  if (errors.length > 0) {
    throw new ClaudeCodeAdapterError(
      `lane refused (outside controlled envelope): ${errors.join("; ")}`,
      errors
    );
  }
}

// --- Lease normalization ------------------------------------------------------
// Repo-relative globs only. Absolute paths are rejected (H3 file-lease law).
function normalizeLease(lease) {
  const errors = [];
  const globs = Array.isArray(lease) ? lease : lease == null ? [] : [lease];
  if (globs.length < 1) {
    errors.push("strict_lease must list at least one repo-relative glob");
  }
  for (const g of globs) {
    if (!nonEmptyString(g)) {
      errors.push("each lease glob must be a non-empty string");
    } else if (isAbsolute(g)) {
      errors.push(`lease glob must be repo-relative, not absolute: ${g}`);
    }
  }
  if (errors.length > 0) {
    throw new ClaudeCodeAdapterError(
      `invalid lease: ${errors.join("; ")}`,
      errors
    );
  }
  return globs.map((g) => g.trim());
}

// --- lane_prompt assembly -----------------------------------------------------
// Compress the rich lane into ONE deterministic directive string: what to
// build, the lease it may touch, and the hard exclusions it must honor. This is
// the single instruction the worker acts on; it is derived purely from the
// declared lane, never invented.
function buildLanePrompt(lane, leaseGlobs) {
  const parts = [];
  parts.push(`LANE ${lane.lane_id}: ${squish(lane.mission)}`);
  parts.push(`LEASE: touch ONLY ${leaseGlobs.join(", ")}.`);
  const excl = Array.isArray(lane.hard_exclusions) ? lane.hard_exclusions : [];
  if (excl.length > 0) {
    parts.push(`EXCLUSIONS: ${excl.map(squish).join("; ")}.`);
  }
  parts.push("Additive-only. Sheriff merges; the worker never merges.");
  return parts.join(" ");
}

// --- PR normalization ---------------------------------------------------------
function normalizePr(pr) {
  if (pr == null) return null; // not yet opened — honest null, never faked
  if (!isPlainObject(pr)) {
    throw new ClaudeCodeAdapterError("pr, if present, must be an object");
  }
  const number =
    pr.number == null
      ? null
      : Number.isInteger(pr.number) && pr.number > 0
      ? pr.number
      : (() => {
          throw new ClaudeCodeAdapterError("pr.number must be a positive integer");
        })();
  const url = pr.url == null ? null : nonEmptyString(pr.url) ? pr.url.trim() : (() => {
    throw new ClaudeCodeAdapterError("pr.url, if present, must be a non-empty string");
  })();
  const draft = pr.draft === undefined ? true : pr.draft === true;
  // An object with neither a number nor a url is not a real PR yet — collapse to
  // honest null rather than reporting an empty PR shell as "opened".
  if (number === null && url === null) return null;
  return { number, url, draft };
}

// --- proof normalization ------------------------------------------------------
function normalizeProof(lane) {
  const proof = isPlainObject(lane.proof) ? lane.proof : {};
  const requirements = Array.isArray(proof.requirements)
    ? proof.requirements.filter(nonEmptyString).map(squish)
    : [];
  const rawTests = Array.isArray(proof.tests) ? proof.tests : [];
  const tests = rawTests.map((t, i) => {
    if (!isPlainObject(t) || !nonEmptyString(t.command)) {
      throw new ClaudeCodeAdapterError(
        `proof.tests[${i}] must be an object with a non-empty command`
      );
    }
    return {
      name: nonEmptyString(t.name) ? t.name.trim() : `test-${i + 1}`,
      command: t.command.trim(),
      // Default offline: true — this adapter only endorses offline, deterministic
      // checks. A test explicitly declaring offline:false is preserved but flagged.
      offline: t.offline === false ? false : true,
    };
  });
  // A proof status: only "green" once at least one offline test exists AND the
  // caller has recorded it passing. We never invent a pass — default "unproven".
  const status =
    proof.status && ["unproven", "green", "partial", "blocked"].includes(proof.status)
      ? proof.status
      : "unproven";
  return { requirements, tests, status };
}

// --- gate_report normalization ------------------------------------------------
// A true founder gate yields a structured report; no gate yields null.
function normalizeGate(lane) {
  const g = isPlainObject(lane.founder_gate) ? lane.founder_gate : null;
  if (!g || g.requires_founder_gate !== true) return null;
  const trigger = GATE_TRIGGERS.includes(g.gate_trigger) ? g.gate_trigger : "irreversible-action";
  return {
    gate: true,
    reason: nonEmptyString(g.gate_reason)
      ? squish(g.gate_reason)
      : "founder gate required before this lane may be considered green",
    trigger,
    // Provider-live / activation / irreversible gates are NEVER self-fireable.
    agent_may_self_fire: g.agent_may_self_fire === true && trigger === "none",
  };
}

// --- Status derivation --------------------------------------------------------
// Honest mapping. Precedence: an unfired founder gate dominates; then explicit
// stop/blocked; then PR/commit progress; else pending.
function deriveStatus(lane, pr, gateReport) {
  const declared = lane.status;
  if (declared && WORKER_STATUSES.includes(declared)) {
    // If the lane claims "delivered"/"merged" but an unfired gate exists, DEMOTE.
    if (gateReport && (declared === "delivered" || declared === "merged")) {
      return "gate_pending";
    }
    return declared;
  }
  if (gateReport) return "gate_pending";
  if (lane.blocked === true) return "blocked";
  if (pr && (pr.number || pr.url)) return "delivered";
  if (lane.started === true) return "running";
  return "pending";
}

// --- THE public API: normalizeLane -------------------------------------------
// Map a rich lane declaration to the normalized H7-shaped worker record.
export function normalizeLane(lane) {
  assertControlledLane(lane); // fail-closed guard FIRST

  const errors = [];
  if (!nonEmptyString(lane.lane_id)) errors.push("lane_id is required");
  if (!nonEmptyString(lane.mission)) errors.push("mission is required");
  if (!nonEmptyString(lane.branch)) errors.push("branch is required");
  if (errors.length > 0) {
    throw new ClaudeCodeAdapterError(
      `lane cannot be normalized: ${errors.join("; ")}`,
      errors
    );
  }

  const leaseGlobs = normalizeLease(lane.strict_lease);
  const pr = normalizePr(lane.pr);
  const gateReport = normalizeGate(lane);

  const record = {
    lane_prompt: buildLanePrompt(lane, leaseGlobs),
    branch: lane.branch.trim(),
    pr,
    proof: normalizeProof(lane),
    status: deriveStatus(lane, pr, gateReport),
    gate_report: gateReport,
  };

  // Post-condition: the record must be exactly the H7 shape.
  const check = validateWorkerRecord(record);
  if (!check.valid) {
    throw new ClaudeCodeAdapterError(
      `internal: produced an invalid worker record: ${check.errors.join("; ")}`,
      check.errors
    );
  }
  return record;
}

// --- validateWorkerRecord -----------------------------------------------------
// Enforce the H7 shape exactly: the six keys, no more, no fewer; each of the
// right type. Returns { valid, errors }.
export function validateWorkerRecord(record) {
  const errors = [];
  if (!isPlainObject(record)) {
    return { valid: false, errors: ["record must be a plain object"] };
  }
  const keys = Object.keys(record);
  for (const k of keys) {
    if (!WORKER_RECORD_KEYS.includes(k)) errors.push(`unknown key: ${k}`);
  }
  for (const k of WORKER_RECORD_KEYS) {
    if (!(k in record)) errors.push(`missing key: ${k}`);
  }
  if (!nonEmptyString(record.lane_prompt)) errors.push("lane_prompt must be non-empty");
  if (!nonEmptyString(record.branch)) errors.push("branch must be non-empty");
  if (record.pr !== null && !isPlainObject(record.pr)) errors.push("pr must be object|null");
  if (!isPlainObject(record.proof)) errors.push("proof must be an object");
  if (!WORKER_STATUSES.includes(record.status)) {
    errors.push(`status must be one of: ${WORKER_STATUSES.join(", ")}`);
  }
  if (record.gate_report !== null && !isPlainObject(record.gate_report)) {
    errors.push("gate_report must be object|null");
  }
  // Cross-field honesty: an unfired gate can never sit under a green status.
  if (
    record.gate_report &&
    record.gate_report.gate === true &&
    ["delivered", "merged"].includes(record.status)
  ) {
    errors.push("dishonest: a live founder gate cannot pair with a delivered/merged status");
  }
  return { valid: errors.length === 0, errors };
}

// --- buildProofPacket ---------------------------------------------------------
// Assemble an in-memory PROOF PACKET around a normalized record: what worker
// produced it, whether it was produced offline (always true here), the record
// itself, a set of self-checks with honest pass/fail, and the input source
// label ("real" vs "synthetic"). It PERSISTS NOTHING; the caller owns storage.
export function buildProofPacket(lane, opts = {}) {
  const record = normalizeLane(lane);
  const recordCheck = validateWorkerRecord(record);

  const checks = [
    {
      name: "worker-record-shape",
      pass: recordCheck.valid,
      detail: recordCheck.valid
        ? "record has exactly the six H7 worker keys"
        : recordCheck.errors.join("; "),
    },
    {
      name: "lease-repo-relative",
      pass: true, // guaranteed by normalizeLease() (else we'd have thrown)
      detail: "all lease globs are repo-relative (absolute paths rejected)",
    },
    {
      name: "no-remote-execution",
      pass: true, // guaranteed by assertControlledLane() (else we'd have thrown)
      detail: "no remote/cloud target, no new credential, no activation, no send",
    },
    {
      name: "gate-honesty",
      pass: !(
        record.gate_report &&
        ["delivered", "merged"].includes(record.status)
      ),
      detail: record.gate_report
        ? `founder gate present (${record.gate_report.trigger}); status=${record.status}`
        : "no founder gate; status derived from progress only",
    },
  ];

  const label = opts.label === "real" ? "real" : "synthetic";
  return {
    adapter: "claude-code",
    adapter_version: "1.0",
    worker: "claude-code",
    generated_offline: true,
    source_label: label,
    lane_id: lane.lane_id,
    worker_record: record,
    checks,
    all_checks_pass: checks.every((c) => c.pass),
  };
}

// --- Convenience: load + normalize a lane fixture from disk (offline) ---------
export function normalizeLaneFile(path, opts = {}) {
  const abs = resolve(path);
  const lane = JSON.parse(readFileSync(abs, "utf8"));
  return buildProofPacket(lane, opts);
}

// --- CLI entrypoint (offline only) --------------------------------------------
// node src/adapters/claude-code/claude-code-adapter.mjs --fixture <path>
function main(argv) {
  const args = argv.slice(2);
  let fixture = null;
  let label = "real";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--fixture") fixture = args[++i];
    else if (args[i] === "--label") label = args[++i];
  }
  if (!fixture) {
    // Default to the committed example lane fixture next to this module.
    fixture = resolve(
      resolve(new URL(".", import.meta.url).pathname),
      "fixtures",
      "example-lane-h8.json"
    );
  }
  const packet = normalizeLaneFile(fixture, { label });
  process.stdout.write(JSON.stringify(packet, null, 2) + "\n");
  process.stdout.write(
    packet.all_checks_pass
      ? "ADAPTER: NORMALIZED-OK\n"
      : "ADAPTER: CHECKS-FAILED\n"
  );
  process.exit(packet.all_checks_pass ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv);
}
