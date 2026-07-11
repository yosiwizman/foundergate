// FounderGate V8-B VB0 — Attached Projects Registry (persistent attach), read-only foundation.
//
// Supersedes V8-A1's single in-memory attach: FounderGate now persists a registry of
// attached projects and remembers them across restarts. It is a FOUNDATION only — no
// executor, no runs, no live/send/payment path. Its whole sensitive surface is the
// CROSS-PROJECT ISOLATION BOUNDARY, enforced here in code (locked by the committed
// no-bleed / no-auto-attach / honest-UNKNOWN proofs + the independent checker):
//   - NEVER auto-attach: attach() is the ONLY add path; a missing/corrupt registry
//     loads EMPTY; activeRoot() is UNKNOWN until the founder explicitly sets active.
//   - the FOUNDER chooses the active project: setActive() only, never a default/auto.
//   - NO project's SECRET/blocked content or STATE ever bleeds into another: the
//     registry stores only paths + metadata (never content); nested-project attach is
//     rejected; withinProject() rejects any path that escapes the active root.
//   - Law 54: activeRoot() returns UNKNOWN — never another project, never a guess —
//     when no project is chosen or the active project can't be read.
//
// Pure Node, zero-dependency. It never reads a project's files here; readers
// (File Cabinet / Guide / dashboard) still scope every read to activeRoot().

import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve, basename, sep } from "node:path";

export const UNKNOWN = "UNKNOWN";
export const SCHEMA_VERSION = "1.0.0";

export class AttachError extends Error {
  constructor(message) { super(message); this.name = "AttachError"; }
}

export function emptyRegistry() {
  return { schema_version: SCHEMA_VERSION, projects: [], active_id: null };
}

// Load the persistent registry. A missing OR corrupt file loads EMPTY (never
// auto-attach, never invent) — corruption must never silently activate a project.
// Checker round-1 Finding 4: the id<->root binding on disk is untrusted, so every
// loaded entry is re-verified (id must equal projectId(root)); mismatches are DROPPED,
// and an active_id that no longer names a surviving entry is cleared.
export function loadRegistry(path) {
  if (!existsSync(path)) return emptyRegistry();
  try {
    const r = JSON.parse(readFileSync(path, "utf8"));
    const projects = (Array.isArray(r.projects) ? r.projects : [])
      .filter((p) => p && typeof p.id === "string" && typeof p.root === "string" && p.id === projectId(p.root));
    const active = typeof r.active_id === "string" && projects.some((p) => p.id === r.active_id) ? r.active_id : null;
    return {
      schema_version: typeof r.schema_version === "string" ? r.schema_version : SCHEMA_VERSION,
      projects,
      active_id: active,
    };
  } catch { return emptyRegistry(); }
}

export function saveRegistry(path, reg) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(reg, null, 2) + "\n");
}

// The on-disk CANONICAL root: realpath (resolves symlinks AND normalises case on
// case-insensitive volumes) when the path exists, else a lexical resolve. This single
// canonical form is the basis for the id, idempotency, and the nesting check — closing
// the checker's hash-collision, symlink, and case-insensitive attacks at their source.
export function canonicalRoot(root) {
  const abs = resolve(root);
  try { return realpathSync(abs); } catch { return abs; }
}

// Is the volume holding `p` case-INSENSITIVE (macOS APFS default; Windows)? Asked by
// whether a case-flipped spelling of the SAME path stats to the same inode. (checker
// round-2 Finding 3: realpathSync does NOT case-normalise on macOS.)
function isCaseInsensitive(p) {
  try {
    const a = statSync(p);
    const alt = p === p.toLowerCase() ? p.toUpperCase() : p.toLowerCase();
    if (alt === p) return false;
    const b = statSync(alt);
    return a.dev === b.dev && a.ino === b.ino;
  } catch { return false; }
}

// The IDENTITY KEY for a project: its canonical real path, case-folded ONLY on a
// case-insensitive volume. Two spellings of the SAME physical dir yield the same key;
// on a case-SENSITIVE volume distinct-case dirs correctly stay distinct.
export function canonicalKey(root) {
  const real = canonicalRoot(root);
  return isCaseInsensitive(real) ? real.toLowerCase() : real;
}

// Collision-resistant deterministic id from the canonical KEY (checker Finding 1: the
// old 32-bit rolling hash was attacker-collidable). SHA-256; same physical dir => same
// id, distinct dirs => distinct ids.
export function projectId(root) {
  return "p" + createHash("sha256").update(canonicalKey(root)).digest("hex").slice(0, 16);
}

// realpath the longest EXISTING prefix of `p` (resolving symlinks at EVERY level,
// including the leaf), then append any not-yet-existing suffix lexically. Used by
// withinProject so a leaf symlink cannot escape (checker round-2 Finding 2).
function realpathPrefix(p) {
  let cur = p; const tail = [];
  while (!existsSync(cur)) {
    const parent = dirname(cur);
    if (parent === cur) break;
    tail.unshift(basename(cur));
    cur = parent;
  }
  let real;
  try { real = realpathSync(cur); } catch { real = cur; }
  return tail.length ? join(real, ...tail) : real;
}

// Attach a project EXPLICITLY. Validates it is a real directory containing
// `.foundergate/`. NEVER auto-attach — this is the only add path, and it does NOT set
// the project active. Rejects a project nested inside (or containing) an already-
// attached project, which would be a cross-project bleed risk.
export function attach(reg, root, opts = {}) {
  if (typeof root !== "string" || !root.length) throw new AttachError("projectRoot must be a non-empty path");
  const abs = canonicalRoot(root); // realpath'd: case-normalised, symlinks resolved
  const fg = join(abs, ".foundergate");
  if (!existsSync(fg) || !statSync(fg).isDirectory()) throw new AttachError(`no .foundergate/ folder found under ${abs} — cannot attach`);
  const id = projectId(abs);
  const key = canonicalKey(abs);
  for (const p of reg.projects) {
    // idempotent ONLY when it is genuinely the SAME physical dir (checker Finding 1:
    // never short-circuit on id equality alone — compare canonical KEYS, case-folded
    // on case-insensitive volumes so "Outer" and "outer" don't split — Finding 3).
    if (canonicalKey(p.root) === key) return { reg, id };
    // nesting check on canonical KEYS (Finding 3: case-insensitive bypass closed).
    const a = canonicalKey(p.root) + sep, b = key + sep;
    if (a.startsWith(b) || b.startsWith(a)) {
      throw new AttachError(`cannot attach a project nested within another attached project (isolation boundary): ${abs} vs ${p.root}`);
    }
  }
  reg.projects.push({ id, root: abs, name: opts.name || basename(abs), attached_at: opts.attached_at || null });
  return { reg, id };
}

export function detach(reg, id) {
  reg.projects = reg.projects.filter((p) => p.id !== id);
  if (reg.active_id === id) reg.active_id = null; // never leave a dangling active
  return reg;
}

// The FOUNDER chooses the active project. Only an existing id; never auto-selected.
export function setActive(reg, id) {
  if (!reg.projects.some((p) => p.id === id)) throw new AttachError(`unknown project id ${id} — attach it first`);
  reg.active_id = id;
  return reg;
}

// The active project's root, or UNKNOWN. Law 54: if none chosen, the id is unknown, or
// the active project's `.foundergate` can't be read → UNKNOWN. NEVER another project,
// never a guess, never a default.
export function activeRoot(reg) {
  if (!reg.active_id) return UNKNOWN;
  const p = reg.projects.find((x) => x.id === reg.active_id);
  if (!p) return UNKNOWN;
  try {
    const fg = join(p.root, ".foundergate");
    if (!existsSync(fg) || !statSync(fg).isDirectory()) return UNKNOWN;
  } catch { return UNKNOWN; }
  return p.root;
}

// Registry listing for a UI — paths + metadata only, NEVER any file content.
export function list(reg) {
  return reg.projects.map((p) => ({ id: p.id, root: p.root, name: p.name, active: p.id === reg.active_id }));
}

// Isolation helper for readers: resolve a relative path WITHIN a project root and
// reject anything that escapes it — so a path from project A can never reach project B.
// Checker Finding 2: this must be REALPATH-based, not lexical — a symlink inside A that
// points into B keeps a lexically-in-bounds string. We realpath the target's existing
// parent directory (following any symlinks) and re-check containment against the
// realpath'd root, failing CLOSED.
// Callers MUST open the RETURNED path (never re-open the raw relPath themselves).
export function withinProject(root, relPath) {
  // Defense-in-depth (checker round-3 note A2): reject any `..` segment so a
  // symlink-then-`..` divergence between the lexical resolve and the real filesystem
  // can never arise.
  if (String(relPath).split(/[\\/]+/).includes("..")) throw new AttachError(`'..' is not allowed in a project-relative path: ${relPath}`);
  let rootReal;
  try { rootReal = realpathSync(resolve(root)); } catch { throw new AttachError(`active project root cannot be read: ${root}`); }
  const target = resolve(rootReal, relPath);
  // resolve symlinks at EVERY existing level, including the LEAF (Finding 2), then
  // re-check containment against the realpath'd root — fail closed on any escape.
  const real = realpathPrefix(target);
  if (real !== rootReal && !real.startsWith(rootReal + sep)) {
    throw new AttachError(`path escapes the active project boundary: ${relPath}`);
  }
  return real;
}
