// FounderGate V8-B VB1 — ROLLBACK snapshot + FAIL-CLOSED, CONTAINED rollback (AKIOR #3).
//
// Backup the touched stores BEFORE any write, and roll back from a manifest that is
// verified IN FULL before a single byte changes. Every failure mode — no manifest, an
// incomplete/tampered backup, a path that escapes the allowed root — does ZERO writes
// (fail-closed). Restores net-zero: existing files are byte-restored; files ABSENT before
// the write are removed again.
//
// checker round-1 HIGH-2: rollback must NOT be an arbitrary-write primitive. Every store
// path (restore OR net-zero delete) is CONFINED to a root recorded at backup time; any
// out-of-root path — including absent-entry deletes — refuses the whole rollback.
//
// Pure Node. `now` is DATA. A cross-process lock (AKIOR #8, src/v8b1/atomic-store.mjs) is
// the caller's responsibility to hold across backup→mutate→rollback (checker LOW-1).

import { existsSync, statSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, unlinkSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, basename, dirname, resolve, sep } from "node:path";

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const within = (abs, base) => abs === base || abs.startsWith(base + sep);

// Canonicalize a path: realpath the deepest EXISTING prefix (so /var -> /private/var and
// symlinks resolve), then append any not-yet-existing suffix. Used for BOTH root and store
// paths so containment comparisons are apples-to-apples and symlink escapes are caught.
function canonPath(p) {
  const abs = resolve(p);
  let cur = abs; const tail = [];
  while (!existsSync(cur)) { const par = dirname(cur); if (par === cur) break; tail.unshift(basename(cur)); cur = par; }
  let real; try { real = realpathSync(cur); } catch { real = cur; }
  return tail.length ? join(real, ...tail) : real;
}

// Snapshot each store path under a CONTAINMENT ROOT. Every path must be inside `root`
// (rejected otherwise). Records the realpath'd root + backup dir in the manifest so
// rollback can re-verify containment.
export function backupStores(paths, backupDir, { root, now = Date.now() } = {}) {
  if (typeof root !== "string" || !root) throw new Error("backupStores requires a containment root");
  const rootReal = canonPath(root);
  mkdirSync(backupDir, { recursive: true });
  const backupReal = canonPath(backupDir);
  const backups = paths.map((p, i) => {
    const abs = canonPath(p);
    if (!within(abs, rootReal)) throw new Error(`store path escapes the backup root: ${abs} not in ${rootReal}`);
    if (existsSync(abs) && statSync(abs).isFile()) {
      const backup = join(backupReal, `${i}_${basename(abs)}.bak`);
      copyFileSync(abs, backup);
      return { path: abs, backup, sha: sha(backup), absent: false };
    }
    return { path: abs, backup: null, sha: null, absent: true };
  });
  const manifest = { schema_version: "1.0.0", created_at: new Date(now).toISOString(), root: rootReal, backup_dir: backupReal, backups };
  writeFileSync(join(backupReal, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

// FAIL-CLOSED rollback. Codes: OK, NO_BACKUP_MANIFEST, PATH_ESCAPE, INCOMPLETE_RESTORE,
// ROLLBACK_ERROR. PRE-VERIFIES the WHOLE manifest — every path confined to the recorded
// root (including absent-entry deletes), every backup confined to the recorded backup dir
// + present + sha-matched — BEFORE any write or delete. Any problem → zero-change + a code.
export function rollbackFromBackup(backupDir) {
  const manifestPath = join(backupDir, "manifest.json");
  if (!existsSync(manifestPath)) return { ok: false, code: "NO_BACKUP_MANIFEST", restored: 0, removed: 0 };
  let m;
  try { m = JSON.parse(readFileSync(manifestPath, "utf8")); } catch { return { ok: false, code: "ROLLBACK_ERROR", restored: 0, removed: 0 }; }
  const backups = Array.isArray(m.backups) ? m.backups : null;
  if (!backups || typeof m.root !== "string") return { ok: false, code: "ROLLBACK_ERROR", restored: 0, removed: 0 };
  let rootReal, backupReal;
  try { rootReal = canonPath(m.root); backupReal = canonPath(backupDir); } catch { return { ok: false, code: "ROLLBACK_ERROR", restored: 0, removed: 0 }; }
  // PRE-VERIFY every entry (no writes yet).
  for (const b of backups) {
    const pAbs = canonPath(b.path || "/");
    if (!within(pAbs, rootReal)) return { ok: false, code: "PATH_ESCAPE", restored: 0, removed: 0 }; // containment (incl. absent deletes)
    if (b.absent) continue;
    const bAbs = canonPath(b.backup || "/");
    if (!within(bAbs, backupReal) || !existsSync(bAbs)) return { ok: false, code: "INCOMPLETE_RESTORE", restored: 0, removed: 0 };
    try { if (sha(bAbs) !== b.sha) return { ok: false, code: "INCOMPLETE_RESTORE", restored: 0, removed: 0 }; }
    catch { return { ok: false, code: "ROLLBACK_ERROR", restored: 0, removed: 0 }; }
  }
  // COMMIT: restore existing byte-for-byte; remove files that were absent before (net-zero).
  let restored = 0, removed = 0;
  try {
    for (const b of backups) {
      if (b.absent) { if (existsSync(b.path)) { unlinkSync(b.path); removed++; } }
      else { copyFileSync(b.backup, b.path); restored++; }
    }
  } catch { return { ok: false, code: "ROLLBACK_ERROR", restored, removed }; }
  return { ok: true, code: "OK", restored, removed };
}
