#!/usr/bin/env node
// FounderGate LRCQ — TEST-SUPPORT launcher stand-in for FG-FCHK-197-A. Structurally test-only.
//
// It models the PRODUCTION launcher at its most sensitive moment: it performs a governed key transfer that
// FAILS asynchronously (a cwd that does not exist makes node emit 'error' on the ChildProcess after the key
// has already been materialized and the authority already spent), then does exactly what the real launcher
// does — record the structured refusal and exit NORMALLY.
//
// Before the correction this process died with "node:events:486 throw er; // Unhandled 'error' event" and
// exit 1, so the launcher's own refusal record and descriptor cleanup never ran. The parent selftest
// asserts on this process's exit code, its stderr and the JSON it prints.
import { readFileSync, writeFileSync } from "node:fs";
import { verifyActivation } from "../../assurance/activation-v4.mjs";
import { consumeActivationV4, createLaunchIntentV4, spawnGovernedSupervisorV4, lifecycleStateV4, LC_CODES, TRANSFER_STATES } from "../../assurance/lifecycle-authority-v4.mjs";

const at = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };
const cfg = JSON.parse(readFileSync(at("--config"), "utf8"));
const signed = JSON.parse(readFileSync(cfg.activationPath, "utf8"));
const authorityDoc = JSON.parse(readFileSync(cfg.authorityPath, "utf8"));
const keyDeps = { repo: "/disposable", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
const vr = verifyActivation(signed, { authorizationBytes: Buffer.from(cfg.authorizationB64, "base64"), nowEpoch: cfg.now }, { keyDeps });

const out = { stage: "start", uncaught: false };
// The real launcher installs NO process-level uncaughtException handler either; this listener exists ONLY
// so the test can report an escaped 'error' as data instead of losing it to a raw stack trace.
process.on("uncaughtException", (e) => {
  out.uncaught = true; out.uncaught_message = String(e && e.message);
  writeFileSync(cfg.resultPath, JSON.stringify(out, null, 2) + "\n");
  process.exit(1);
});

const c = consumeActivationV4(vr.capability, { now: cfg.now });
createLaunchIntentV4(c.capability, { now: cfg.now, supervisorEntrypoint: cfg.entrypoint });
// The governed transfer, with a cwd that does not exist -> ASYNCHRONOUS ChildProcess 'error'.
const g = await spawnGovernedSupervisorV4(c.capability, { args: [], cwd: cfg.badCwd, detached: false });
out.stage = "after_transfer";
out.result_code = g.code;
out.result_ok = g.ok === true;
out.transfer = g.transfer;
out.structured = typeof g === "object" && typeof g.code === "string";
out.state_after = lifecycleStateV4(c.capability).transfer;
out.spent = out.state_after === TRANSFER_STATES.SPENT;
out.child_pid = (g.child && g.child.pid) || null;
// The launcher's truthful failure evidence, and the retry the authority must refuse.
const retry = await spawnGovernedSupervisorV4(c.capability, { args: [], detached: false });
out.retry_code = retry.code;
out.retry_is_already_transferred = retry.code === LC_CODES.ALREADY_TRANSFERRED;
writeFileSync(cfg.resultPath, JSON.stringify(out, null, 2) + "\n");
console.log("__LAUNCHER_RESULT__" + JSON.stringify(out));
process.exit(0);
