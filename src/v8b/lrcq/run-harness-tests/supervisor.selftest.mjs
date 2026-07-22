// FounderGate LRCQ — supervisor ownership proof (FG-LRCQ-ACT-015): single owner, PID+heartbeat,
// duplicate refusal, immutable-deadline ownership, terminal state.
import { startSupervisor, readSupervisorState, supervisorAlive } from "../run-harness/supervisor.mjs";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const NOW = 1000, DEADLINE = 1000 + 18000;
const RECEIPT = (o = {}) => ({ activation_id: "sha256:aid", run_id: "REAL-RUN", consumed_once: true, immutable_hard_deadline_epoch: DEADLINE, run_duration_s: 18000, max_budget_usd: 10, ...o });
const D = () => mkdtempSync(join(tmpdir(), "lrcq-sup-"));
const aliveSet = (pids) => ({ aliveProbe: (p) => pids.has(p) });

// 01 start ok -> RUN_ACTIVE + launch receipt + PID + deadline
{ const dir = D(); const r = startSupervisor({ stateDir: dir, run_id: "REAL-RUN", consumerReceipt: RECEIPT(), now: NOW, pid: 4242, ...aliveSet(new Set([4242])) });
  ok("01 supervisor starts RUN_ACTIVE", r.ok && r.launch_receipt.state === "RUN_ACTIVE" && r.launch_receipt.supervisor_pid === 4242 && r.launch_receipt.immutable_hard_deadline_epoch === DEADLINE);
  ok("01b owns deadline/queue/ledger/tree", r.handle.owns.includes("immutable_deadline") && r.handle.owns.includes("cost_ledger")); rmSync(dir, { recursive: true, force: true }); }
// 02 duplicate supervisor (live pid) refused
{ const dir = D(); const alive = new Set([4242]); startSupervisor({ stateDir: dir, run_id: "REAL-RUN", consumerReceipt: RECEIPT(), now: NOW, pid: 4242, aliveProbe: (p) => alive.has(p) });
  const dup = startSupervisor({ stateDir: dir, run_id: "REAL-RUN", consumerReceipt: RECEIPT(), now: NOW + 1, pid: 5555, aliveProbe: (p) => alive.has(p) });
  ok("02 duplicate live supervisor refused", dup.ok === false && dup.duplicate === true && dup.existing_pid === 4242); rmSync(dir, { recursive: true, force: true }); }
// 03 no valid deadline in receipt refused
{ const dir = D(); const r = startSupervisor({ stateDir: dir, run_id: "REAL-RUN", consumerReceipt: RECEIPT({ immutable_hard_deadline_epoch: NOW - 1 }), now: NOW, pid: 1 }); ok("03 elapsed deadline refused", !r.ok && /deadline/.test(r.reason)); rmSync(dir, { recursive: true, force: true }); }
// 04 un-consumed receipt refused
{ const dir = D(); const r = startSupervisor({ stateDir: dir, run_id: "REAL-RUN", consumerReceipt: RECEIPT({ consumed_once: false }), now: NOW, pid: 1 }); ok("04 non-consumed receipt refused", !r.ok); rmSync(dir, { recursive: true, force: true }); }
// 05 heartbeat updates durably; deadline cannot change
{ const dir = D(); const r = startSupervisor({ stateDir: dir, run_id: "REAL-RUN", consumerReceipt: RECEIPT(), now: NOW, pid: 4242, ...aliveSet(new Set([4242])) });
  r.handle.heartbeat(NOW + 120); const s = readSupervisorState(dir, "REAL-RUN");
  ok("05 heartbeat advanced + deadline immutable", s.heartbeat_epoch === NOW + 120 && s.immutable_hard_deadline_epoch === DEADLINE); rmSync(dir, { recursive: true, force: true }); }
// 06 terminal state written; RUN_ACTIVE cannot be set as terminal; restart after terminal refused
{ const dir = D(); const r = startSupervisor({ stateDir: dir, run_id: "REAL-RUN", consumerReceipt: RECEIPT(), now: NOW, pid: 4242, ...aliveSet(new Set([4242])) });
  r.handle.setTerminal("STOPPED_EXHAUSTED", "queue drained"); const s = readSupervisorState(dir, "REAL-RUN");
  ok("06 terminal state durable", s.state === "STOPPED_EXHAUSTED");
  let threw = false; try { r.handle.setTerminal("RUN_ACTIVE"); } catch { threw = true; } ok("06b cannot set RUN_ACTIVE as terminal", threw);
  const re = startSupervisor({ stateDir: dir, run_id: "REAL-RUN", consumerReceipt: RECEIPT(), now: NOW + 5, pid: 9, aliveProbe: () => false });
  ok("06c re-start after terminal refused", re.ok === false && re.terminal === "STOPPED_EXHAUSTED"); rmSync(dir, { recursive: true, force: true }); }
// 07 crashed supervisor (RUN_ACTIVE, pid dead) -> NOT silently re-owned; needs founder-gated recovery
{ const dir = D(); startSupervisor({ stateDir: dir, run_id: "REAL-RUN", consumerReceipt: RECEIPT(), now: NOW, pid: 4242, aliveProbe: () => false /* now dead */ });
  const re = startSupervisor({ stateDir: dir, run_id: "REAL-RUN", consumerReceipt: RECEIPT(), now: NOW + 5, pid: 7, aliveProbe: () => false });
  ok("07 stale-active (crashed) not silently re-owned", re.ok === false && re.stale_active === true); rmSync(dir, { recursive: true, force: true }); }
// 08 corrupt existing state fails closed
{ const dir = D(); const sp = join(dir, "supervisor-REAL-RUN.state.json"); writeFileSync(sp, "{bad"); const r = startSupervisor({ stateDir: dir, run_id: "REAL-RUN", consumerReceipt: RECEIPT(), now: NOW, pid: 1 });
  ok("08 corrupt supervisor state fails closed", r.ok === false && /corrupt/.test(r.reason)); rmSync(dir, { recursive: true, force: true }); }

console.log("\nLRCQ SUPERVISOR SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
