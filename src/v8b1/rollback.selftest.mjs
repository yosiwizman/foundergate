// FounderGate V8-B VB1 — ROLLBACK proof: byte-restore + FAIL-CLOSED + PATH-CONTAINED.
// Includes the checker round-1 HIGH-2 (arbitrary delete/overwrite via a crafted manifest),
// closed by root-containment pre-verify of EVERY entry (restore and absent-delete).

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupStores, rollbackFromBackup } from "./rollback.mjs";

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
function scratch() { return mkdtempSync(join(tmpdir(), "vb1-rb-")); }

console.log("== VB1 rollback (backup + fail-closed + contained) ==");

check("backup -> mutate -> rollback byte-restores the exact original", () => {
  const d = scratch(); const store = join(d, "run_state.json"); writeFileSync(store, '{"mode":"idle"}');
  const bdir = join(d, "backup");
  backupStores([store], bdir, { root: d });
  writeFileSync(store, '{"mode":"active"}');
  const r = rollbackFromBackup(bdir);
  assert.equal(r.ok, true); assert.equal(r.restored, 1);
  assert.equal(readFileSync(store, "utf8"), '{"mode":"idle"}');
});

check("net-zero: a file ABSENT before the write is removed on rollback (within root)", () => {
  const d = scratch(); const store = join(d, "new.json");
  const bdir = join(d, "backup");
  backupStores([store], bdir, { root: d });
  writeFileSync(store, '{"created":"by executor"}');
  const r = rollbackFromBackup(bdir);
  assert.equal(r.ok, true); assert.equal(r.removed, 1); assert.equal(existsSync(store), false);
});

check("backupStores REFUSES a store path outside the containment root", () => {
  const d = scratch(); const outside = join(scratch(), "victim.json"); writeFileSync(outside, "trusted");
  assert.throws(() => backupStores([outside], join(d, "backup"), { root: d }), /escapes the backup root/);
});

check("HIGH-2 CLOSED: a crafted manifest that OVERWRITES a file outside root -> PATH_ESCAPE, victim untouched", () => {
  const d = scratch(); const bdir = join(d, "backup"); mkdirSync(bdir, { recursive: true });
  const victimDir = scratch(); const victim = join(victimDir, "trusted.json"); writeFileSync(victim, '{"trusted":true}');
  const evil = join(bdir, "evil.bak"); writeFileSync(evil, '{"pwned":"yes"}');
  const sha = createHash("sha256").update(readFileSync(evil)).digest("hex");
  writeFileSync(join(bdir, "manifest.json"), JSON.stringify({
    schema_version: "1.0.0", created_at: "2026-07-12T00:00:00Z", root: realpathSync(d), backup_dir: realpathSync(bdir),
    backups: [{ path: victim, backup: evil, sha, absent: false }],
  }));
  const r = rollbackFromBackup(bdir);
  assert.equal(r.code, "PATH_ESCAPE"); assert.equal(r.restored, 0);
  assert.equal(readFileSync(victim, "utf8"), '{"trusted":true}', "the out-of-root victim must NOT be overwritten");
});

check("HIGH-2 CLOSED: a crafted manifest that DELETES a file outside root -> PATH_ESCAPE, victim not deleted", () => {
  const d = scratch(); const bdir = join(d, "backup"); mkdirSync(bdir, { recursive: true });
  const victimDir = scratch(); const victim = join(victimDir, "important.json"); writeFileSync(victim, "keep");
  writeFileSync(join(bdir, "manifest.json"), JSON.stringify({
    schema_version: "1.0.0", created_at: "2026-07-12T00:00:00Z", root: realpathSync(d), backup_dir: realpathSync(bdir),
    backups: [{ path: victim, backup: null, sha: null, absent: true }],
  }));
  const r = rollbackFromBackup(bdir);
  assert.equal(r.code, "PATH_ESCAPE"); assert.equal(r.removed, 0);
  assert.equal(existsSync(victim), true, "the out-of-root victim must NOT be deleted");
});

check("NO manifest -> NO_BACKUP_MANIFEST, ZERO changes", () => {
  const d = scratch(); const store = join(d, "run_state.json"); writeFileSync(store, '{"mode":"active"}');
  const bdir = join(d, "empty"); mkdirSync(bdir);
  const r = rollbackFromBackup(bdir);
  assert.equal(r.code, "NO_BACKUP_MANIFEST"); assert.equal(readFileSync(store, "utf8"), '{"mode":"active"}');
});

check("INCOMPLETE / TAMPERED backup -> INCOMPLETE_RESTORE, ZERO changes (fail-closed)", () => {
  const d = scratch(); const store = join(d, "run_state.json"); writeFileSync(store, '{"mode":"idle"}');
  const bdir = join(d, "backup"); const m = backupStores([store], bdir, { root: d });
  writeFileSync(store, '{"mode":"active"}');
  writeFileSync(m.backups[0].backup, '{"mode":"TAMPERED"}'); // sha won't match
  const r = rollbackFromBackup(bdir);
  assert.equal(r.code, "INCOMPLETE_RESTORE"); assert.equal(r.restored, 0);
  assert.equal(readFileSync(store, "utf8"), '{"mode":"active"}');
});

check("catastrophic empty/wrong dir -> NO_BACKUP_MANIFEST, deletes NOTHING", () => {
  const r = rollbackFromBackup(join(scratch(), "does-not-exist"));
  assert.equal(r.code, "NO_BACKUP_MANIFEST"); assert.equal(r.removed, 0);
});

console.log(`\nV8B1-ROLLBACK: PASS (${pass} checks)`);
