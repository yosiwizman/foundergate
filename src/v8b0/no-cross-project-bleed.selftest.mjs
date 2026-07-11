// FounderGate V8-B VB0 — ISOLATION PROOF: no cross-project bleed.
//
// The checker's job is to make one project's content, path, or state surface under
// another. This proof locks the boundary: the registry stores paths/metadata only
// (never content, never a secret), activeRoot returns ONLY the active project's root,
// a path from A can never escape into B (withinProject), and a project nested inside
// another can't be attached.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";
import { emptyRegistry, attach, setActive, activeRoot, withinProject, saveRegistry, canonicalRoot, AttachError } from "./attached-projects.mjs";

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
function mkProject(secret) {
  const p = mkdtempSync(join(tmpdir(), "vb0-proj-"));
  mkdirSync(join(p, ".foundergate"));
  if (secret) writeFileSync(join(p, ".foundergate", "secret.txt"), secret);
  return p;
}

console.log("== VB0 isolation proof: no cross-project bleed ==");

check("activeRoot returns ONLY the active project — never the other attached project", () => {
  const a = mkProject(), b = mkProject();
  const reg = emptyRegistry();
  const ra = attach(reg, a).id, rb = attach(reg, b).id;
  setActive(reg, ra); assert.equal(activeRoot(reg), canonicalRoot(a)); assert.notEqual(activeRoot(reg), canonicalRoot(b));
  setActive(reg, rb); assert.equal(activeRoot(reg), canonicalRoot(b)); assert.notEqual(activeRoot(reg), canonicalRoot(a));
});

check("the persisted registry contains NO project file CONTENT (paths/metadata only)", () => {
  const a = mkProject("SUPERSECRET-TOKEN-abc123");
  const reg = emptyRegistry(); const { id } = attach(reg, a); setActive(reg, id);
  const path = join(mkdtempSync(join(tmpdir(), "vb0-reg-")), "attached.json");
  saveRegistry(path, reg);
  const raw = readFileSync(path, "utf8");
  assert.ok(!raw.includes("SUPERSECRET-TOKEN-abc123"), "a project's secret must never be written into the registry");
  // the registry holds the root PATH only (the canonical realpath)
  assert.ok(raw.includes(canonicalRoot(a)));
});

check("withinProject REJECTS a path escaping the active root (A can't reach B via ..)", () => {
  const a = mkProject(), b = mkProject();
  // a lexical traversal from A toward B's basename must be refused
  assert.throws(() => withinProject(a, join("..", basename(b), ".foundergate", "secret.txt")), AttachError);
  // an in-bounds path is allowed (returns the realpath'd location)
  assert.equal(withinProject(a, ".foundergate/status.json"), join(canonicalRoot(a), ".foundergate", "status.json"));
  // absolute path into B is refused
  assert.throws(() => withinProject(a, join(b, ".foundergate", "secret.txt")), AttachError);
  // defense-in-depth (round-3 note A2): ANY `..` segment is refused outright
  assert.throws(() => withinProject(a, "sub/../.foundergate/x"), /not allowed/);
});

check("a project NESTED within another attached project cannot be attached (nesting bleed)", () => {
  const outer = mkProject();
  const innerDir = join(outer, "sub"); mkdirSync(innerDir); mkdirSync(join(innerDir, ".foundergate"));
  const reg = emptyRegistry(); attach(reg, outer);
  assert.throws(() => attach(reg, innerDir), /nested within another attached project/);
  // and the reverse: attaching an ancestor of an already-attached project
  const reg2 = emptyRegistry(); attach(reg2, innerDir);
  assert.throws(() => attach(reg2, outer), /nested within another attached project/);
});

// ---- round-2 proofs: the checker's HIGH/MEDIUM findings, locked ----

check("Finding 1 (HIGH): TWO distinct projects get DISTINCT ids; setActive picks the right root (no hash-collision drop)", () => {
  const base = mkdtempSync(join(tmpdir(), "vb0-coll-"));
  // the classic 32-bit-hash collision pair "Aa" vs "BB" — must NOT collide now.
  const a = join(base, "Aa"), b = join(base, "BB");
  for (const d of [a, b]) { mkdirSync(d); mkdirSync(join(d, ".foundergate")); }
  const reg = emptyRegistry();
  const ida = attach(reg, a).id, idb = attach(reg, b).id;
  assert.notEqual(ida, idb, "distinct roots must get distinct ids (crypto id)");
  assert.equal(reg.projects.length, 2, "the second distinct project must NOT be silently dropped");
  setActive(reg, idb); assert.equal(activeRoot(reg), canonicalRoot(b), "founder chose B -> must get B, not A");
});

check("Finding 2 (MEDIUM): withinProject rejects a SYMLINK inside A that points into B", () => {
  const a = mkProject(), b = mkProject("SECRET-IN-B");
  symlinkSync(b, join(a, "linkToB")); // a symlink inside A -> B
  assert.throws(() => withinProject(a, join("linkToB", ".foundergate", "secret.txt")), AttachError);
});

check("Finding 3 (MEDIUM): realpath canonicalisation collapses aliases (case/symlink) -> idempotent, and nesting via an alias is rejected", () => {
  const p = mkProject();
  const aliasBase = mkdtempSync(join(tmpdir(), "vb0-alias-"));
  const alias = join(aliasBase, "alias"); symlinkSync(p, alias); // alias -> p (same physical dir)
  const reg = emptyRegistry();
  attach(reg, p); attach(reg, alias);
  assert.equal(reg.projects.length, 1, "an aliased path to the SAME physical dir must be idempotent");
  // nesting via alias: sub inside p, reached through a symlink, must still be rejected
  const sub = join(p, "sub"); mkdirSync(sub); mkdirSync(join(sub, ".foundergate"));
  const subAlias = join(aliasBase, "subAlias"); symlinkSync(sub, subAlias);
  assert.throws(() => attach(reg, subAlias), /nested within another attached project/);
});

// do two paths refer to the SAME physical directory (inode)?
function sameDir(p, q) { try { const a = statSync(p), b = statSync(q); return a.dev === b.dev && a.ino === b.ino; } catch { return false; } }

check("Finding 2 (round 2): a LEAF symlink (final path component) into B is also rejected", () => {
  const a = mkProject(), b = mkProject("SECRET-IN-B");
  symlinkSync(join(b, ".foundergate", "secret.txt"), join(a, "leakFile")); // leaf symlink -> file in B
  assert.throws(() => withinProject(a, "leakFile"), AttachError);
  symlinkSync(join(b, ".foundergate"), join(a, "leakDir")); // leaf symlink -> dir in B
  assert.throws(() => withinProject(a, "leakDir"), AttachError);
});

check("Finding 3 (round 2): case aliases collapse on case-insensitive FS; stay distinct on case-sensitive FS", () => {
  const base = mkdtempSync(join(tmpdir(), "vb0-case-"));
  const Outer = join(base, "Outer"); mkdirSync(Outer); mkdirSync(join(Outer, ".foundergate"));
  const lower = join(base, "outer");
  const ci = sameDir(Outer, lower); // does the lowercase spelling hit the SAME physical dir?
  const reg = emptyRegistry(); attach(reg, Outer);
  if (ci) {
    attach(reg, lower); // a case-variant of the SAME physical dir
    assert.equal(reg.projects.length, 1, "case-variant of the same dir must be idempotent on a case-insensitive FS");
    const sub = join(Outer, "sub"); mkdirSync(sub); mkdirSync(join(sub, ".foundergate"));
    assert.throws(() => attach(reg, join(lower, "sub")), /nested within another attached project/, "case-variant nested child must be rejected");
  } else {
    // case-sensitive FS: 'outer' is a genuinely different, non-existent path -> rejected
    assert.throws(() => attach(reg, lower), /no \.foundergate/);
  }
});

console.log(`\nV8B0-NO-CROSS-PROJECT-BLEED-SELFTEST: PASS (${pass} checks)`);
