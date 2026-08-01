// Rollback for simulated local actions. Restores the prior content captured by
// simulateAction()'s rollback token. Operates ONLY on the disposable file the
// simulation touched. Never deletes anything it did not create in this session.
import { existsSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
export function rollback(receipt) {
  if (!receipt || !receipt.rollback || !receipt.rollback.file) return { status: 'NOOP', reason: 'nothing to roll back' };
  const { file, restore } = receipt.rollback;
  if (restore === null) {
    // file did not exist before the simulation -> remove the file the simulation created
    if (existsSync(file)) unlinkSync(file);
    return { status: 'ROLLED_BACK', action: 'removed newly-created file', file };
  }
  writeFileSync(file, restore); // restore prior content
  return { status: 'ROLLED_BACK', action: 'restored prior content', file };
}
export function verifyRolledBack(receipt) {
  const { file, restore } = receipt.rollback;
  if (restore === null) return !existsSync(file);
  return existsSync(file) && readFileSync(file, 'utf8') === restore;
}
