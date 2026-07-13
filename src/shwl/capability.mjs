// SHWL §4.5 — capability custody + authorized-subprocess inheritance (NORMATIVE).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §4.5/§3.
//
// The lease_capability_id is a HIGH-ENTROPY (>=256-bit), run-specific COOPERATIVE
// capability (adopts the VB1 session-token pattern). It is a SAFETY-coordination
// mechanism, NOT a security boundary — a hostile process may ignore it. Among cooperating
// harness processes it is what distinguishes the exact owning run, so a "same project"
// build cannot present itself as "same run".
//
// Requirements enforced here (not suggestions):
//  - capability material lives in an OWNER-ONLY dir (0700), any file OWNER-READABLE only (0600);
//  - the capability NEVER appears in argv, logs, git-tracked files, evidence, or env dumps;
//  - subprocesses receive it via a CONTROLLED inherited fd / broker handle — never broadcast;
//  - ordinary same-project builds DO NOT inherit the soak capability;
//  - access ends when the run ends;
//  - leakage OR mismatch => REFUSAL, never a fallback authorization.
// A 0600 file permission ALONE is NOT sufficient inheritance protection.

import {
  mkdirSync, openSync, writeSync, closeSync, readSync, readFileSync, existsSync,
  rmSync, statSync, fsyncSync,
} from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { CAPABILITY_DIR } from "./constants.mjs";

// Mint a high-entropy capability: 32 bytes = 256 bits, hex (64 chars) — satisfies §3
// lease_capability_id minLength 32. Prefix marks it in nothing but code.
export function mintCapability(prefix = "shwlcap_") {
  return prefix + randomBytes(32).toString("hex"); // 256 bits of entropy
}

const capDir = (root) => join(root, CAPABILITY_DIR);
const capFile = (root, lease_id) => join(capDir(root), `${lease_id}.cap`);

// Store capability material in the owner-only custody dir (dir 0700, file 0600). This is
// WHERE the value lives; delivery to a subprocess is a SEPARATE controlled mechanism below.
export function storeCapability(root, lease_id, capability) {
  mkdirSync(capDir(root), { recursive: true, mode: 0o700 });
  const f = capFile(root, lease_id);
  const fd = openSync(f, "w", 0o600);
  try { writeSync(fd, capability); fsyncSync(fd); } finally { closeSync(fd); }
  return f;
}

export function readStoredCapability(root, lease_id) {
  const f = capFile(root, lease_id);
  if (!existsSync(f)) return null;
  return readFileSync(f, "utf8");
}

export function capabilityFileMode(root, lease_id) {
  const f = capFile(root, lease_id);
  return existsSync(f) ? statSync(f).mode & 0o777 : null;
}

// Access ends when the run ends (§4.5): destroy the custody file.
export function destroyCapability(root, lease_id) {
  try { rmSync(capFile(root, lease_id), { force: true }); return true; } catch { return false; }
}

// A declared, scoped subprocess capability — inheritance is EXPLICIT and scoped to the
// declared subprocesses of the exact run. Returns the new capability AND the lease record
// mutated to declare it (caller persists the lease). Ordinary same-project builds get NONE
// of this — they never call registerSubprocess and so never inherit.
export function registerSubprocess(lease, prefix = "shwlsub_") {
  const cap = mintCapability(prefix);
  const list = Array.isArray(lease.declared_subprocess_capabilities) ? lease.declared_subprocess_capabilities.slice() : [];
  list.push(cap);
  return { capability: cap, lease: { ...lease, declared_subprocess_capabilities: list } };
}

// The cooperative custody check the guard/state-machine use: does `presented` authorize
// operation under `lease`? Matches the exact owner capability OR a declared subprocess
// capability. A guessed / forged / same-project-different-run capability MISMATCHES ->
// REFUSAL (§8 rows 4/5/14). Mismatch is never a fallback authorization.
export function authorizes(lease, presented) {
  if (!lease || typeof presented !== "string" || presented.length < 32) return false;
  if (presented === lease.lease_capability_id) return true;
  const subs = Array.isArray(lease.declared_subprocess_capabilities) ? lease.declared_subprocess_capabilities : [];
  return subs.includes(presented);
}

// ---- Controlled inherited-fd / broker delivery (§4.5) ---------------------------------
//
// A 0600 file alone is NOT the inheritance mechanism. To hand a capability to an authorized
// subprocess we open the custody file and pass its FILE DESCRIPTOR as an extra inherited
// stdio slot (fd 3). The value is NEVER placed in argv or env. `brokerStdio` returns the
// stdio array for child_process.spawn; the child reads fd 3 with `readCapabilityFromFd`.

export function brokerStdio(root, lease_id) {
  const f = capFile(root, lease_id);
  const fd = openSync(f, "r"); // inherited into the child as fd 3
  return { stdio: ["ignore", "pipe", "pipe", fd], _fd: fd };
}

export function closeBroker(broker) {
  if (broker && typeof broker._fd === "number") { try { closeSync(broker._fd); } catch { /* already closed */ } }
}

// Child side: read the capability from an inherited fd (default 3). Never from argv/env.
export function readCapabilityFromFd(fd = 3) {
  const buf = Buffer.alloc(256);
  const n = readSync(fd, buf, 0, buf.length, 0);
  return buf.slice(0, n).toString("utf8").trim();
}

// Leak scanner used by proofs (§8 row 14). The capability legitimately lives ONLY in the
// owner-only custody file and the owner-only lease.json (both 0600 under ~/.cldh); it MUST
// NOT appear on any FORBIDDEN surface: argv / env / logs / evidence docs / git-tracked
// files / the append-only events.log. `leaseText` is NOT scanned — that is the legitimate,
// owner-only home for lease_capability_id (§3).
export function capabilityLeaks(capability, surfaces = {}) {
  const hits = [];
  const scan = (label, text) => { if (typeof text === "string" && capability && text.includes(capability)) hits.push(label); };
  if (Array.isArray(surfaces.argv)) scan("argv", surfaces.argv.join(" "));
  if (surfaces.env && typeof surfaces.env === "object") scan("env", Object.values(surfaces.env).join(" "));
  scan("log", surfaces.log);
  scan("evidence", surfaces.evidence);
  scan("git", surfaces.git);
  scan("events_log", surfaces.eventsText); // the audit trail must never carry the capability
  return { leaked: hits.length > 0, surfaces: hits };
}
