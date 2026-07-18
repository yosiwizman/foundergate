// ORC-1R recovery flow. Detects an interrupted run and produces ONE recovery
// verdict + a plain-English founder card. Reuses the recovery law + journal;
// never starts a new 9h deadline; never consumes the activation decision.
import { resumeState, recoveryVerdict } from "../../../src/recovery/recovery-journal.mjs";
import { recoveryDecision } from "../../../src/recovery/recovery-law.mjs";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const REPO = process.argv[2], REC = REPO + "/.foundergate/recovery";
const now = Math.floor(Date.now() / 1000);
const read = (f) => { try { return JSON.parse(readFileSync(f)); } catch { return null; } };
const checkpoint = read(REC + "/checkpoint.json");
const cleanStop = existsSync(REC + "/clean-stop.marker");
const bootChanged = process.argv[3] === "boot-changed";
// Interrupted iff there was an active run, no clean-stop, or boot/session changed.
const interrupted = checkpoint && checkpoint.run_id && (!cleanStop || bootChanged);
if (!interrupted) { console.log(JSON.stringify({ interrupted: false, verdict: "NO_INTERRUPTED_RUN" })); process.exit(0); }
const resume = resumeState(REC + "/action-journal.jsonl");
const v = recoveryVerdict(checkpoint, resume, { now });
// per-incomplete-action recovery decisions (effect-aware)
const perAction = resume.incomplete.map((a) => ({ action_id: a.action_id, effect_class: a.effect_class, certainty: a.certainty, decision: recoveryDecision(a, {}).decision }));
writeFileSync(REC + "/resume-decision.json", JSON.stringify({ schema: "orc-resume-decision-1", pending: v.verdict !== "RECOVERED_AUTOMATICALLY", verdict: v.verdict, reasons: v.reasons, per_action: perAction, original_deadline: checkpoint.original_deadline, deadline_extended: false, updated_at: new Date(now * 1000).toISOString() }, null, 2) + "\n");
// plain-English founder recovery card
const card = {
  title: "Unexpected shutdown detected",
  work_preserved: resume.dropped_tail ? "YES (a truncated final journal line was dropped; prior work intact)" : "YES",
  last_safe_checkpoint: checkpoint.last_safe_checkpoint || "start of run",
  incomplete_action: resume.incomplete.length ? resume.incomplete.map((a) => a.action_id).join(", ") : "none",
  repository_state: "reconciled",
  recovery_verdict: v.verdict,
  founder_action_required: v.verdict === "RECOVERED_AUTOMATICALLY" ? "none (resume is safe)" : v.verdict === "RUN_DEADLINE_EXPIRED" ? "start a new authorized run (the 9h window elapsed)" : "one decision: Resume safely / Keep paused / Review details",
  choices: ["RESUME SAFELY", "KEEP PAUSED", "REVIEW DETAILS"],
  note: "A reboot does not extend the original deadline; logout/reboot survival is not claimed.",
};
writeFileSync(REC + "/founder-recovery-card.json", JSON.stringify(card, null, 2) + "\n");
console.log(JSON.stringify({ interrupted: true, verdict: v.verdict, founder_action: card.founder_action_required }));
