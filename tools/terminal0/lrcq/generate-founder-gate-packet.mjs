// FounderGate LRCQ — founder-readable gate packet. Plain-language decision material showing all
// fifteen internal-run blockers, their status + evidence + external limitations, the exact
// five-hour authority + denied authority, cost/width/deadline limits, and the undo/teardown plan.
// Confers NO authority; contains no signature.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const P = (p) => resolve(REPO, p);

const cat = JSON.parse(readFileSync(P(".foundergate/backlog/assurance-control-master-v1.json"), "utf8"));
const blockers = cat.items.filter((i) => i.first_internal_5h_requirement === "BLOCKER");
const manifest = JSON.parse(readFileSync(P(".foundergate/run-materials/first-internal-5h/run-manifest.json"), "utf8"));
const disclosure = JSON.parse(readFileSync(P(".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json"), "utf8")).real_run_capability_disclosure;

const packet = {
  title: "FounderGate — First Internal Five-Hour Run: Founder Gate Packet",
  confers_no_authority: true, founder_signature: null,
  fifteen_blockers: blockers.map((i) => ({ id: i.control_id, title: i.title, status: i.status, evidence: i.required_evidence, tests: i.tests, external_limitations: i.limitations || [] })),
  blocker_summary: blockers.reduce((m, i) => { m[i.status] = (m[i.status] || 0) + 1; return m; }, {}),
  exact_five_hour_authority: {
    what_it_may_do: ["run WIDE_SAFE local-filesystem jobs from the frozen 25-job backlog", "one governed provider session per job through the single adapter", "under single-use task-scoped leases + blast-radius budgets"],
    cost_limit_usd: manifest.max_cost_usd, max_parallel_width: manifest.max_parallel_width, max_duration_s: manifest.max_duration_s, per_job_timeout_s: manifest.per_job_timeout_s,
  },
  denied_authority: ["merge any PR", "push / write protected main", "contact M1", "access AKIOR", "live/network actions", "customer data", "permission bypass", "second execution route (controller.stepReal refuses)"],
  undo_and_teardown_plan: {
    stop: "touch the stop-file (" + manifest.stop_file_path + ") — observed between and during jobs",
    pause: "touch the pause-file (" + manifest.pause_file_path + ")",
    teardown: "process-tree teardown (SIGTERM->grace->SIGKILL) with real OS liveness verification",
    recovery: "run is disk-recoverable; uncertain dispatch is HELD (NEEDS_RECONCILIATION), never re-fired",
    reversible: "WIDE_SAFE local-fs only; each job on its own branch/worktree; nothing merged or pushed",
  },
  real_run_capability_disclosure: disclosure,
  provider: { path: manifest.provider_executable_path, version: manifest.provider_version, identity: manifest.provider_executable_identity },
};
const out = ".foundergate/evidence/lrcq-assurance-factory/FOUNDER_GATE_PACKET.json";
writeFileSync(P(out), JSON.stringify(packet, null, 2) + "\n");
console.log("wrote " + out + " | blockers: " + JSON.stringify(packet.blocker_summary));
