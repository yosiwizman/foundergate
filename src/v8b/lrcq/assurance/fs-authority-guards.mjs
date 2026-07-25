// FounderGate LRCQ — filesystem authority guards (FG-CHK-197-04, FG-CHK-197-05).
//
// An independent Checker demonstrated two filesystem-control gaps in the V4 lifecycle authority:
//
//  * FG-CHK-197-04 — lifecycle records were CREATED 0600 but every READ path validated only "not a symlink"
//    and "is a regular file". There was no owner comparison and no rejection of group/other-writable modes,
//    for the marker, the intent, the claim, or the lifecycle root. Proof of absence: with the marker and
//    intent chmod'ed 0666 and the root 0777, an attach with a deliberately wrong key still reached the
//    cryptographic comparison (KEY_MISMATCH), so no mode or owner gate fired first.
//
//  * FG-CHK-197-05 — the signed lifecycle root's "exact realpath" was a STRING comparison, and on this
//    host's case-insensitive APFS volume realpathSync does not canonicalise case. A signed root differing
//    only in case resolved, passed containment, and was accepted — while being the same physical directory,
//    yielding a different derived lifecycle_root_digest for one location.
//
// THE SECURITY PROPERTY IMPLEMENTED HERE is **exact canonical filesystem OBJECT identity**, not
// case-sensitive string identity: an authority root or record is identified by its (device, inode) pair in
// addition to its canonical realpath. A different spelling of the SAME inode is the SAME authority object and
// derives the SAME digest; a DIFFERENT filesystem object is refused even when its path string looks similar.
//
// Two permission classes, deliberately distinct:
//
//  * SECRET_OR_MUTABLE — the consumed marker, the launch intent, the supervisor claim, the supervisor config
//    and the founder-authorization bytes. FounderGate generates these 0600. Any group or other permission at
//    all is refused (mode & 0o077), matching the authorization-file rule already enforced in founder-sign.
//  * PUBLIC_SIGNED — the signed activation document. It is signature-protected and meant to be readable, so
//    read access is not the threat; group/other WRITE access is (mode & 0o022).
//  * DIRECTORY — the lifecycle root. It must remain traversable (0755 is normal inside the repository), so
//    group/other WRITE access is refused (mode & 0o022).
import { lstatSync, statSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";

export const FS_GUARD_CODES = {
  OK: "OK",
  MISSING: "FS_MISSING",
  SYMLINK: "FS_SYMLINK",
  NOT_REGULAR_FILE: "FS_NOT_REGULAR_FILE",
  NOT_DIRECTORY: "FS_NOT_DIRECTORY",
  UNSAFE_OWNER: "FS_UNSAFE_OWNER",
  UNSAFE_MODE: "FS_UNSAFE_MODE",
  OBJECT_IDENTITY_MISMATCH: "FS_OBJECT_IDENTITY_MISMATCH",
};

export const FS_CLASS = { SECRET_OR_MUTABLE: "SECRET_OR_MUTABLE", PUBLIC_SIGNED: "PUBLIC_SIGNED", DIRECTORY: "DIRECTORY" };
const FORBIDDEN_MODE_BITS = {
  [FS_CLASS.SECRET_OR_MUTABLE]: 0o077,   // no group/other access at all
  [FS_CLASS.PUBLIC_SIGNED]: 0o022,       // no group/other WRITE
  [FS_CLASS.DIRECTORY]: 0o022,           // no group/other WRITE
};

// The expected owner of every FounderGate authority object: the running user.
export function expectedUid() { return typeof process.getuid === "function" ? process.getuid() : null; }

// Canonical filesystem OBJECT identity — the property the signed lifecycle root is bound by.
export function objectIdOf(st) { return "dev:" + st.dev + "/ino:" + st.ino; }
// A digest over the object identity, so two spellings of one directory derive one identical digest.
export function objectIdDigest(st) { return "sha256:" + createHash("sha256").update(objectIdOf(st)).digest("hex"); }

// Verify one authority-bearing filesystem object. Returns { ok, code, realpath, objectId, objectIdDigest, st }.
// `expectObjectId` (optional) requires the exact same filesystem object as a previous observation.
export function assertAuthorityObject(path, kind, opts = {}) {
  if (typeof path !== "string" || !path) return { ok: false, code: FS_GUARD_CODES.MISSING, detail: "no path" };
  let ls;
  try { ls = lstatSync(path); } catch { return { ok: false, code: FS_GUARD_CODES.MISSING, path }; }
  if (ls.isSymbolicLink()) return { ok: false, code: FS_GUARD_CODES.SYMLINK, path };
  let rp;
  try { rp = realpathSync(path); } catch { return { ok: false, code: FS_GUARD_CODES.MISSING, path }; }
  let st;
  try { st = statSync(rp); } catch { return { ok: false, code: FS_GUARD_CODES.MISSING, path: rp }; }
  if (kind === FS_CLASS.DIRECTORY) { if (!st.isDirectory()) return { ok: false, code: FS_GUARD_CODES.NOT_DIRECTORY, path: rp }; }
  else if (!st.isFile()) return { ok: false, code: FS_GUARD_CODES.NOT_REGULAR_FILE, path: rp };
  // OWNER: must be the running user.
  const uid = expectedUid();
  if (uid !== null && st.uid !== uid) return { ok: false, code: FS_GUARD_CODES.UNSAFE_OWNER, path: rp, uid: st.uid, expected_uid: uid };
  // MODE: no group/other permission of the class's forbidden kind.
  const forbidden = FORBIDDEN_MODE_BITS[kind];
  if (forbidden === undefined) return { ok: false, code: FS_GUARD_CODES.UNSAFE_MODE, path: rp, detail: "unknown authority class " + kind };
  if ((st.mode & forbidden) !== 0) return { ok: false, code: FS_GUARD_CODES.UNSAFE_MODE, path: rp, mode: (st.mode & 0o7777).toString(8), forbidden_bits: forbidden.toString(8), authority_class: kind };
  const oid = objectIdOf(st);
  // OBJECT IDENTITY: a different filesystem object is refused even when the path string looks similar.
  if (opts.expectObjectId !== undefined && opts.expectObjectId !== null && opts.expectObjectId !== oid) {
    return { ok: false, code: FS_GUARD_CODES.OBJECT_IDENTITY_MISMATCH, path: rp, object_id: oid, expected_object_id: opts.expectObjectId };
  }
  return { ok: true, code: FS_GUARD_CODES.OK, realpath: rp, objectId: oid, objectIdDigest: objectIdDigest(st), st, mode: (st.mode & 0o7777).toString(8) };
}
