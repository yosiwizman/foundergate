// FREEZE MANIFEST self-test — drift detection (modify / remove / add) and manifest tamper.
//
// This is the security-critical proof: any change to the frozen code, and any tamper with
// the manifest itself, MUST be reported. Nothing here may pass silently (§29 gate).

import assert from "node:assert/strict";
import { rmSync, chmodSync, symlinkSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  buildFreezeManifest,
  verifyFreezeManifest,
  enumerateFiles,
  computeManifestHash,
  DRIFT,
} from "./freeze-manifest.mjs";
import { harness, mkRoot, put, FAKE_SHA, T0 } from "./_fmkit.mjs";

const t = harness("Freeze manifest — drift & tamper (§29 gate, fail-closed)");

function seedAndFreeze() {
  const root = mkRoot();
  put(root, "a.txt", "alpha\n");
  put(root, "b.txt", "bravo\n");
  put(root, "nested/c.txt", "charlie\n");
  const manifest = buildFreezeManifest({ root, paths: enumerateFiles(root), gitSha: FAKE_SHA, now: T0 });
  return { root, manifest };
}

t.check("DRIFT — MODIFIED: changing a frozen file's bytes is detected", () => {
  const { root, manifest } = seedAndFreeze();
  put(root, "b.txt", "bravo-CHANGED\n"); // same path, different bytes
  const res = verifyFreezeManifest(manifest, { root });
  assert.equal(res.ok, false);
  assert.deepEqual(res.drift, [{ path: "b.txt", reason: DRIFT.MODIFIED }]);
});

t.check("DRIFT — MODIFIED: a same-length but different-byte edit is still detected", () => {
  const { root, manifest } = seedAndFreeze();
  put(root, "a.txt", "ALPHA\n"); // identical length to "alpha\n", different content
  const res = verifyFreezeManifest(manifest, { root });
  assert.equal(res.ok, false);
  assert.deepEqual(res.drift, [{ path: "a.txt", reason: DRIFT.MODIFIED }]);
});

t.check("DRIFT — MISSING: removing a frozen file is detected", () => {
  const { root, manifest } = seedAndFreeze();
  rmSync(join(root, "nested/c.txt"));
  const res = verifyFreezeManifest(manifest, { root });
  assert.equal(res.ok, false);
  assert.deepEqual(res.drift, [{ path: "nested/c.txt", reason: DRIFT.MISSING }]);
});

t.check("DRIFT — ADDED: introducing a new file is detected", () => {
  const { root, manifest } = seedAndFreeze();
  put(root, "nested/EXTRA.txt", "sneaked in\n");
  const res = verifyFreezeManifest(manifest, { root });
  assert.equal(res.ok, false);
  assert.deepEqual(res.drift, [{ path: "nested/EXTRA.txt", reason: DRIFT.ADDED }]);
});

t.check("DRIFT — combined modify + remove + add are all reported together", () => {
  const { root, manifest } = seedAndFreeze();
  put(root, "a.txt", "alpha-CHANGED\n");   // MODIFIED
  rmSync(join(root, "b.txt"));              // MISSING
  put(root, "z-new.txt", "new\n");          // ADDED
  const res = verifyFreezeManifest(manifest, { root });
  assert.equal(res.ok, false);
  assert.deepEqual(res.drift, [
    { path: "a.txt", reason: DRIFT.MODIFIED },
    { path: "b.txt", reason: DRIFT.MISSING },
    { path: "z-new.txt", reason: DRIFT.ADDED },
  ]);
});

t.check("TAMPER — flipping a recorded sha256 breaks manifest_hash and is refused (fail-closed)", () => {
  const { root, manifest } = seedAndFreeze();
  const tampered = structuredClone(manifest);
  // Swap one hex digit of an entry's sha256 WITHOUT updating manifest_hash.
  const s = tampered.entries[0].sha256;
  tampered.entries[0].sha256 = (s[0] === "a" ? "b" : "a") + s.slice(1);
  const res = verifyFreezeManifest(tampered, { root });
  assert.equal(res.ok, false);
  assert.equal(res.manifest_tampered, true);
  assert.deepEqual(res.drift, []);
});

t.check("TAMPER — swapping git_sha without re-hashing is refused", () => {
  const { root, manifest } = seedAndFreeze();
  const tampered = structuredClone(manifest);
  tampered.git_sha = "ffffffffffffffffffffffffffffffffffffffff";
  const res = verifyFreezeManifest(tampered, { root });
  assert.equal(res.ok, false);
  assert.equal(res.manifest_tampered, true);
});

t.check("TAMPER — a re-hashed manifest with a fake sha256 fails on DISK drift, not silently", () => {
  // If an attacker edits an entry AND recomputes manifest_hash so the manifest is internally
  // consistent, the fingerprint no longer matches the real file on disk -> MODIFIED drift.
  const { root, manifest } = seedAndFreeze();
  const forged = structuredClone(manifest);
  forged.entries[0].sha256 = "0".repeat(64);
  forged.manifest_hash = computeManifestHash(forged); // internally consistent forgery
  const res = verifyFreezeManifest(forged, { root });
  assert.equal(res.ok, false);
  assert.ok(!res.manifest_tampered, "internally consistent -> not a manifest_hash tamper");
  assert.equal(res.drift[0].reason, DRIFT.MODIFIED, "but the real file no longer matches the forged hash");
});

t.check("FAIL-CLOSED — a non-object / malformed manifest is refused, never ok", () => {
  const { root } = seedAndFreeze();
  for (const bad of [null, 42, "x", [], {}, { schema_version: "freeze-manifest/1" }]) {
    const res = verifyFreezeManifest(bad, { root });
    assert.equal(res.ok, false);
    assert.equal(res.manifest_tampered, true);
  }
});

t.check("FAIL-CLOSED — an unknown schema_version is refused", () => {
  const { root, manifest } = seedAndFreeze();
  const bad = structuredClone(manifest);
  bad.schema_version = "freeze-manifest/999";
  const res = verifyFreezeManifest(bad, { root });
  assert.equal(res.ok, false);
  assert.equal(res.manifest_tampered, true);
});

t.check("verify is read-only: it does not mutate the tree (re-verify still ok)", () => {
  const { root, manifest } = seedAndFreeze();
  assert.equal(verifyFreezeManifest(manifest, { root }).ok, true);
  assert.equal(verifyFreezeManifest(manifest, { root }).ok, true);
});

// ---- Checker advisory A1 — mode fingerprint (chmod on frozen bytes -> MODIFIED) ----
t.check("A1 — flipping the exec bit (chmod +x) on unchanged bytes is detected as MODIFIED", () => {
  const { root, manifest } = seedAndFreeze();
  const abs = join(root, "a.txt");
  const cur = statSync(abs).mode & 0o777;
  chmodSync(abs, cur | 0o111); // add exec bits; bytes untouched
  const res = verifyFreezeManifest(manifest, { root });
  assert.equal(res.ok, false);
  assert.deepEqual(res.drift, [{ path: "a.txt", reason: DRIFT.MODIFIED }]);
});

t.check("A1 — same bytes AND same mode -> no drift (mode is part of the fingerprint, not noise)", () => {
  const { root, manifest } = seedAndFreeze();
  const abs = join(root, "a.txt");
  const cur = statSync(abs).mode & 0o777;
  chmodSync(abs, cur); // no-op re-chmod
  assert.equal(verifyFreezeManifest(manifest, { root }).ok, true);
});

// ---- Checker advisory A2 — a non-regular path added after freeze is a code-injection vector ----
t.check("A2 — a symlink added under the frozen root is detected as UNEXPECTED (nonRegular)", () => {
  const { root, manifest } = seedAndFreeze();
  symlinkSync("/etc/hostname", join(root, "evil.mjs")); // external target smuggled in
  const res = verifyFreezeManifest(manifest, { root });
  assert.equal(res.ok, false);
  assert.equal(res.drift.length, 1);
  assert.deepEqual(res.drift[0], { path: "evil.mjs", reason: DRIFT.UNEXPECTED, nonRegular: true });
});

t.check("A2 — replacing a frozen regular file with a symlink is MISSING (not silently ok)", () => {
  const { root, manifest } = seedAndFreeze();
  rmSync(join(root, "b.txt"));
  symlinkSync("/etc/hostname", join(root, "b.txt")); // same path, now a symlink
  const res = verifyFreezeManifest(manifest, { root });
  assert.equal(res.ok, false);
  // b.txt is no longer a regular file -> MISSING; the symlink appearance -> UNEXPECTED.
  assert.deepEqual(res.drift, [
    { path: "b.txt", reason: DRIFT.MISSING },
    { path: "b.txt", reason: DRIFT.UNEXPECTED, nonRegular: true },
  ]);
});

// ---- Checker advisory A3 — external verify-time anchor (expectedManifestHash) ----
t.check("A3 — matching expectedManifestHash verifies ok on a clean tree", () => {
  const { root, manifest } = seedAndFreeze();
  const res = verifyFreezeManifest(manifest, { root, expectedManifestHash: manifest.manifest_hash });
  assert.equal(res.ok, true);
  assert.deepEqual(res.drift, []);
});

t.check("A3 — a self-consistent WHOLESALE re-freeze of a tampered tree is caught by the anchor", () => {
  const anchorSha = seedAndFreeze().manifest.manifest_hash; // the honest hash, recorded out-of-band
  // Attacker rebuilds a DIFFERENT tree and produces a self-consistent manifest for it.
  const evil = mkRoot();
  put(evil, "a.txt", "alpha\n");
  put(evil, "b.txt", "bravo\n");
  put(evil, "nested/c.txt", "PWNED\n"); // tampered content
  const evilManifest = buildFreezeManifest({ root: evil, paths: enumerateFiles(evil), gitSha: FAKE_SHA, now: T0 });
  // Content-addressed check alone would pass (the evil manifest matches the evil tree)...
  assert.equal(verifyFreezeManifest(evilManifest, { root: evil }).ok, true);
  // ...but the external anchor refuses it, fail-closed.
  const res = verifyFreezeManifest(evilManifest, { root: evil, expectedManifestHash: anchorSha });
  assert.equal(res.ok, false);
  assert.equal(res.manifest_tampered, true);
  assert.equal(res.hash_mismatch, true);
  assert.deepEqual(res.drift, []);
});

t.check("A3 — a non-string / wrong-type anchor is refused (never coerced to ok)", () => {
  const { root, manifest } = seedAndFreeze();
  const res = verifyFreezeManifest(manifest, { root, expectedManifestHash: 12345 });
  assert.equal(res.ok, false);
  assert.equal(res.hash_mismatch, true);
});

// ---- Checker advisory A4 — per-entry structural validation is pinned (can't silently rot) ----
t.check("A4 — a malformed entry (bad bytes / sha256 / path / mode) -> manifest_tampered", () => {
  const { root, manifest } = seedAndFreeze();
  const malformations = [
    (m) => { m.entries[0].bytes = -1; },            // negative bytes
    (m) => { m.entries[0].bytes = 1.5; },           // non-integer bytes
    (m) => { m.entries[0].bytes = "6"; },           // wrong-type bytes
    (m) => { m.entries[0].sha256 = "abc"; },        // wrong-shape sha256
    (m) => { m.entries[0].sha256 = 42; },           // wrong-type sha256
    (m) => { m.entries[0].path = ""; },             // empty path
    (m) => { m.entries[0].mode = -1; },             // out-of-range mode
    (m) => { m.entries[0].mode = 0o1000; },         // mode above 0o777
    (m) => { m.entries[0].mode = "755"; },          // wrong-type mode
    (m) => { delete m.entries[0].mode; },           // missing mode field
  ];
  for (const mutate of malformations) {
    const bad = structuredClone(manifest);
    mutate(bad);
    const res = verifyFreezeManifest(bad, { root });
    assert.equal(res.ok, false, "malformed entry must not verify ok");
    assert.equal(res.manifest_tampered, true, "malformed entry -> manifest_tampered");
  }
});

t.done("FREEZE-MANIFEST-DRIFT-TAMPER-SELFTEST");
