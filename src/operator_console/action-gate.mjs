// Local Action Gate + SIMULATED executor. Represents "local actions" the operator
// might request, but ONLY simulates them on disposable fixtures. It NEVER performs a
// real destructive action, never touches anything outside a caller-provided disposable
// dir, and never crosses a founder gate. Every action is dry-run-labeled.
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Only these action types are recognized; all are SIMULATED.
export const ACTION_ALLOWLIST = ['write_note', 'append_note', 'noop'];
// Actions that would be destructive are explicitly NOT executable here.
export const FORBIDDEN_ACTIONS = ['delete', 'rm', 'deploy', 'push', 'publish', 'exec', 'chmod', 'network'];

export function validateAction(action) {
  if (!action || typeof action.type !== 'string') return { ok: false, code: 'REFUSED', reason: 'no action type' };
  if (FORBIDDEN_ACTIONS.includes(action.type)) return { ok: false, code: 'REFUSED', reason: `forbidden action: ${action.type}` };
  if (!ACTION_ALLOWLIST.includes(action.type)) return { ok: false, code: 'REFUSED', reason: `action not on allowlist: ${action.type}` };
  return { ok: true };
}

// simulateAction: applies a bounded, reversible change ONLY within `disposableDir`.
// Returns a receipt with a rollback token (the prior content) — nothing outside the dir is touched.
export function simulateAction(action, disposableDir) {
  const v = validateAction(action); if (!v.ok) return { status: v.code, reason: v.reason };
  const base = resolve(disposableDir);
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  const rel = String(action.file || 'note.txt').replace(/[^a-zA-Z0-9._-]/g, '_'); // no traversal
  const target = join(base, rel);
  if (!target.startsWith(base + '/')) return { status: 'REFUSED', reason: 'path escapes disposable dir' };
  const prior = existsSync(target) ? readFileSync(target, 'utf8') : null; // rollback token
  let after = prior;
  if (action.type === 'noop') { /* no change */ }
  else if (action.type === 'write_note') { after = String(action.content || 'simulated note'); writeFileSync(target, after); }
  else if (action.type === 'append_note') { after = (prior || '') + String(action.content || 'simulated append'); writeFileSync(target, after); }
  return { status: 'SIMULATED', mode: 'DRY_RUN_LOCAL_SIMULATION', type: action.type, target, prior, after, rollback: { file: target, restore: prior } };
}
