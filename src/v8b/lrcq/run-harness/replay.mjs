// FounderGate LRCQ — append-only replay stream (Tier-1). Every event is hash-chained
// (each record binds the prior record's digest) so tampering/insertion is detectable.
// Never records secret values. Events from another run are historical, never current.
import { createHash } from "node:crypto";
const sha = (s) => "sha256:" + createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex");

export const EVENT_FIELDS = ["event_id", "run_id", "job_id", "attempt", "role", "provider", "model_id", "cli_version", "executable_identity", "policy_version", "candidate_stack", "prompt_digest", "allowed_tools_digest", "denied_tools_digest", "lease_digest", "blast_budget_digest", "stdout_digest", "stderr_digest", "transcript_digest", "branch", "worktree", "pre_fingerprint", "post_fingerprint", "checkpoint_before", "checkpoint_after", "transaction_state", "reconciliation_state", "evidence_path", "timestamp"];
const SECRET_KEYS = /token|secret|api[_-]?key|password|credential/i;

export class ReplayStream {
  constructor(run_id) { this.run_id = run_id; this.records = []; this.seq = 0; this.headDigest = "sha256:genesis"; }
  append(ev) {
    // reject any raw secret-looking value
    for (const [k, v] of Object.entries(ev)) if (SECRET_KEYS.test(k) && typeof v === "string" && !k.endsWith("_digest")) throw new Error("refusing to record secret field: " + k);
    this.seq += 1;
    const body = { ...ev, event_id: this.run_id + "-" + this.seq, seq: this.seq, prev: this.headDigest };
    const digest = sha(body);
    const rec = { ...body, digest };
    this.records.push(rec); this.headDigest = digest; return rec;
  }
  // Verify the whole chain: each record's prev must equal the prior digest, and its digest recomputes.
  verifyChain() {
    let prev = "sha256:genesis";
    for (const rec of this.records) {
      if (rec.prev !== prev) return { ok: false, at: rec.seq, reason: "chain break (prev mismatch)" };
      const { digest, ...body } = rec;
      if (sha(body) !== digest) return { ok: false, at: rec.seq, reason: "record digest mismatch (tampered)" };
      prev = digest;
    }
    return { ok: true, length: this.records.length };
  }
  // Current-vs-historical scoping: only exact active run_id events are current.
  currentEvents(activeRunId) { return this.records.filter((r) => r.run_id === activeRunId && activeRunId != null); }
}
