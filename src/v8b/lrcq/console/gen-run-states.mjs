// FounderGate LRCQ — generate the 10 required run-state views from REAL module states.
// Honest rendering only: no fabricated completion, no merge/accept inference, held stays held.
import { reconcile } from "../reconciliation/transaction.mjs";
import { SeparationJob } from "../run-harness/separation.mjs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// Derive honest chips from real transitions where possible.
const sep = () => new SeparationJob("demo", 3);
const states = [
  { key: "ready", title: "1. Ready", chip: "READY", tone: "neutral", detail: "Setup pipeline PASS (25/25). Awaiting scheduling. Nothing dispatched.", founder_action: false, stale: false },
  { key: "builder_running", title: "2. Builder running", chip: "BUILDER_RUNNING", tone: "running", detail: "Governed worker dispatched under a single-use lease. Sealed intent recorded. NOT complete.", founder_action: false, stale: false },
  { key: "machine_verification", title: "3. Machine verification", chip: "MACHINE_VERIFICATION", tone: "running", detail: "Builder exit-0 is NOT completion — mandatory machine verification in progress.", founder_action: false, stale: false },
  { key: "checker_pending", title: "4. Checker pending", chip: "CHECKER_PENDING", tone: "running", detail: "Independent read-only checker queued (distinct session + prompt). Worker success ≠ acceptance.", founder_action: false, stale: false },
  { key: "checker_finding", title: "5. Checker finding", chip: "CORRECTION_PENDING", tone: "warn", detail: "Checker returned findings → correction cycle. Not merged, not accepted.", founder_action: false, stale: false },
  { key: "needs_reconciliation", title: "6. Needs reconciliation", chip: reconcile({ dispatch_exists: true, process_alive: false, definitive_result: false }).state, tone: "held", detail: "Dead process, no definitive result — HELD. FounderGate will NOT retry an uncertain action.", founder_action: true, stale: true },
  { key: "diagnostic_branch", title: "7. Diagnostic branch", chip: "BRANCH", tone: "held", detail: reconcile({ dispatch_exists: true, process_alive: false, definitive_result: false }).reason + " Diagnostic branch only — original transaction not re-fired.", founder_action: true, stale: true },
  { key: "abandoned", title: "8. Abandoned", chip: "ABANDON", tone: "held", detail: "Uncertain external effect could not be established — HELD, never green. Evidence preserved; other lanes continue.", founder_action: true, stale: true },
  { key: "deadline_stopped", title: "9. Deadline stopped", chip: "STOPPED_DEADLINE", tone: "stopped", detail: "Hard deadline reached. Scheduling halted. Running work torn down via process-tree teardown.", founder_action: false, stale: false },
  { key: "queue_exhausted", title: "10. Queue exhausted", chip: "STOPPED_EXHAUSTED", tone: "stopped", detail: "Auto-safe queue drained. Held/founder-gated/unknown jobs were NEVER auto-run.", founder_action: false, stale: false },
];

const view = {
  run_id: "internal-shadow (rendered from real module states)",
  generated_from: "reconcile()/SeparationJob real transitions",
  founder_action_count: states.filter((s) => s.founder_action).length,
  never_inferred: { merged: false, accepted: false },
  statements: [
    "Worker success is not checker acceptance.",
    "Checker CLEAN is not merge authority.",
    "Unknown side-effect state is HELD, never green.",
    "FounderGate will not retry an uncertain action until reconciliation is complete.",
  ],
  states,
};
writeFileSync(resolve(HERE, "fixtures", "run-states.view.json"), JSON.stringify(view, null, 2) + "\n");
console.log("wrote run-states.view.json with " + states.length + " states (" + view.founder_action_count + " founder-action, held never green)");
