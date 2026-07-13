// SHWL §6 — plain-English founder messages.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §6.
//
// Every message is written for a NON-DEVELOPER: what is happening, why heavy work is paused,
// what they can STILL do, and when it clears. No jargon, no capability values, no pids.
// The verbatim §6 wording is preserved; [time]/[project] are the only fills.

// Held by another run (ACTIVE, held).
export function heldMessage({ expectedFinish } = {}) {
  const when = expectedFinish || "an unknown time";
  return (
    "A qualifying endurance test currently owns this Mac. Heavy work is paused to protect its " +
    "evidence. You may continue Advisor chat, documentation and planning. The test is expected " +
    `to finish at ${when}.`
  );
}

// Recovery required (owner gone / stale / prior boot).
export function recoveryMessage() {
  return (
    "The endurance test that owned this Mac isn't sending heartbeats, and I can't yet prove its " +
    "process ended cleanly. To avoid corrupting a run, heavy work stays paused until I either " +
    "mechanically confirm the old test is gone or you explicitly authorize recovery. Nothing was " +
    "unlocked automatically."
  );
}

// Founder override (explicit force / run-anyway) — states the PERMANENT consequence (§5.1).
export function overrideMessage() {
  return (
    "You asked me to override the host lease and run heavy work anyway. Warning: if a qualifying " +
    "endurance run is (or may still be) active, this override permanently disqualifies that run's " +
    "quiet-host claim — it can no longer count as a clean quiet-host baseline, and quiet-host " +
    "standing is never automatically restored. If a previous run were somehow still writing, this " +
    "could also corrupt its evidence. I've written an append-only override event to the permanent " +
    "log and entered the override interval into the run's attestation. Heavy work is now permitted, " +
    "with that run permanently downgraded."
  );
}

// Preflight refused acquisition (host not quiet for a NEW soak).
export function preflightRefusedMessage() {
  return (
    "I couldn't start the endurance test because this Mac isn't quiet yet — other heavy work is " +
    "running. I released the reservation and recorded why. Nothing was started."
  );
}

// Map an effective decision to the right founder message.
export function messageForDecision({ effective, expectedFinish } = {}) {
  switch (effective) {
    case "ACTIVE_HELD": return heldMessage({ expectedFinish });
    case "RECOVERY_REQUIRED": return recoveryMessage();
    default: return "";
  }
}
