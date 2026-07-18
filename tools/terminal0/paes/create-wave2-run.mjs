import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
const REPO = process.argv[2]; const SUP = REPO + "/.foundergate/supervisor";
const now = Math.floor(Date.now()/1000);
mkdirSync(SUP + "/worker-results", { recursive: true });
// A freshly-created run is NOT yet activated: clear any stale activation marker
// so the supervisor starts GATED and cannot run jobs until THIS run's live
// qualification passes and consume-and-start writes a new handoff.json. Without
// this a leftover marker would let a fresh supervisor execute jobs
// pre-qualification (the exact pre-qual-worker orphan the gating prevents).
try { rmSync(SUP + "/handoff.json", { force: true }); } catch {}
// wide-safe incomplete items from the completion matrix -> operational jobs
let matrix = {}; try { matrix = JSON.parse(readFileSync(REPO + "/docs/status/V8B_COMPLETION_MATRIX.json")); } catch {}
const wideSafe = (matrix.rows || []).filter(r => r.class === "wide" && ["NOT BUILT","PARTIAL"].includes(r.state));
const jobs = wideSafe.map((r, i) => ({ job_id: `w2-${i+1}-${r.requirement.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}`,
  state: "READY", requirement: r.requirement, risk_class: "wide_safe",
  prompt: `FounderGate Wave-2 job for requirement "${r.requirement}". Work only under your assigned lane branch; commit locally; do NOT push or merge (Terminal-0 owns merges). If you need broader permission, stop and report it (do not ask an interactive question).` }));
const runId = "v8b-wave-2-" + now;
const blueprintDigest = "sha256:" + createHash("sha256").update(JSON.stringify(jobs)).digest("hex");
writeFileSync(SUP + "/queue.json", JSON.stringify({ schema: "supervisor-queue", run_id: runId, jobs, updated_at: new Date(now*1000).toISOString() }, null, 2) + "\n");
writeFileSync(SUP + "/current-cycle.json", JSON.stringify({ run_id: runId, start: now, deadline: now + 9*3600, drain_start: now + 8*3600 + 45*60, blueprint_digest: blueprintDigest }, null, 2) + "\n");
// ORC-1R: write the immutable recovery checkpoint + original deadline; init journal; clear clean-stop.
const REC = REPO + "/.foundergate/recovery"; try { mkdirSync(REC,{recursive:true}); } catch {}
writeFileSync(REC + "/checkpoint.json", JSON.stringify({ schema:"recovery-checkpoint-1", run_id: runId, original_deadline: now + 9*3600, last_safe_checkpoint:"run_start", boot_id: String(now), created_at: new Date(now*1000).toISOString() }, null, 2) + "\n");
writeFileSync(REC + "/current-run.json", JSON.stringify({ schema:"orc-current-run-1", run_id: runId, status:"READY_NOT_STARTED", original_deadline: now + 9*3600 }, null, 2) + "\n");
try { rmSync(REC + "/clean-stop.marker",{force:true}); } catch {}
if (!existsSync(REC + "/action-journal.jsonl")) writeFileSync(REC + "/action-journal.jsonl","");
console.log("created run", runId, "with", jobs.length, "wide-safe jobs; deadline in 9h; recovery checkpoint written");
