#!/usr/bin/env node
// FounderGate — Held Action Sink (dry-run outbox). SCAFFOLD ONLY.
//
// PURPOSE
//   A pure-Node, zero-dependency, offline sink that takes an intended action and
//   HOLDS it: it produces a { status:"held", sent:false, live:false,
//   dispatchable:false, transport_call_count:0 } record and optionally records it
//   to a LOCAL harness fixtures file. Nothing is ever sent. There is no live path
//   here — no provider, no device, no network, no secret, no protected-store write.
//
//   HELD is NOT SENT and is NOT live proof. This module is a harness scaffold; it
//   is never an application runtime capability and confers no send authority. Final cage
//   claims still require independent Checker + Advisor verification and are NOT
//   self-certified by this file.
//
// SAFETY CONTRACT (enforced by code below + the selftest):
//   * holdAction() NEVER invokes a transport. An optional `transport` may be
//     injected purely so a caller/test can PROVE it is called 0 times.
//   * writeHeldAction() refuses any path that is absolute, escapes the harness
//     tree, or points at a protected store — it only writes under a local
//     harness outbox directory.
//   * The record's status/sent/live/dispatchable/transport_call_count are FIXED
//     constants; the schema validator rejects any mutation of them.
//
// Contract of record: held-action.schema.json (co-located).

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute, normalize, sep } from 'node:path';

export const HELD_ACTION_SCHEMA_VERSION = '1.0.0';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(HERE, 'held-action.schema.json');

// Default LOCAL outbox — a fixtures directory INSIDE the harness tree. Never a protected store.
export const DEFAULT_OUTBOX_DIR = join(HERE, 'fixtures', 'outbox');

// The four immutable safety facts every held record carries. Frozen so a caller
// cannot flip them by reference before serialization.
const HELD_INVARIANTS = Object.freeze({
  status: 'held',
  sent: false,
  live: false,
  dispatchable: false,
  transport_call_count: 0,
});

function sha256Hex(s) {
  return createHash('sha256').update(String(s), 'utf8').digest('hex');
}

/**
 * Produce a HELD record for an intended action. NEVER sends. NEVER touches a
 * provider/network. If `opts.transport` is supplied it is deliberately IGNORED
 * (present only so tests can assert it was called 0 times).
 *
 * @param {object} action           { action_id?, channel, intent, payload? }
 * @param {object} [opts]
 * @param {string} [opts.held_reason]
 * @param {Function} [opts.transport]  injected spy — NEVER invoked by this sink
 * @param {string} [opts.now]           ISO timestamp override (for deterministic tests)
 * @returns {object} a schema-valid held-action record
 */
export function holdAction(action = {}, opts = {}) {
  if (action === null || typeof action !== 'object' || Array.isArray(action)) {
    throw new TypeError('holdAction: `action` must be an object');
  }
  const channel = typeof action.channel === 'string' && action.channel.length
    ? action.channel
    : 'unspecified';
  const intent = typeof action.intent === 'string' && action.intent.length
    ? action.intent
    : 'no intent supplied';
  const action_id = typeof action.action_id === 'string' && action.action_id.length
    ? action.action_id
    : `held-${sha256Hex(`${channel}|${intent}|${Date.now()}|${Math.random()}`).slice(0, 16)}`;

  const record = {
    schema_version: HELD_ACTION_SCHEMA_VERSION,
    action_id,
    channel,
    intent,
    ...HELD_INVARIANTS, // status/sent/live/dispatchable/transport_call_count
    held_at: typeof opts.now === 'string' ? opts.now : new Date().toISOString(),
    held_reason:
      typeof opts.held_reason === 'string' && opts.held_reason.length
        ? opts.held_reason
        : 'dry-run sink: action held, never sent (no live path exists here)',
  };

  // Only ever record a DIGEST of the payload — never the raw content/secret.
  if (action.payload !== undefined) {
    record.payload_digest = sha256Hex(
      typeof action.payload === 'string' ? action.payload : JSON.stringify(action.payload),
    );
  }

  // The transport, if injected, is NEVER called. This sink has no send path.
  // (Intentionally a no-op reference so the intent is explicit and greppable.)
  void opts.transport;

  return record;
}

/**
 * A "send" attempt that, by construction, cannot send. This is the seam a caller
 * would reach for to dispatch — and it deterministically yields a HELD record
 * instead. The optional transport is proven-untouched, not invoked.
 */
export function attemptSend(action = {}, opts = {}) {
  return holdAction(action, {
    ...opts,
    held_reason:
      opts.held_reason ||
      'send attempt intercepted by dry-run sink: HELD, not sent (transport never invoked)',
  });
}

// Generic, overridable denylist of protected-store path substrings. A protected
// store is a private runtime/provider store we must never write a held record
// into. Callers may extend via opts.protectedSubstrings; nothing here is tied to
// any specific product name.
export const DEFAULT_PROTECTED_SUBSTRINGS = Object.freeze([
  '.private-store',
  'provider-connect',
  'provider-store',
]);

// Guard: only allow writing to a LOCAL harness outbox path. Reject absolute
// paths outside the tree, tree-escape (..), and anything pointing at a protected
// runtime/provider store.
function assertLocalOutboxPath(outboxDir, opts = {}) {
  if (typeof outboxDir !== 'string' || !outboxDir.length) {
    throw new Error('writeHeldAction: outboxDir must be a non-empty string');
  }
  const n = normalize(outboxDir);
  const lowered = n.toLowerCase();
  if (isAbsolute(n) && !n.startsWith(HERE)) {
    throw new Error(`writeHeldAction: refusing absolute path outside the harness tree: ${n}`);
  }
  if (n.split(sep).includes('..')) {
    throw new Error(`writeHeldAction: refusing path that escapes the harness tree: ${n}`);
  }
  const protectedSubstrings = opts.protectedSubstrings || DEFAULT_PROTECTED_SUBSTRINGS;
  if (protectedSubstrings.some((s) => lowered.includes(s))) {
    throw new Error(`writeHeldAction: refusing to write to a protected runtime/provider store: ${n}`);
  }
}

/**
 * Record a HELD record to a LOCAL harness outbox file (JSON). Never a protected
 * store, never a provider. Returns the absolute path written. This is a local
 * disk write only; it dispatches nothing.
 */
export function writeHeldAction(record, opts = {}) {
  const outboxDir = opts.outboxDir || DEFAULT_OUTBOX_DIR;
  assertLocalOutboxPath(outboxDir, opts);
  if (record.status !== 'held' || record.sent !== false || record.live !== false) {
    throw new Error('writeHeldAction: refusing to persist a record that is not HELD');
  }
  mkdirSync(outboxDir, { recursive: true });
  const file = join(outboxDir, `${record.action_id}.held.json`);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return file;
}

// ---- Minimal, dependency-free validator for the held-action schema subset ----
// Supports: type, const, enum, pattern, minLength, maxLength, required,
// additionalProperties:false, properties. That is exactly what the schema uses.
function loadSchema() {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}

function checkNode(value, s, path, errors) {
  if (!s || typeof s !== 'object') return;
  if (s.type !== undefined) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    const t = typeOf(value);
    const ok = types.some((ty) => (ty === 'number' ? t === 'number' || t === 'integer' : t === ty));
    if (!ok) {
      errors.push(`${path}: expected type ${types.join('|')}, got ${typeOf(value)}`);
      return;
    }
  }
  if (Object.prototype.hasOwnProperty.call(s, 'const') &&
      JSON.stringify(value) !== JSON.stringify(s.const)) {
    errors.push(`${path}: must equal const ${JSON.stringify(s.const)}`);
  }
  if (Array.isArray(s.enum) && !s.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push(`${path}: ${JSON.stringify(value)} not in enum`);
  }
  if (typeOf(value) === 'string') {
    if (typeof s.minLength === 'number' && value.length < s.minLength)
      errors.push(`${path}: shorter than minLength ${s.minLength}`);
    if (typeof s.maxLength === 'number' && value.length > s.maxLength)
      errors.push(`${path}: longer than maxLength ${s.maxLength}`);
    if (typeof s.pattern === 'string' && !new RegExp(s.pattern).test(value))
      errors.push(`${path}: does not match pattern /${s.pattern}/`);
  }
  if (typeOf(value) === 'object') {
    if (Array.isArray(s.required)) {
      for (const req of s.required)
        if (!Object.prototype.hasOwnProperty.call(value, req))
          errors.push(`${path}: missing required property '${req}'`);
    }
    const props = s.properties || {};
    if (s.additionalProperties === false) {
      for (const key of Object.keys(value))
        if (!Object.prototype.hasOwnProperty.call(props, key))
          errors.push(`${path}: additional property '${key}' is not allowed`);
    }
    for (const [key, sub] of Object.entries(props))
      if (Object.prototype.hasOwnProperty.call(value, key))
        checkNode(value[key], sub, `${path}.${key}`, errors);
  }
}

export function validateHeldAction(record, schema = loadSchema()) {
  const errors = [];
  checkNode(record, schema, '$', errors);
  return { valid: errors.length === 0, errors };
}
