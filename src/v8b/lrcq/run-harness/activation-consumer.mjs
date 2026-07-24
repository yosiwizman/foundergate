// FounderGate LRCQ — durable activation-level ONE-TIME consumption + anti-replay (FG-LRCQ-ACT-014).
// The reviewed harness consumes per-JOB leases in memory; this adds the ACTIVATION-level lifecycle a
// real one-time run requires: a durable, append-only consumed-marker keyed by the exact signed
// activation identity that is claimed ATOMICALLY exactly once and REFUSES replay across sequential
// processes and restarts. Fail-closed: any ambiguity (corrupt/partial marker) refuses. No new authority
// is created — a consumed activation can never be reset to unused, and no new deadline window is minted.
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync, renameSync } from "node:fs";
import { isVerifiedCapability, V4_CODES } from "../assurance/activation-v4.mjs";
import { dirname, join } from "node:path";

export const ACTIVATION_CONSUMER_SCHEMA = "lrcq-activation-consumer-1";

// Canonical serialization (sorted keys) for a stable identity digest.
function canon(v) { if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]"; if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}"; return JSON.stringify(v === undefined ? null : v); }
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

// The activation IDENTITY binds every signing-relevant field, so a different candidate/tree/backlog/
// provider/time/cost/signature yields a different id (and a distinct one-time claim).
export function activationIdentity(activation) {
  const id = {
    schema_version: activation.schema_version, run_id: activation.run_id,
    run_harness_candidate_sha: activation.run_harness_candidate_sha, run_harness_candidate_tree: activation.run_harness_candidate_tree,
    lrcq_base_sha: activation.lrcq_base_sha, provider_candidate_sha: activation.provider_candidate_sha,
    first_real_run_backlog_digest: activation.first_real_run_backlog_digest,
    provider_executable_identity: activation.provider_executable_identity,
    capability_lease_digest: activation.capability_lease_digest, blast_radius_budget_digest: activation.blast_radius_budget_digest,
    issued_epoch: activation.issued_epoch, expiry_epoch: activation.expiry_epoch, hard_deadline_epoch: activation.hard_deadline_epoch,
    max_budget_usd: activation.max_budget_usd, run_duration_s: activation.run_duration_s,
    founder_signature_digest: activation.founder_signature ? sha(String(activation.founder_signature)) : null,
  };
  return sha(canon(id));
}

// Atomically CLAIM the activation exactly once. Returns a durable receipt or a fail-closed refusal.
// `now` and injectable fs ops keep it deterministic + testable. The claim primitive is exclusive-create
// ('wx'): concurrent racers and sequential replays both lose to the single winner.
export function consumeActivation(activation, opts = {}) {
  const ledgerDir = opts.ledgerDir;                                   // durable dir for markers + the append-only log
  if (!ledgerDir) return { ok: false, reason: "no ledger dir" };
  const now = typeof opts.now === "number" ? opts.now : Math.floor(Date.now() / 1000);
  const wxWrite = opts.wxWrite || ((p, c) => writeFileSync(p, c, { flag: "wx" }));   // exclusive create
  const read = opts.read || ((p) => readFileSync(p, "utf8"));
  const has = opts.exists || existsSync;
  const appendLog = opts.appendLog || ((p, line) => appendFileSync(p, line));
  const mkdirp = opts.mkdirp || ((p) => mkdirSync(p, { recursive: true }));

  if (!activation.founder_signature) return { ok: false, reason: "REFUSED: activation is unsigned" };
  if (typeof activation.hard_deadline_epoch !== "number" || activation.hard_deadline_epoch <= now) return { ok: false, reason: "REFUSED: no valid immutable deadline" };

  const activation_id = activationIdentity(activation);
  try { mkdirp(ledgerDir); } catch { /* */ }
  const markerPath = join(ledgerDir, activation_id.replace(":", "_") + ".consumed.json");
  const logPath = join(ledgerDir, "activation-lifecycle.jsonl");

  // Replay refusal (sequential / restart): a marker already present means already consumed.
  if (has(markerPath)) {
    let prior = null; try { prior = JSON.parse(read(markerPath)); } catch { prior = "CORRUPT"; }
    appendLog(logPath, JSON.stringify({ event: "REPLAY_BLOCKED", activation_id, at: now, prior_run_id: prior && prior.run_id }) + "\n");
    return { ok: false, reason: "REPLAY_BLOCKED: activation already consumed", activation_id, replay_blocked: true, prior_corrupt: prior === "CORRUPT" };
  }

  const receipt = {
    schema: ACTIVATION_CONSUMER_SCHEMA, activation_id, run_id: activation.run_id,
    candidate_sha: activation.run_harness_candidate_sha, candidate_tree: activation.run_harness_candidate_tree,
    consumed_epoch: now, immutable_hard_deadline_epoch: activation.hard_deadline_epoch,
    run_duration_s: activation.run_duration_s, max_budget_usd: activation.max_budget_usd,
    consumed_once: true, may_not_be_consumed_again: true, no_new_authorization_window: true,
  };
  // ATOMIC exclusive claim — if two processes race, only one 'wx' create succeeds.
  try { wxWrite(markerPath, JSON.stringify(receipt, null, 2) + "\n"); }
  catch (e) {
    if (e && e.code === "EEXIST") { appendLog(logPath, JSON.stringify({ event: "REPLAY_BLOCKED_RACE", activation_id, at: now }) + "\n"); return { ok: false, reason: "REPLAY_BLOCKED: lost the atomic claim race", activation_id, replay_blocked: true }; }
    return { ok: false, reason: "REFUSED: claim write failed: " + (e && e.message) };
  }
  appendLog(logPath, JSON.stringify({ event: "CONSUMED", activation_id, run_id: activation.run_id, at: now, immutable_hard_deadline_epoch: activation.hard_deadline_epoch }) + "\n");
  return { ok: true, ...receipt, marker_path: markerPath };
}

// FG-LRCQ-ACT-028: the V4 execution consumption path. It REQUIRES a genuine, non-forgeable verified
// capability (from activation-v4 verifyActivation) — a raw activation object or a forged {verified:true}
// object is refused BEFORE any consumed-marker is written. This closes the direct-import consumption
// bypass: importing consumeVerifiedActivation and passing an unverified activation cannot consume.
export function consumeVerifiedActivation(capability, opts = {}) {
  if (!isVerifiedCapability(capability)) return { ok: false, reason: "REFUSED: verified V4 capability required (forged/unverified rejected)", code: V4_CODES.FORGED_CAPABILITY };
  const ledgerDir = opts.ledgerDir; if (!ledgerDir) return { ok: false, reason: "no ledger dir" };
  const now = typeof opts.now === "number" ? opts.now : Math.floor(Date.now() / 1000);
  const wxWrite = opts.wxWrite || ((p, c) => writeFileSync(p, c, { flag: "wx" }));
  const read = opts.read || ((p) => readFileSync(p, "utf8"));
  const has = opts.exists || existsSync;
  const appendLog = opts.appendLog || ((p, line) => appendFileSync(p, line));
  const mkdirp = opts.mkdirp || ((p) => mkdirSync(p, { recursive: true }));
  const activation_id = capability.activation_identity; // derived from the signed payload digest + signature
  try { mkdirp(ledgerDir); } catch { /* */ }
  const markerPath = join(ledgerDir, activation_id.replace(":", "_") + ".consumed.json");
  const logPath = join(ledgerDir, "activation-lifecycle.jsonl");
  if (has(markerPath)) { appendLog(logPath, JSON.stringify({ event: "REPLAY_BLOCKED", activation_id, at: now }) + "\n"); return { ok: false, reason: "REPLAY_BLOCKED: activation already consumed", activation_id, replay_blocked: true }; }
  const receipt = { schema: "lrcq-activation-consumer-4", activation_id, run_id: capability.run_id, evaluated_candidate: capability.evaluated_candidate, evidence_candidate: capability.evidence_candidate, signer_key_fingerprint: capability.signer_key_fingerprint, authorization_text_digest: capability.authorization_text_digest, payload_digest: capability.payload_digest, consumed_epoch: now, consumed_once: true, may_not_be_consumed_again: true, no_new_authorization_window: true };
  try { wxWrite(markerPath, JSON.stringify(receipt, null, 2) + "\n"); }
  catch (e) { if (e && e.code === "EEXIST") { appendLog(logPath, JSON.stringify({ event: "REPLAY_BLOCKED_RACE", activation_id, at: now }) + "\n"); return { ok: false, reason: "REPLAY_BLOCKED: lost the atomic claim race", activation_id, replay_blocked: true }; } return { ok: false, reason: "REFUSED: claim write failed: " + (e && e.message) }; }
  appendLog(logPath, JSON.stringify({ event: "CONSUMED_V4", activation_id, run_id: capability.run_id, at: now }) + "\n");
  return { ok: true, ...receipt, marker_path: markerPath };
}

// Read-only: is this exact activation already consumed? (used by witness/recovery — never mutates)
export function isConsumed(activation, opts = {}) {
  const ledgerDir = opts.ledgerDir; if (!ledgerDir) return false;
  const has = opts.exists || existsSync;
  return has(join(ledgerDir, activationIdentity(activation).replace(":", "_") + ".consumed.json"));
}

// Read-only recovery: return the durable receipt (immutable deadline included) without creating a window.
export function readConsumedReceipt(activation, opts = {}) {
  const ledgerDir = opts.ledgerDir; if (!ledgerDir) return null;
  const read = opts.read || ((p) => readFileSync(p, "utf8"));
  const p = join(ledgerDir, activationIdentity(activation).replace(":", "_") + ".consumed.json");
  if (!(opts.exists || existsSync)(p)) return null;
  try { return JSON.parse(read(p)); } catch { return { corrupt: true }; }
}
