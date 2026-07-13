// SHWL §6 plain-English messages — comprehension proof (understandable to a non-developer).
//
// A non-developer must be able to read each message and correctly state: what happened, why
// heavy work is paused, what they can still do, and (for held) when it clears. We assert the
// messages say those things in plain words and carry NO jargon / NO capability values / NO pids.

import assert from "node:assert/strict";
import {
  heldMessage, recoveryMessage, overrideMessage, preflightRefusedMessage, messageForDecision,
} from "./messages.mjs";
import { harness } from "./_testkit.mjs";

const t = harness("SHWL messages (§6)");

// Words a non-developer message must NOT contain.
const JARGON = ["lease_id", "capability", "pid", "boot_id", "mkdir", "O_EXCL", "fsync", "argv", "stderr", "RECOVERY_REQUIRED", "ACQUIRING"];
const noJargon = (m) => JARGON.every((w) => !m.includes(w));

t.check("HELD message: names owner, what's paused, what's still allowed, and WHEN it clears", () => {
  const m = heldMessage({ expectedFinish: "3:45 PM" });
  assert.ok(/owns this Mac/i.test(m));
  assert.ok(/paused/i.test(m));
  assert.ok(/Advisor chat|documentation|planning/i.test(m), "says what they can still do");
  assert.ok(m.includes("3:45 PM"), "states the finish time");
  assert.ok(noJargon(m));
});

t.check("RECOVERY message: nothing unlocked automatically; heavy work paused", () => {
  const m = recoveryMessage();
  assert.ok(/heartbeat/i.test(m));
  assert.ok(/Nothing was unlocked automatically/i.test(m));
  assert.ok(/paused/i.test(m));
  assert.ok(noJargon(m));
});

t.check("OVERRIDE message: PERMANENT quiet-host disqualification, never auto-restored, logged", () => {
  const m = overrideMessage();
  assert.ok(/permanently disqualifies/i.test(m));
  assert.ok(/never/i.test(m) && /restored/i.test(m));
  assert.ok(/append-only|permanent log/i.test(m));
  assert.ok(noJargon(m));
});

t.check("PREFLIGHT-REFUSED message: didn't start, released reservation, nothing started", () => {
  const m = preflightRefusedMessage();
  assert.ok(/isn't quiet/i.test(m));
  assert.ok(/Nothing was started/i.test(m));
  assert.ok(noJargon(m));
});

t.check("messageForDecision maps effective state to the right message", () => {
  assert.equal(messageForDecision({ effective: "ACTIVE_HELD", expectedFinish: "5 PM" }), heldMessage({ expectedFinish: "5 PM" }));
  assert.equal(messageForDecision({ effective: "RECOVERY_REQUIRED" }), recoveryMessage());
  assert.equal(messageForDecision({ effective: "NO_LEASE" }), "");
});

t.done("SHWL-MESSAGES-SELFTEST");
