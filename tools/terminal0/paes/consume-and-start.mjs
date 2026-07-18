import { verifyDecision, digest } from "../../../src/gate-router/gate-router.mjs";
import { readFileSync, writeFileSync, readdirSync, appendFileSync } from "node:fs";
const REPO = process.argv[2], supPid = process.argv[3], SUP = REPO + "/.foundergate/supervisor", G = REPO + "/.foundergate/gates";
const now = Math.floor(Date.now()/1000);
const rf = readdirSync(G + "/resolutions").find(f => f.endsWith(".json"));
const res = JSON.parse(readFileSync(G + "/resolutions/" + rf));
const req = JSON.parse(readFileSync(G + "/requests/" + rf));
const v = verifyDecision(req, res, { now, exact_sha: res.exact_sha, expected_action: "activate_paes_narrow_allowlist", already_consumed: res.consumed === true });
if (!v.valid) { console.error("decision verify failed:", v.problems); process.exit(1); }
res.consumed = true; res.consumed_at = now; res.consumed_bound = { supervisor_pid: Number(supPid), mode: "USER_SESSION_DETACHED" };
writeFileSync(G + "/resolutions/" + rf, JSON.stringify(res, null, 2) + "\n");
appendFileSync(G + "/events.jsonl", JSON.stringify({ evt: "resolution_consumed", gate_id: res.gate_id, ts: now, supervisor_pid: Number(supPid) }) + "\n");
const cycle = JSON.parse(readFileSync(SUP + "/current-cycle.json"));
writeFileSync(SUP + "/handoff.json", JSON.stringify({ result: "SAFE_TO_LEAVE_UNATTENDED", mode: "USER_SESSION_DETACHED",
  survives_terminal_closure: true, survives_logout: false, survives_reboot: false, run_id: cycle.run_id, deadline: cycle.deadline, ts: now }, null, 2) + "\n");
console.log("decision consumed once; handoff.json written");
