// SHWL §4.1 — the atomic exclusivity primitive (lock-directory).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §4.1/§4.2.
//
// The ACQUISITION ACT is creating `lease.lockdir` — NOT overwriting lease.json.
// `mkdir` is atomic on POSIX (like the VB1 `atomic-store` O_EXCL open): exactly ONE
// concurrent attempt wins; every other gets EEXIST and must read the existing lease and
// refuse / enter recovery reasoning (§8 row 6, double-acquire -> one winner).
//
// The lock-dir is held CONTINUOUSLY from ACQUIRING through preflight to ACTIVE (§4.2),
// so nothing can slip in between the quiet-host check and launch.

import { mkdirSync, rmdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { LOCKDIR } from "./constants.mjs";
import { ensureRoot, lockPath } from "./lease-store.mjs";

// Attempt the lock. Returns true iff THIS caller created the lock-dir (won). EEXIST -> false.
// A truthy return means "you hold the host lock"; a false return means someone else does.
export function acquireLock(root) {
  ensureRoot(root); // the ROOT must exist first; creating the root is NOT the acquisition act
  try {
    mkdirSync(lockPath(root), { recursive: false, mode: 0o700 }); // atomic; EEXIST if held
    return true;
  } catch (e) {
    if (e && e.code === "EEXIST") return false;
    throw e;
  }
}

// Presence of the lock-dir = held (§1). A missing root means not held.
export function lockHeld(root) {
  return existsSync(lockPath(root));
}

// Remove the lock-dir. Callers MUST have verified lease_id ownership first (§4.4) — release
// is lease_id-checked in lease-store.release; this is the mechanical removal only.
export function removeLock(root) {
  try { rmdirSync(lockPath(root)); return true; } catch (e) { if (e && e.code === "ENOENT") return false; throw e; }
}

// Convenience: the lock-dir path (also exported from lease-store for symmetry).
export function lockDirPath(root) {
  return join(root, LOCKDIR);
}
