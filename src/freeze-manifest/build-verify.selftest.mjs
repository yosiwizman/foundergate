// FREEZE MANIFEST self-test — build + verify round-trip, determinism, and honest-UNKNOWN.

import assert from "node:assert/strict";
import { symlinkSync } from "node:fs";
import { join } from "node:path";
import {
  buildFreezeManifest,
  verifyFreezeManifest,
  enumerateFiles,
  computeManifestHash,
  SCHEMA_VERSION,
  UNKNOWN,
  FreezeManifestError,
} from "./freeze-manifest.mjs";
import { harness, mkRoot, put, FAKE_SHA, T0 } from "./_fmkit.mjs";

const t = harness("Freeze manifest — build/verify (§26 provenance)");

function seedTree(root) {
  put(root, "a.txt", "alpha\n");
  put(root, "b.txt", "bravo\n");
  put(root, "nested/c.txt", "charlie\n");
  put(root, "nested/deep/d.bin", Buffer.from([0, 1, 2, 3, 255]));
}

t.check("build produces a well-formed manifest with per-file sha256 + bytes + mode", () => {
  const root = mkRoot();
  seedTree(root);
  const m = buildFreezeManifest({ root, paths: enumerateFiles(root), gitSha: FAKE_SHA, now: T0 });

  assert.equal(m.schema_version, SCHEMA_VERSION);
  assert.equal(m.git_sha, FAKE_SHA);
  assert.equal(m.created_at, T0, "created_at is the DATA timestamp passed in, verbatim");
  assert.equal(m.entries.length, 4);
  for (const e of m.entries) {
    assert.match(e.sha256, /^[0-9a-f]{64}$/, "each entry has a full sha256");
    assert.ok(Number.isInteger(e.bytes) && e.bytes >= 0, "each entry has a byte count");
    assert.ok(Number.isInteger(e.mode) && e.mode >= 0 && e.mode <= 0o777, "each entry pins its mode bits");
  }
  assert.match(m.manifest_hash, /^[0-9a-f]{64}$/);
});

t.check("entries are deterministically sorted by path", () => {
  const root = mkRoot();
  seedTree(root);
  const m = buildFreezeManifest({ root, paths: enumerateFiles(root), gitSha: FAKE_SHA, now: T0 });
  const paths = m.entries.map((e) => e.path);
  const sorted = [...paths].sort();
  assert.deepEqual(paths, sorted);
  assert.deepEqual(paths, ["a.txt", "b.txt", "nested/c.txt", "nested/deep/d.bin"]);
});

t.check("build + verify round-trip: an untouched tree verifies ok with zero drift", () => {
  const root = mkRoot();
  seedTree(root);
  const m = buildFreezeManifest({ root, paths: enumerateFiles(root), gitSha: FAKE_SHA, now: T0 });
  const res = verifyFreezeManifest(m, { root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.drift, []);
  assert.ok(!res.manifest_tampered);
});

t.check("manifest_hash equals a recomputation over the manifest's own fields", () => {
  const root = mkRoot();
  seedTree(root);
  const m = buildFreezeManifest({ root, paths: enumerateFiles(root), gitSha: FAKE_SHA, now: T0 });
  assert.equal(computeManifestHash(m), m.manifest_hash);
});

t.check("DETERMINISM: same tree + same gitSha -> identical manifest_hash", () => {
  const rootA = mkRoot();
  const rootB = mkRoot();
  seedTree(rootA);
  seedTree(rootB);
  const mA = buildFreezeManifest({ root: rootA, paths: enumerateFiles(rootA), gitSha: FAKE_SHA, now: T0 });
  const mB = buildFreezeManifest({ root: rootB, paths: enumerateFiles(rootB), gitSha: FAKE_SHA, now: T0 });
  assert.equal(mA.manifest_hash, mB.manifest_hash, "identical bytes -> identical fingerprint");
});

t.check("DETERMINISM: manifest_hash is independent of created_at (code-state identity only)", () => {
  const root = mkRoot();
  seedTree(root);
  const early = buildFreezeManifest({ root, paths: enumerateFiles(root), gitSha: FAKE_SHA, now: "2020-01-01T00:00:00Z" });
  const late = buildFreezeManifest({ root, paths: enumerateFiles(root), gitSha: FAKE_SHA, now: "2099-12-31T23:59:59Z" });
  assert.equal(early.manifest_hash, late.manifest_hash, "timestamp is provenance, not code identity");
  assert.notEqual(early.created_at, late.created_at);
});

t.check("Law 54: an unresolved git SHA is recorded as honest UNKNOWN, never guessed", () => {
  const root = mkRoot();
  seedTree(root);
  for (const bad of [undefined, null, "", "not-a-sha", "ABCDEF"]) {
    const m = buildFreezeManifest({ root, paths: enumerateFiles(root), gitSha: bad, now: T0 });
    assert.equal(m.git_sha, UNKNOWN, `gitSha ${JSON.stringify(bad)} -> UNKNOWN`);
  }
  // A tree frozen with UNKNOWN sha still round-trips (the manifest_hash binds the code).
  const m = buildFreezeManifest({ root, paths: enumerateFiles(root), gitSha: null, now: T0 });
  assert.equal(verifyFreezeManifest(m, { root }).ok, true);
});

t.check("Law 54: an unresolved created_at (no `now`) is recorded as honest UNKNOWN", () => {
  const root = mkRoot();
  seedTree(root);
  const m = buildFreezeManifest({ root, paths: enumerateFiles(root), gitSha: FAKE_SHA });
  assert.equal(m.created_at, UNKNOWN);
});

t.check("FAIL-CLOSED: build refuses (throws) when a listed path is unreadable — never omits/guesses", () => {
  const root = mkRoot();
  seedTree(root);
  assert.throws(
    () => buildFreezeManifest({ root, paths: ["a.txt", "does-not-exist.txt"], gitSha: FAKE_SHA, now: T0 }),
    FreezeManifestError
  );
});

t.check("FAIL-CLOSED: build refuses to freeze a NON-REGULAR listed path (symlink) as if regular", () => {
  const root = mkRoot();
  seedTree(root);
  symlinkSync("/etc/hostname", join(root, "link.mjs"));
  assert.throws(
    () => buildFreezeManifest({ root, paths: ["a.txt", "link.mjs"], gitSha: FAKE_SHA, now: T0 }),
    FreezeManifestError
  );
});

t.check("build de-duplicates a path passed more than once", () => {
  const root = mkRoot();
  seedTree(root);
  const m = buildFreezeManifest({ root, paths: ["a.txt", "a.txt", "b.txt"], gitSha: FAKE_SHA, now: T0 });
  assert.equal(m.entries.length, 2);
});

t.check("bad inputs are refused with FreezeManifestError (not a silent pass)", () => {
  assert.throws(() => buildFreezeManifest({ root: "", paths: [] }), FreezeManifestError);
  assert.throws(() => buildFreezeManifest({ root: "/x", paths: "not-array" }), FreezeManifestError);
  assert.throws(() => verifyFreezeManifest({}, { root: "" }), FreezeManifestError);
});

t.done("FREEZE-MANIFEST-BUILD-VERIFY-SELFTEST");
