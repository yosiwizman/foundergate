// SHWL — subprocess child used by the cross-project matrix (rows 4 & 14). NOT a self-test.
//
// It receives the run capability ONLY via an inherited file descriptor (fd 3) — never via
// argv or env (§4.5 controlled inheritance). It then asks the SHARED guard whether it may do
// heavy work under the lease. A child that did NOT inherit the capability presents nothing and
// is refused. The child prints a JSON result and, crucially, echoes its own argv+env so the
// PARENT can prove the capability never leaked onto those surfaces.

import { readCapabilityFromFd } from "./capability.mjs";
import { guardHeavyOp } from "./guard.mjs";

const root = process.argv[2];
const runId = process.argv[3];
const boot = process.argv[4];
const now = Number(process.argv[5]);

let cap = "";
try { cap = readCapabilityFromFd(3); } catch { cap = ""; } // no fd 3 => did not inherit

const r = guardHeavyOp({
  root, op: "test",
  requester: cap ? { run_id: runId, capability: cap } : null,
  currentBootId: boot, now, isAlive: () => true,
});

process.stdout.write(JSON.stringify({
  allowed: r.allowed,
  effective: r.effective,
  gotCapViaFd: cap.length > 0,
  argv: process.argv,
  env: process.env,
}));
