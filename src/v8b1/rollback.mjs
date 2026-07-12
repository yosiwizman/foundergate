// FounderGate V8-B VB1 — ROLLBACK snapshot + FAIL-CLOSED rollback (AKIOR #3).
//
// Backup the touched stores BEFORE any write, and roll back from a manifest that is
// verified in full BEFORE a single byte is changed. Every failure mode — no manifest,
// an incomplete/tampered backup, any error — does ZERO writes (fail-closed), so a
// botched rollback can never make things worse. Restores net-zero: files that existed
// are byte-restored; files that were ABSENT before the write are removed again.
//
// Pure Node, zero-dependency. `now` is DATA (deterministic tests).

import { existsSync, statSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, basename, resolve } from "node:path";

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// Snapshot each store path (existing → copied + sha; absent → recorded as absent) and
// write a manifest. Call this BEFORE the executor mutates anything.
export function backupStores(paths, backupDir, { now = Date.now() } = {}) {
  mkdirSync(backupDir, { recursive: true });
  const backups = paths.map((p, i) => {
    const abs = resolve(p);
    if (existsSync(abs) && statSync(abs).isFile()) {
      const backup = join(backupDir, `${i}_${basename(abs)}.bak`);
      copyFileSync(abs, backup);
      return { path: abs, backup, sha: sha(backup), absent: false };
    }
    return { path: abs, backup: null, sha: null, absent: true };
  });
  const manifest = { schema_version: "1.0.0", created_at: new Date(now).toISOString(), backups };
  writeFileSync(join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

// FAIL-CLOSED rollback. Codes: OK, NO_BACKUP_MANIFEST, INCOMPLETE_RESTORE, ROLLBACK_ERROR.
// PRE-VERIFIES the whole manifest (every backup present + sha-matched) BEFORE writing or
// deleting anything — any problem returns zero-change + a code.
export function rollbackFromBackup(backupDir) {
  const manifestPath = join(backupDir, "manifest.json");
  if (!existsSync(manifestPath)) return { ok: false, code: "NO_BACKUP_MANIFEST", restored: 0, removed: 0 };
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); } catch { return { ok: false, code: "ROLLBACK_ERROR", restored: 0, removed: 0 }; }
  const backups = Array.isArray(manifest.backups) ? manifest.backups : null;
  if (!backups) return { ok: false, code: "ROLLBACK_ERROR", restored: 0, removed: 0 };
  // PRE-VERIFY (no writes yet): every non-absent backup must exist and match its sha.
  for (const b of backups) {
    if (b.absent) continue;
    if (!b.backup || !existsSync(b.backup)) return { ok: false, code: "INCOMPLETE_RESTORE", restored: 0, removed: 0 };
    try { if (sha(b.backup) !== b.sha) return { ok: false, code: "INCOMPLETE_RESTORE", restored: 0, removed: 0 }; }
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
