// FREEZE MANIFEST — evidence-integrity infrastructure (lane L1, SENSITIVE).
//
// Plain English: before a future §29 soak begins, we take a fingerprint of the exact
// code that will be soaked — the git SHA plus a sha256 of every file — and freeze it into
// a small, tamper-evident manifest. When the soak's evidence is later reviewed, we re-run
// verify against the manifest. If a single byte of the frozen code changed, moved, appeared,
// or vanished, verify reports the drift. This is how a soak's evidence is BOUND to an
// immutable code state: evidence you cannot bind to frozen code is evidence you cannot trust.
//
// Authority:
//   - Assembly Manual §26 (append-only evidence + exact-SHA provenance): this manifest IS
//     that provenance for a soak — a per-file sha256 + git SHA snapshot.
//   - Assembly Manual §29 (Honest-Duration / soak-proof): a qualifying soak is bound to a
//     quiet-host span AND to the exact code under test; this manifest gates the latter.
//   - Law 54 (honest UNKNOWN): when we cannot resolve the git SHA or read a listed file, we
//     refuse or record an explicit UNKNOWN. We never guess and never silently pass.
//
// DESIGN NOTES (deliberate, load-bearing):
//   * Timestamps are DATA. `created_at` is whatever `now` the caller passes in. This module
//     never calls Date.now() / new Date() in any logic — determinism and replayability
//     require that the clock be an input, not an ambient read.
//   * `manifest_hash` covers the CODE-STATE IDENTITY — schema_version, git_sha, and the
//     deterministically-sorted entries (path + sha256 + bytes + mode, where mode is the
//     `& 0o777` permission bits so an exec-bit flip is caught). It deliberately does NOT
//     cover `created_at`: re-freezing the identical code at a different time yields the same
//     manifest_hash, which is the correct property for a code-binding fingerprint. Any tamper
//     with the entries, the git_sha, or the schema_version breaks manifest_hash.
//   * HEAVY-OP NOTE: every export here is a pure hashing / comparison function. Nothing here
//     starts a build, test, soak, monitor, browser, or any host workload, so per the SHWL
//     §5 contract these functions are NOT heavy entry points and require no lease guard.
//     This module must never become an ungated way to start heavy work: keep it pure.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { join, sep, posix } from "node:path";

export const SCHEMA_VERSION = "freeze-manifest/1";

// Honest sentinel for a value we could not resolve (Law 54). Never a guess.
export const UNKNOWN = "UNKNOWN";

// Closed set of drift reasons (contract with verify's callers).
export const DRIFT = Object.freeze({
  MODIFIED: "MODIFIED",     // present, but its bytes/mode no longer match the frozen entry
  MISSING: "MISSING",       // frozen, but absent (or unreadable, or no-longer-regular) now
  ADDED: "ADDED",           // present-and-regular on disk now, but not in the frozen manifest
  UNEXPECTED: "UNEXPECTED", // a NON-REGULAR path (symlink/fifo/socket/device) appeared under
                            // the frozen root — a code-injection vector, flagged with
                            // `nonRegular:true`. Never emitted for a frozen regular file.
});

// Errors we throw are always this class, so callers can distinguish a refusal (integrity
// cannot be established) from an unexpected bug.
export class FreezeManifestError extends Error {
  constructor(message) {
    super(message);
    this.name = "FreezeManifestError";
  }
}

// --- helpers -------------------------------------------------------------------------------

// A git SHA is 40 lowercase hex chars. Anything else is "unresolved" -> honest UNKNOWN.
function normalizeGitSha(gitSha) {
  if (typeof gitSha === "string" && /^[0-9a-f]{40}$/.test(gitSha)) return gitSha;
  return UNKNOWN;
}

// Normalize a relative path to POSIX form so a manifest built on one OS verifies on another.
function toPosixRel(rel) {
  return sep === "/" ? rel : rel.split(sep).join(posix.sep);
}

function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

// Recursively walk `root`, classifying every entry with `lstat` (never following a symlink).
// Returns { files, nonRegular }:
//   files       — POSIX-relative paths of REGULAR files, sorted deterministically.
//   nonRegular  — POSIX-relative paths of any symlink / fifo / socket / device that appeared
//                 under the tree, sorted. These are NOT fingerprinted (we hash real file bytes
//                 only) but they ARE surfaced so verify can flag a code-injection vector — a
//                 `symlinkSync(external, root/evil.mjs)` slipped in after freeze (advisory A2).
// Directories named in `ignore` are skipped (default: VCS internals). A symlink to a directory
// is classified non-regular (not traversed), so a link cannot smuggle in an out-of-tree subtree.
export function enumerateTree(root, { ignore = [".git"] } = {}) {
  if (typeof root !== "string" || root.length === 0) {
    throw new FreezeManifestError("enumerateTree: `root` must be a non-empty path string.");
  }
  const ignoreSet = new Set(ignore);
  const files = [];
  const nonRegular = [];
  const walk = (absDir, relDir) => {
    let names;
    try {
      names = readdirSync(absDir);
    } catch (err) {
      throw new FreezeManifestError(`enumerateTree: cannot read directory ${absDir}: ${err.code || err.message}`);
    }
    for (const name of names) {
      const abs = join(absDir, name);
      const rel = relDir ? `${relDir}/${name}` : name;
      let st;
      try {
        st = lstatSync(abs); // lstat: do NOT follow symlinks
      } catch (err) {
        throw new FreezeManifestError(`enumerateTree: cannot stat ${abs}: ${err.code || err.message}`);
      }
      if (st.isSymbolicLink()) {
        nonRegular.push(toPosixRel(rel)); // link to anything (file OR dir) -> flagged, not followed
      } else if (st.isDirectory()) {
        if (ignoreSet.has(name)) continue;
        walk(abs, rel);
      } else if (st.isFile()) {
        files.push(toPosixRel(rel));
      } else {
        nonRegular.push(toPosixRel(rel)); // fifo / socket / block / char device
      }
    }
  };
  walk(root, "");
  return {
    files: files.sort(deterministicCompare),
    nonRegular: nonRegular.sort(deterministicCompare),
  };
}

// The single source of truth for "what REGULAR files does this tree contain", used to help
// callers build (`paths: enumerateFiles(root)`). Thin wrapper over enumerateTree.
export function enumerateFiles(root, opts = {}) {
  return enumerateTree(root, opts).files;
}

// Deterministic, locale-independent path ordering (code-unit compare).
function deterministicCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// The canonical byte string whose sha256 IS `manifest_hash`. Injective over its inputs
// because JSON.stringify escapes control characters and quotes, and object key order is
// fixed by construction. `created_at` is intentionally excluded (see DESIGN NOTES).
function canonicalString({ schema_version, git_sha, entries }) {
  return JSON.stringify({
    schema_version,
    git_sha,
    // `mode` (permission bits, `st.mode & 0o777`) is part of the fingerprint (advisory A1): a
    // `chmod +x` on frozen bytes flips code from data to executable and MUST be caught.
    entries: entries.map((e) => ({ path: e.path, sha256: e.sha256, bytes: e.bytes, mode: e.mode })),
  });
}

// Recompute the code-state fingerprint from a manifest's own recorded fields.
export function computeManifestHash({ schema_version, git_sha, entries }) {
  return sha256Hex(Buffer.from(canonicalString({ schema_version, git_sha, entries }), "utf8"));
}

// --- build ---------------------------------------------------------------------------------

// buildFreezeManifest({ root, paths, gitSha, now })
//   root   : absolute/relative directory the paths are resolved against.
//   paths  : array of relative paths (POSIX or native) to freeze. Callers freezing a whole
//            tree should pass `enumerateFiles(root)`.
//   gitSha : the commit SHA the tree is at. If unresolved -> recorded as UNKNOWN (Law 54).
//   now    : DATA timestamp for `created_at`. If not supplied -> UNKNOWN (never a clock read).
//
// Returns { schema_version, git_sha, created_at,
//           entries:[{path, sha256, bytes, mode}], manifest_hash }.
//
// FAIL-CLOSED: a listed path that cannot be read, or that is not a regular file, is a refusal
// (throws) — we never emit a manifest that silently omits, guesses, or mislabels a file it was
// told to freeze.
export function buildFreezeManifest({ root, paths, gitSha, now } = {}) {
  if (typeof root !== "string" || root.length === 0) {
    throw new FreezeManifestError("buildFreezeManifest: `root` must be a non-empty path string.");
  }
  if (!Array.isArray(paths)) {
    throw new FreezeManifestError("buildFreezeManifest: `paths` must be an array of relative paths.");
  }

  const schema_version = SCHEMA_VERSION;
  const git_sha = normalizeGitSha(gitSha);
  const created_at = now === undefined || now === null ? UNKNOWN : now;

  // De-duplicate on the POSIX-normalized path so a path passed twice is frozen once.
  const seen = new Map();
  for (const p of paths) {
    if (typeof p !== "string" || p.length === 0) {
      throw new FreezeManifestError("buildFreezeManifest: every entry in `paths` must be a non-empty string.");
    }
    const relPosix = toPosixRel(p);
    if (seen.has(relPosix)) continue;
    // Resolve using native separators for the actual read.
    const abs = join(root, sep === "/" ? relPosix : relPosix.split(posix.sep).join(sep));
    let st, buf;
    try {
      st = lstatSync(abs); // lstat first: refuse to freeze a symlink/non-regular as if regular
      buf = readFileSync(abs);
    } catch (err) {
      throw new FreezeManifestError(
        `buildFreezeManifest: cannot read listed path "${relPosix}" (refusing to guess): ${err.code || err.message}`
      );
    }
    if (!st.isFile()) {
      throw new FreezeManifestError(
        `buildFreezeManifest: listed path "${relPosix}" is not a regular file (refusing to freeze a non-regular path).`
      );
    }
    seen.set(relPosix, { path: relPosix, sha256: sha256Hex(buf), bytes: buf.length, mode: st.mode & 0o777 });
  }

  const entries = [...seen.values()].sort((a, b) => deterministicCompare(a.path, b.path));
  const manifest_hash = computeManifestHash({ schema_version, git_sha, entries });

  return { schema_version, git_sha, created_at, entries, manifest_hash };
}

// --- verify --------------------------------------------------------------------------------

// verifyFreezeManifest(manifest, { root, ignore, expectedManifestHash })
//   Re-fingerprints the tree at `root` and diffs it against the frozen manifest.
//
//   expectedManifestHash (OPTIONAL, but soak callers MUST pass it): an out-of-band anchor —
//   the manifest_hash a caller independently recorded at freeze time. A content-addressed
//   manifest is self-consistent even after a WHOLESALE re-freeze of a tampered tree, so on its
//   own it can verify `ok:true` for tampered code (advisory A3). When `expectedManifestHash`
//   is supplied and does not equal the manifest's recomputed hash, verify refuses inside the
//   fail-closed path (`manifest_tampered:true`, reason HASH_MISMATCH). Absent = today's
//   content-addressed behavior.
//
// Returns { ok, drift:[{path, reason, nonRegular?}], manifest_tampered?, hash_mismatch?, error? }.
//   * FAIL-CLOSED on a bad manifest: if `manifest` is malformed, its recorded `manifest_hash`
//     disagrees with the recomputation, or it fails the `expectedManifestHash` anchor, verify
//     returns { ok:false, manifest_tampered:true, ... } WITHOUT trusting any entry.
//   * Drift reasons (closed set): MODIFIED (bytes OR mode differ / unreadable-but-present),
//     MISSING (frozen file absent or no longer a regular file), ADDED (regular file on disk,
//     not frozen), UNEXPECTED (a non-regular path appeared under the tree — `nonRegular:true`).
export function verifyFreezeManifest(manifest, { root, ignore = [".git"], expectedManifestHash } = {}) {
  if (typeof root !== "string" || root.length === 0) {
    throw new FreezeManifestError("verifyFreezeManifest: `root` must be a non-empty path string.");
  }

  // ---- fail-closed manifest validation ----
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { ok: false, manifest_tampered: true, drift: [], error: "manifest is not an object" };
  }
  const { schema_version, git_sha, entries, manifest_hash } = manifest;
  if (schema_version !== SCHEMA_VERSION) {
    return { ok: false, manifest_tampered: true, drift: [], error: `unknown schema_version: ${String(schema_version)}` };
  }
  if (typeof git_sha !== "string" || !Array.isArray(entries) || typeof manifest_hash !== "string") {
    return { ok: false, manifest_tampered: true, drift: [], error: "manifest is missing required fields" };
  }
  for (const e of entries) {
    if (
      e === null || typeof e !== "object" ||
      typeof e.path !== "string" || e.path.length === 0 ||
      typeof e.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(e.sha256) ||
      !Number.isInteger(e.bytes) || e.bytes < 0 ||
      !Number.isInteger(e.mode) || e.mode < 0 || e.mode > 0o777
    ) {
      return { ok: false, manifest_tampered: true, drift: [], error: "manifest has a malformed entry" };
    }
  }

  // Recompute the code-state fingerprint from the manifest's own fields. If the recorded
  // manifest_hash disagrees, the manifest itself was tampered with -> refuse, fail-closed.
  const recomputed = computeManifestHash({ schema_version, git_sha, entries });
  if (recomputed !== manifest_hash) {
    return { ok: false, manifest_tampered: true, drift: [], error: "manifest_hash does not match its contents" };
  }

  // A3 anchor: an externally-recorded manifest_hash must match. This catches a self-consistent
  // wholesale re-freeze that the content-addressed check above cannot. Inside fail-closed.
  if (expectedManifestHash !== undefined && expectedManifestHash !== null) {
    if (typeof expectedManifestHash !== "string" || expectedManifestHash !== recomputed) {
      return {
        ok: false, manifest_tampered: true, hash_mismatch: true, drift: [],
        error: `expectedManifestHash does not match (anchor=${String(expectedManifestHash)}, actual=${recomputed})`,
      };
    }
  }

  // ---- diff current tree vs frozen entries ----
  const drift = [];
  const frozen = new Map(entries.map((e) => [e.path, e]));

  // Enumerate what is on disk NOW (same lstat rules as build's helper): regular files AND any
  // non-regular entries that appeared under the tree.
  let tree;
  try {
    tree = enumerateTree(root, { ignore });
  } catch (err) {
    // Cannot even read the tree -> fail-closed, everything frozen is unverifiable.
    return { ok: false, drift: entries.map((e) => ({ path: e.path, reason: DRIFT.MISSING })), error: `cannot enumerate root: ${err.message}` };
  }
  const currentSet = new Set(tree.files);

  // MODIFIED / MISSING: walk the frozen set. A frozen path that is absent OR is no longer a
  // regular file (e.g. replaced by a symlink) is not in `tree.files` -> MISSING.
  for (const e of entries) {
    if (!currentSet.has(e.path)) {
      drift.push({ path: e.path, reason: DRIFT.MISSING });
      continue;
    }
    const abs = join(root, sep === "/" ? e.path : e.path.split(posix.sep).join(sep));
    let st, buf;
    try {
      st = lstatSync(abs);
      buf = readFileSync(abs);
    } catch {
      // Present in the listing but unreadable now: cannot prove it matches -> fail-closed.
      drift.push({ path: e.path, reason: DRIFT.MODIFIED });
      continue;
    }
    if (sha256Hex(buf) !== e.sha256 || buf.length !== e.bytes || (st.mode & 0o777) !== e.mode) {
      drift.push({ path: e.path, reason: DRIFT.MODIFIED });
    }
  }

  // ADDED: any regular file on disk not in the frozen set.
  for (const p of tree.files) {
    if (!frozen.has(p)) drift.push({ path: p, reason: DRIFT.ADDED });
  }

  // UNEXPECTED (A2): any non-regular path (symlink/fifo/socket/device) under the frozen tree —
  // a code-injection vector, flagged regardless of whether the manifest "knew" the path.
  for (const p of tree.nonRegular) {
    drift.push({ path: p, reason: DRIFT.UNEXPECTED, nonRegular: true });
  }

  drift.sort((a, b) => deterministicCompare(a.path, b.path) || deterministicCompare(a.reason, b.reason));
  return { ok: drift.length === 0, drift };
}
