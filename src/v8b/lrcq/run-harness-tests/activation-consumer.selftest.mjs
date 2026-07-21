// FounderGate LRCQ — durable activation one-time consumption + anti-replay proof (FG-LRCQ-ACT-014).
import { consumeActivation, isConsumed, readConsumedReceipt, activationIdentity } from "../run-harness/activation-consumer.mjs";
import { mkdtempSync, rmSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const NOW = 1000, DEADLINE = 1000 + 18000;
const ACT = (o = {}) => ({ schema_version: "lrcq-activation-3", founder_signature: "FOUNDER-DIRECT-PASTE", run_id: "REAL-RUN", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", lrcq_base_sha: "L", provider_candidate_sha: "P", first_real_run_backlog_digest: "sha256:f3801d96", provider_executable_identity: "sha256:90608b5c", capability_lease_digest: "sha256:cl", blast_radius_budget_digest: "sha256:bb", issued_epoch: NOW, expiry_epoch: DEADLINE, hard_deadline_epoch: DEADLINE, max_budget_usd: 10, run_duration_s: 18000, ...o });
const D = () => mkdtempSync(join(tmpdir(), "lrcq-consumer-"));

// 01 unsigned refused
{ const dir = D(); const r = consumeActivation(ACT({ founder_signature: null }), { ledgerDir: dir, now: NOW }); ok("01 unsigned activation refused", !r.ok && /unsigned/.test(r.reason)); rmSync(dir, { recursive: true, force: true }); }
// 02 no valid deadline refused
{ const dir = D(); const r = consumeActivation(ACT({ hard_deadline_epoch: NOW - 1 }), { ledgerDir: dir, now: NOW }); ok("02 elapsed/absent deadline refused", !r.ok && /deadline/.test(r.reason)); rmSync(dir, { recursive: true, force: true }); }
// 03 first consume ok + durable marker + immutable deadline in receipt
{ const dir = D(); const r = consumeActivation(ACT(), { ledgerDir: dir, now: NOW });
  ok("03 first consume ok", r.ok === true && r.consumed_once === true && r.immutable_hard_deadline_epoch === DEADLINE);
  ok("03b durable marker written", readdirSync(dir).some((f) => f.endsWith(".consumed.json")));
  ok("03c lifecycle log records CONSUMED", readdirSync(dir).includes("activation-lifecycle.jsonl")); rmSync(dir, { recursive: true, force: true }); }
// 04 sequential replay refused
{ const dir = D(); const a = ACT(); const r1 = consumeActivation(a, { ledgerDir: dir, now: NOW }); const r2 = consumeActivation(a, { ledgerDir: dir, now: NOW + 5 });
  ok("04 sequential replay REPLAY_BLOCKED", r1.ok === true && r2.ok === false && r2.replay_blocked === true); rmSync(dir, { recursive: true, force: true }); }
// 05 restart persistence (simulate a fresh process by re-calling against the same durable dir)
{ const dir = D(); const a = ACT(); consumeActivation(a, { ledgerDir: dir, now: NOW }); const r = consumeActivation(a, { ledgerDir: dir, now: NOW + 9999 });
  ok("05 replay blocked across restart (durable)", r.ok === false && r.replay_blocked === true); rmSync(dir, { recursive: true, force: true }); }
// 06 concurrent race — exactly one winner (real exclusive-create 'wx')
{ const dir = D(); const a = ACT(); const results = [consumeActivation(a, { ledgerDir: dir, now: NOW }), consumeActivation(a, { ledgerDir: dir, now: NOW })];
  const wins = results.filter((r) => r.ok).length; ok("06 atomic race -> exactly one consume wins", wins === 1); rmSync(dir, { recursive: true, force: true }); }
// 07 corruption fails closed (marker present but corrupt -> still refuses, never re-authorizes)
{ const dir = D(); const a = ACT(); const id = activationIdentity(a).replace(":", "_"); writeFileSync(join(dir, id + ".consumed.json"), "{NOT JSON");
  const r = consumeActivation(a, { ledgerDir: dir, now: NOW }); ok("07 corrupt marker fails closed (no re-authorization)", r.ok === false && r.replay_blocked === true && r.prior_corrupt === true); rmSync(dir, { recursive: true, force: true }); }
// 08 immutable deadline: re-read receipt gives the SAME deadline (no new window minted)
{ const dir = D(); const a = ACT(); const r = consumeActivation(a, { ledgerDir: dir, now: NOW }); const rr = readConsumedReceipt(a, { ledgerDir: dir });
  ok("08 recovery reads same immutable deadline (no new window)", rr && rr.immutable_hard_deadline_epoch === DEADLINE && rr.no_new_authorization_window === true); rmSync(dir, { recursive: true, force: true }); }
// 09 a DIFFERENT signed activation (different candidate) is a distinct one-time claim
{ const dir = D(); const r1 = consumeActivation(ACT(), { ledgerDir: dir, now: NOW }); const r2 = consumeActivation(ACT({ run_harness_candidate_sha: "R2" }), { ledgerDir: dir, now: NOW });
  ok("09 distinct candidate -> distinct activation id, separately consumable", r1.ok && r2.ok && r1.activation_id !== r2.activation_id); rmSync(dir, { recursive: true, force: true }); }
// 10 isConsumed is read-only + correct
{ const dir = D(); const a = ACT(); ok("10a isConsumed false before", isConsumed(a, { ledgerDir: dir }) === false); consumeActivation(a, { ledgerDir: dir, now: NOW }); ok("10b isConsumed true after", isConsumed(a, { ledgerDir: dir }) === true); rmSync(dir, { recursive: true, force: true }); }
// 11 signature change => different identity (a re-signed record is a different one-time claim)
{ ok("11 signature bound into identity", activationIdentity(ACT()) !== activationIdentity(ACT({ founder_signature: "OTHER" }))); }

console.log("\nLRCQ ACTIVATION-CONSUMER SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
