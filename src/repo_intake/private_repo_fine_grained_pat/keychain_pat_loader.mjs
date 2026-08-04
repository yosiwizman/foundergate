// FounderGate — Keychain-ONLY PAT Loader (LOCAL, macOS).
// Retrieves a fine-grained PAT from the macOS Keychain into PROCESS MEMORY ONLY.
// HARD RULES: the token value never returns to any caller-visible field, never prints, never writes to disk,
// never enters evidence/screenshots/ZIP. Only a redacted deterministic fingerprint + safe metadata leave here.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const SERVICE = 'foundergate-github-fgpat-sandbox-readonly';

// Redacted, deterministic, non-reversible fingerprint of a token (first 16 hex of a salted sha256).
function fingerprint(secret) {
  return 'fgpat_' + createHash('sha256').update('fgpat-fpr-v1|' + secret).digest('hex').slice(0, 16);
}

// Basic shape check for a GitHub fine-grained PAT WITHOUT logging the value.
function looksLikeFineGrainedPat(secret) {
  return typeof secret === 'string' && /^github_pat_[A-Za-z0-9_]{20,}$/.test(secret.trim());
}

// Check existence WITHOUT retrieving the value (attributes only).
export function keychainPatPresent(account, service = SERVICE) {
  try {
    execFileSync('security', ['find-generic-password', '-s', service, '-a', account], { stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch { return false; }
}

// Load the token into memory, use it via a callback, and return ONLY safe metadata.
// The token value is passed to `useToken(token)` and is never returned or logged.
// If injectSecret is provided (tests only), it is used instead of the real Keychain — still never logged.
export function withKeychainPat(account, useToken, { service = SERVICE, injectSecret = undefined } = {}) {
  let secret = injectSecret;
  let present = injectSecret !== undefined;
  if (injectSecret === undefined) {
    try {
      secret = execFileSync('security', ['find-generic-password', '-s', service, '-a', account, '-w'], { encoding: 'utf8' }).trim();
      present = true;
    } catch { present = false; secret = undefined; }
  }
  if (!present) {
    return { present: false, status: 'TOKEN_ABSENT_HOLD', token_value_seen_by_log: false, fingerprint_redacted: null };
  }
  if (!looksLikeFineGrainedPat(secret)) {
    // Do NOT log or return the malformed value.
    secret = undefined;
    return { present: true, status: 'TOKEN_MALFORMED_HOLD', token_value_seen_by_log: false, fingerprint_redacted: null };
  }
  const fpr = fingerprint(secret);
  let result;
  try {
    result = typeof useToken === 'function' ? useToken(secret) : undefined;
  } finally {
    secret = undefined; // scrub reference
  }
  return {
    present: true,
    status: 'TOKEN_LOADED_INTO_MEMORY',
    token_value_seen_by_log: false,
    token_printed: false,
    token_packaged: false,
    fingerprint_redacted: fpr,
    result,
  };
}
