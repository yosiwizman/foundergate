// FounderGate V8-B VB1 — ROLLBACK proof: byte-restore + FAIL-CLOSED (zero writes on error).

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupStores, rollbackFromBackup } from "./rollback.mjs";

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
function scratch() { return mkdtempSync(join(tmpdir(), "vb1-rb-")); }

console.log("== VB1 rollback (backup + fail-closed) ==");

check("backup -> mutate -> rollback byte-restores the exact original", () => {
  const d = scratch(); const store = join(d, "run_state.json"); writeFileSync(store, '{"mode":"idle"}');
  const bdir = join(d, "backup");
  backupStores([store], bdir);
  writeFileSync(store, '{"mode":"active","tracked":["pid 999"]}'); // mutate
  const r = rollbackFromBackup(bdir);
  assert.equal(r.ok, true); assert.equal(r.restored, 1);
  assert.equal(readFileSync(store, "utf8"), '{"mode":"idle"}', "must byte-restore the original");
});

check("net-zero: a file ABSENT before the write is removed on rollback", () => {
  const d = scratch(); const store = join(d, "new.json");
  const bdir = join(d, "backup");
  backupStores([store], bdir); // store absent at backup time
  writeFileSync(store, '{"created":"by executor"}'); // executor creates it
  const r = rollbackFromBackup(bdir);
  assert.equal(r.ok, true); assert.equal(r.removed, 1);
  assert.equal(existsSync(store), false, "an absent-before file must be removed to net-zero");
});

check("NO manifest -> NO_BACKUP_MANIFEST, ZERO changes (the mutated file is untouched)", () => {
  const d = scratch(); const store = join(d, "run_state.json"); writeFileSync(store, '{"mode":"active"}');
  const bdir = join(d, "empty-backup"); mkdirSync(bdir); // no manifest
  const r = rollbackFromBackup(bdir);
  assert.equal(r.ok, false); assert.equal(r.code, "NO_BACKUP_MANIFEST");
  assert.equal(r.restored, 0); assert.equal(r.removed, 0);
  assert.equal(readFileSync(store, "utf8"), '{"mode":"active"}', "must not touch anything");
});

check("INCOMPLETE backup (a backup file missing) -> INCOMPLETE_RESTORE, ZERO changes", () => {
  const d = scratch(); const store = join(d, "run_state.json"); writeFileSync(store, '{"mode":"idle"}');
  const bdir = join(d, "backup"); const m = backupStores([store], bdir);
  writeFileSync(store, '{"mode":"active"}'); // mutate
  unlinkSync(m.backups[0].backup); // corrupt the backup set
  const r = rollbackFromBackup(bdir);
  assert.equal(r.code, "INCOMPLETE_RESTORE"); assert.equal(r.restored, 0);
  assert.equal(readFileSync(store, "utf8"), '{"mode":"active"}', "fail-closed: mutated file left as-is, not half-restored");
});

check("TAMPERED backup (sha mismatch) -> INCOMPLETE_RESTORE, ZERO changes", () => {
  const d = scratch(); const store = join(d, "run_state.json"); writeFileSync(store, '{"mode":"idle"}');
  const bdir = join(d, "backup"); const m = backupStores([store], bdir);
  writeFileSync(store, '{"mode":"active"}');
  writeFileSync(m.backups[0].backup, '{"mode":"TAMPERED"}'); // tamper the backup -> sha won't match
  const r = rollbackFromBackup(bdir);
  assert.equal(r.code, "INCOMPLETE_RESTORE"); assert.equal(r.restored, 0);
  assert.equal(readFileSync(store, "utf8"), '{"mode":"active"}');
});

check("catastrophic empty/wrong dir -> NO_BACKUP_MANIFEST, deletes NOTHING", () => {
  const d = scratch();
  const r = rollbackFromBackup(join(d, "does-not-exist"));
  assert.equal(r.ok, false); assert.equal(r.code, "NO_BACKUP_MANIFEST");
  assert.equal(r.removed, 0);
});

console.log(`\nV8B1-ROLLBACK: PASS (${pass} checks)`);
