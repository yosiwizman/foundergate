// FounderGate LRCQ — builder/checker separation state machine (Tier-1).
// Worker exit zero ALONE never produces COMPLETED; machine verification + an independent
// CHECKER_CLEAN are required. Builder and checker are distinct sessions with distinct
// prompt digests; the checker is read-only; neither may merge/push/accept.
export const JOB_FLOW = ["PENDING", "BUILDER_RUNNING", "BUILDER_RESULT", "MACHINE_VERIFICATION", "CHECKER_PENDING", "CHECKER_RUNNING", "CHECKER_CLEAN", "COMPLETED", "CORRECTION_PENDING", "PARKED"];

export class SeparationJob {
  constructor(job_id, maxAttempts = 3) { this.job_id = job_id; this.state = "PENDING"; this.attempts = 0; this.maxAttempts = maxAttempts; this.events = []; this.builder_session = null; this.checker_session = null; }
  _to(s, note) { this.state = s; this.events.push({ state: s, note: note || null }); return this; }
  startBuilder(session) { if (this.state !== "PENDING" && this.state !== "CORRECTION_PENDING") throw new Error("builder start from " + this.state); this.attempts += 1; this.builder_session = session; return this._to("BUILDER_RUNNING"); }
  // A raw builder exit is recorded but is NOT completion.
  builderResult(exitZero) { if (this.state !== "BUILDER_RUNNING") throw new Error("builderResult from " + this.state); this._to("BUILDER_RESULT", "exit0=" + exitZero); return this._to("MACHINE_VERIFICATION"); }
  machineVerification(ok) { if (this.state !== "MACHINE_VERIFICATION") throw new Error("mv from " + this.state); if (!ok) return this._to("CORRECTION_PENDING", "machine verification failed"); return this._to("CHECKER_PENDING"); }
  // The checker MUST be a distinct session from the builder (distinct prompt digest), read-only.
  startChecker(session) {
    if (this.state !== "CHECKER_PENDING") throw new Error("checker start from " + this.state);
    if (!session || !session.session_id || !session.prompt_digest) throw new Error("checker session incomplete");
    if (this.builder_session && session.session_id === this.builder_session.session_id) throw new Error("checker == builder session (not independent)");
    if (this.builder_session && session.prompt_digest === this.builder_session.prompt_digest) throw new Error("checker prompt == builder prompt (not independent)");
    if (session.read_only !== true) throw new Error("checker must be read-only");
    this.checker_session = session; return this._to("CHECKER_RUNNING");
  }
  checkerResult(clean) {
    if (this.state !== "CHECKER_RUNNING") throw new Error("checkerResult from " + this.state);
    if (clean) return this._to("CHECKER_CLEAN");
    // findings -> correction; park after maxAttempts
    if (this.attempts >= this.maxAttempts) return this._to("PARKED", "parked after " + this.attempts + " cycles");
    return this._to("CORRECTION_PENDING", "checker findings");
  }
  complete() { if (this.state !== "CHECKER_CLEAN") throw new Error("cannot COMPLETE from " + this.state + " (worker success alone != completion)"); return this._to("COMPLETED"); }
  // guards
  canMerge() { return false; }  // never
  canAccept() { return false; } // never
}
