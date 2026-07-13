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
//     deterministically-sorted entries (path + sha256 + bytes). It deliberately does NOT
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
  MODIFIED: "MODIFIED", // present, but its bytes no longer match the frozen sha256
  MISSING: "MISSING",   // frozen, but absent (or unreadable) on disk now
  ADDED: "ADDED",       // present on disk now, but not in the frozen manifest
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

// Recursively enumerate REGULAR files under `root`, returning POSIX-relative paths, sorted
// deterministically. Directories in `ignore` are skipped (default: VCS internals). Symlinks
// and other non-regular entries are skipped — we fingerprint real file bytes only, and never
// follow a link out of the frozen tree. `enumerateFiles` is the single source of truth for
// "what files does this tree contain", used both to help callers build and by verify to
// detect ADDED files.
export function enumerateFiles(root, { ignore = [".git"] } = {}) {
  if (typeof root !== "string" || root.length === 0) {
    throw new FreezeManifestError("enumerateFiles: `root` must be a non-empty path string.");
  }
  const ignoreSet = new Set(ignore);
  const out = [];
  const walk = (absDir, relDir) => {
    let names;
    try {
      names = readdirSync(absDir);
    } catch (err) {
      throw new FreezeManifestError(`enumerateFiles: cannot read directory ${absDir}: ${err.code || err.message}`);
    }
    for (const name of names) {
      const abs = join(absDir, name);
      const rel = relDir ? `${relDir}/${name}` : name;
      let st;
      try {
        st = lstatSync(abs); // lstat: do NOT follow symlinks
      } catch (err) {
        throw new FreezeManifestError(`enumerateFiles: cannot stat ${abs}: ${err.code || err.message}`);
      }
      if (st.isDirectory()) {
        if (ignoreSet.has(name)) continue;
        walk(abs, rel);
      } else if (st.isFile()) {
        out.push(toPosixRel(rel));
      }
      // symlinks / sockets / fifos / devices: skipped by design.
    }
  };
  walk(root, "");
  return out.sort(deterministicCompare);
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
    entries: entries.map((e) => ({ path: e.path, sha256: e.sha256, bytes: e.bytes })),
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
// Returns { schema_version, git_sha, created_at, entries:[{path,sha256,bytes}], manifest_hash }.
//
// FAIL-CLOSED: a listed path that cannot be read is a refusal (throws) — we will not emit a
// manifest that silently omits or guesses a file it was told to freeze.
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
    let buf;
    try {
      buf = readFileSync(abs);
    } catch (err) {
      throw new FreezeManifestError(
        `buildFreezeManifest: cannot read listed path "${relPosix}" (refusing to guess): ${err.code || err.message}`
      );
    }
    seen.set(relPosix, { path: relPosix, sha256: sha256Hex(buf), bytes: buf.length });
  }

  const entries = [...seen.values()].sort((a, b) => deterministicCompare(a.path, b.path));
  const manifest_hash = computeManifestHash({ schema_version, git_sha, entries });

  return { schema_version, git_sha, created_at, entries, manifest_hash };
}

// --- verify --------------------------------------------------------------------------------

// verifyFreezeManifest(manifest, { root, ignore })
//   Re-fingerprints the tree at `root` and diffs it against the frozen manifest.
//
// Returns { ok, drift:[{path, reason}], manifest_tampered?, error? }.
//   * FAIL-CLOSED on a bad manifest: if `manifest` is malformed, or its recorded
//     `manifest_hash` does not equal the recomputation over its own fields, verify returns
//     { ok:false, manifest_tampered:true, ... } WITHOUT trusting any entry. A tampered or
//     unreadable manifest is never silently reported ok.
//   * Drift reasons (closed set): MODIFIED (bytes differ / unreadable-but-present),
//     MISSING (frozen file absent), ADDED (on disk now, not frozen).
export function verifyFreezeManifest(manifest, { root, ignore = [".git"] } = {}) {
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
      !Number.isInteger(e.bytes) || e.bytes < 0
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

  // ---- diff current tree vs frozen entries ----
  const drift = [];
  const frozen = new Map(entries.map((e) => [e.path, e]));

  // Enumerate what is on disk NOW (same rules as build's helper).
  let current;
  try {
    current = enumerateFiles(root, { ignore });
  } catch (err) {
    // Cannot even read the tree -> fail-closed, everything frozen is unverifiable.
    return { ok: false, drift: entries.map((e) => ({ path: e.path, reason: DRIFT.MISSING })), error: `cannot enumerate root: ${err.message}` };
  }
  const currentSet = new Set(current);

  // MODIFIED / MISSING: walk the frozen set.
  for (const e of entries) {
    if (!currentSet.has(e.path)) {
      drift.push({ path: e.path, reason: DRIFT.MISSING });
      continue;
    }
    const abs = join(root, sep === "/" ? e.path : e.path.split(posix.sep).join(sep));
    let buf;
    try {
      buf = readFileSync(abs);
    } catch {
      // Present in the listing but unreadable now: cannot prove it matches -> fail-closed.
      drift.push({ path: e.path, reason: DRIFT.MODIFIED });
      continue;
    }
    if (sha256Hex(buf) !== e.sha256 || buf.length !== e.bytes) {
      drift.push({ path: e.path, reason: DRIFT.MODIFIED });
    }
  }

  // ADDED: any file on disk not in the frozen set.
  for (const p of current) {
    if (!frozen.has(p)) drift.push({ path: p, reason: DRIFT.ADDED });
  }

  drift.sort((a, b) => deterministicCompare(a.path, b.path) || deterministicCompare(a.reason, b.reason));
  return { ok: drift.length === 0, drift };
}
