// SHWL — on-disk lease store: injectable root, atomic writes, readers, append-only log.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §1/§3/§4.
//
// The lease lives OUTSIDE any repo, under a stable per-user path (default
// ~/.cldh/host-workload-lease/). The root is ALWAYS injectable (param or env) so tests use
// throwaway temp dirs and NEVER touch the real ~/.cldh. Every state change is written
// write-temp -> fsync -> rename (atomic replacement); no in-place overwrite is ever the
// acquisition act (that is the lock-dir, §4.1).

import {
  mkdirSync, openSync, writeSync, fsyncSync, closeSync, renameSync,
  readFileSync, existsSync, appendFileSync, statSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomBytes, randomUUID } from "node:crypto";
import {
  DEFAULT_ROOT_SEGMENTS, LOCKDIR, LEASE_FILE, HEARTBEAT_FILE, EVENTS_FILE,
} from "./constants.mjs";
import { validateLease } from "./schema.mjs";

// Resolve the lease root. Precedence: explicit arg > env (SHWL_LEASE_ROOT / CLDH_LEASE_ROOT)
// > default ~/.cldh/host-workload-lease/. Tests MUST pass an explicit temp dir.
export function resolveRoot(root, env = process.env) {
  if (root) return root;
  const fromEnv = env && (env.SHWL_LEASE_ROOT || env.CLDH_LEASE_ROOT);
  if (fromEnv) return fromEnv;
  return join(homedir(), ...DEFAULT_ROOT_SEGMENTS);
}

export const lockPath = (root) => join(root, LOCKDIR);
export const leasePath = (root) => join(root, LEASE_FILE);
export const heartbeatPath = (root) => join(root, HEARTBEAT_FILE);
export const eventsPath = (root) => join(root, EVENTS_FILE);

// Create the root with restrictive perms (dir 0700). Not the acquisition act.
export function ensureRoot(root) {
  mkdirSync(root, { recursive: true, mode: 0o700 });
  return root;
}

// Atomic replace: write-temp -> fsync -> rename, files 0600 (§1 atomicity).
export function atomicWriteJSON(filePath, obj) {
  const dir = filePath.slice(0, filePath.lastIndexOf("/")) || ".";
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = `${filePath}.tmp.${process.pid}.${randomBytes(4).toString("hex")}`;
  const fd = openSync(tmp, "wx", 0o600);
  try {
    writeSync(fd, JSON.stringify(obj, null, 2) + "\n");
    fsyncSync(fd); // durability before the rename
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, filePath); // atomic replacement
  try { const dfd = openSync(dir, "r"); try { fsyncSync(dfd); } finally { closeSync(dfd); } } catch { /* dir fsync best-effort */ }
}

// Read the lease record. Returns { present, malformed, malformedReason, parsed }.
// A present-but-invalid lease is MALFORMED (RECOVERY_REQUIRED), NEVER "no lease" (§3).
export function readLease(root) {
  const p = leasePath(root);
  if (!existsSync(p)) return { present: false, malformed: false, malformedReason: null, parsed: null };
  let raw;
  try { raw = readFileSync(p, "utf8"); } catch (e) { return { present: true, malformed: true, malformedReason: "unreadable: " + e.code, parsed: null }; }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { present: true, malformed: true, malformedReason: "unparseable JSON", parsed: null }; }
  const v = validateLease(parsed);
  if (!v.ok) return { present: true, malformed: true, malformedReason: v.errors.join("; "), parsed };
  return { present: true, malformed: false, malformedReason: null, parsed };
}

export function writeLease(root, lease) {
  ensureRoot(root);
  atomicWriteJSON(leasePath(root), lease);
  return lease;
}

// Heartbeat lives in its own file so a beat NEVER rewrites the identity record (§3).
export function readHeartbeat(root) {
  const p = heartbeatPath(root);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

export function writeHeartbeat(root, hb) {
  ensureRoot(root);
  atomicWriteJSON(heartbeatPath(root), hb);
  return hb;
}

// Append ONE immutable JSON line to events.log (§4.4). Returns the event_id. Never truncates.
export function appendEvent(root, event) {
  ensureRoot(root);
  const event_id = event.event_id || "evt_" + randomUUID();
  const rec = { event_id, logged_at: event.at || event.logged_at || new Date().toISOString(), ...event };
  appendFileSync(eventsPath(root), JSON.stringify(rec) + "\n", { mode: 0o600 });
  return event_id;
}

// Read all events (for evidence / tests). One object per line.
export function readEvents(root) {
  const p = eventsPath(root);
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return { malformed_line: l }; } });
}

// The raw lease.json text, for leak-scanning proofs (§4.5 / §8 row 14).
export function rawLeaseText(root) {
  const p = leasePath(root);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

export function eventsText(root) {
  const p = eventsPath(root);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

export function leaseFileMode(root) {
  const p = leasePath(root);
  return existsSync(p) ? statSync(p).mode & 0o777 : null;
}
