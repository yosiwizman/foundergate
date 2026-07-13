// L3 — ENVIRONMENT PROVENANCE self-test. PURE: every test passes a FAKE env object as DATA;
// the real process env is NEVER read into committed output. Exits 0 on pass, non-zero on fail.

import assert from "node:assert/strict";
import {
  captureEnvironmentProvenance,
  verifyNoSecrets,
  looksLikeSecretValue,
  isSecretName,
  SCHEMA_VERSION,
  UNKNOWN,
  REDACTED,
} from "./capture.mjs";

// Tiny PASS/among-checks harness matching the repo's existing self-test style.
let pass = 0;
const title = "L3 environment provenance (capture + verifyNoSecrets)";
console.log(`== ${title} ==`);
function check(name, fn) {
  fn();
  pass++;
  console.log(`  PASS: ${name}`);
}

// A fixed clock anchor for deterministic timestamps (DATA, never a real clock read).
const NOW_ISO = "2026-07-13T12:00:00.000Z";

// A planted FAKE secret VALUE. We assert it NEVER appears anywhere in the output.
const PLANTED_SECRET = "sk-live_ABCDEF0123456789abcdef0123456789";

// ---------------------------------------------------------------------------------------------

check("allowlist-only capture: non-allowlisted names are never captured", () => {
  const env = { PATH: "/usr/bin", HOME: "/Users/x", CI: "true", TZ: "UTC" };
  const prov = captureEnvironmentProvenance({
    env, platform: "darwin", arch: "arm64", cpuCount: 8, totalMem: 17179869184,
    nodeVersion: "v24.0.0", now: NOW_ISO, allowlist: ["CI", "TZ"],
  });
  assert.deepEqual(Object.keys(prov.env_allowlisted).sort(), ["CI", "TZ"]);
  // The full env was NOT captured — PATH/HOME are absent though present in env.
  assert.ok(!("PATH" in prov.env_allowlisted));
  assert.ok(!("HOME" in prov.env_allowlisted));
  assert.equal(prov.env_allowlisted.CI, "true");
  assert.equal(prov.env_allowlisted.TZ, "UTC");
});

check("record shape + top-level DATA fields pass through", () => {
  const prov = captureEnvironmentProvenance({
    env: {}, platform: "linux", arch: "x64", cpuCount: 4, totalMem: 8000000000,
    nodeVersion: "v24.1.0", now: NOW_ISO, allowlist: [],
  });
  assert.equal(prov.schema_version, SCHEMA_VERSION);
  assert.equal(prov.node_version, "v24.1.0");
  assert.equal(prov.platform, "linux");
  assert.equal(prov.arch, "x64");
  assert.equal(prov.cpu_count, 4);
  assert.equal(prov.total_mem, 8000000000);
  assert.equal(prov.captured_at, NOW_ISO);
  assert.deepEqual(prov.env_allowlisted, {});
});

check("a secret-shaped NAME is EXCLUDED even if it is on the allowlist", () => {
  const env = {
    SECRET_TOKEN: "xyz", API_KEY: "k", MY_PASSWORD: "p", AWS_CREDENTIAL: "c",
    GH_AUTH: "a", SIGNING_KEY: "s", SAFE_FLAG: "on",
  };
  const allowlist = ["SECRET_TOKEN", "API_KEY", "MY_PASSWORD", "AWS_CREDENTIAL", "GH_AUTH", "SIGNING_KEY", "SAFE_FLAG"];
  const prov = captureEnvironmentProvenance({ env, now: NOW_ISO, allowlist });
  // Only the non-secret-shaped name survives.
  assert.deepEqual(Object.keys(prov.env_allowlisted), ["SAFE_FLAG"]);
  assert.equal(prov.env_allowlisted.SAFE_FLAG, "on");
  // None of the secret-shaped names leaked in.
  for (const n of ["SECRET_TOKEN", "API_KEY", "MY_PASSWORD", "AWS_CREDENTIAL", "GH_AUTH", "SIGNING_KEY"]) {
    assert.ok(!(n in prov.env_allowlisted), `${n} must be excluded`);
  }
});

check("a planted fake secret VALUE never appears in the output (redacted)", () => {
  // Innocuous NAME ("BUILD_META") but the VALUE looks like a credential.
  const env = { BUILD_META: PLANTED_SECRET };
  const prov = captureEnvironmentProvenance({ env, now: NOW_ISO, allowlist: ["BUILD_META"] });
  assert.equal(prov.env_allowlisted.BUILD_META, REDACTED);
  // Prove the raw secret is nowhere in the serialized output.
  const serialized = JSON.stringify(prov);
  assert.ok(!serialized.includes(PLANTED_SECRET), "raw secret must not appear anywhere");
});

check("assorted secret-shaped values are all redacted; benign values survive", () => {
  const env = {
    A_JWT: "eyJhbGciOiJIUzI1Ni19.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123",
    A_PEM: "-----BEGIN RSA PRIVATE KEY-----\nMIIE...",
    A_HEX: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    A_B64: "QUJDREVGabcdef0123456789ABCDEFGHIJ",
    BENIGN: "hello-world",
    NUMISH: "1234",
  };
  const allowlist = ["A_JWT", "A_PEM", "A_HEX", "A_B64", "BENIGN", "NUMISH"];
  const prov = captureEnvironmentProvenance({ env, now: NOW_ISO, allowlist });
  assert.equal(prov.env_allowlisted.A_JWT, REDACTED);
  assert.equal(prov.env_allowlisted.A_PEM, REDACTED);
  assert.equal(prov.env_allowlisted.A_HEX, REDACTED);
  assert.equal(prov.env_allowlisted.A_B64, REDACTED);
  assert.equal(prov.env_allowlisted.BENIGN, "hello-world");
  assert.equal(prov.env_allowlisted.NUMISH, "1234");
});

check("Law 54 honest UNKNOWN: absent fields and unset allowlisted names => UNKNOWN, never guessed", () => {
  const prov = captureEnvironmentProvenance({
    env: { PRESENT: "yes" },
    // platform/arch/cpuCount/totalMem/nodeVersion all omitted
    now: NOW_ISO,
    allowlist: ["PRESENT", "MISSING"],
  });
  assert.equal(prov.node_version, UNKNOWN);
  assert.equal(prov.platform, UNKNOWN);
  assert.equal(prov.arch, UNKNOWN);
  assert.equal(prov.cpu_count, UNKNOWN);
  assert.equal(prov.total_mem, UNKNOWN);
  assert.equal(prov.env_allowlisted.PRESENT, "yes");
  assert.equal(prov.env_allowlisted.MISSING, UNKNOWN); // allowlisted but unset => UNKNOWN
});

check("unparseable / absent `now` => captured_at is UNKNOWN (never a fabricated time)", () => {
  const bad = captureEnvironmentProvenance({ env: {}, now: "whenever", allowlist: [] });
  assert.equal(bad.captured_at, UNKNOWN);
  const none = captureEnvironmentProvenance({ env: {}, allowlist: [] });
  assert.equal(none.captured_at, UNKNOWN);
});

check("`now` accepts epoch-ms and Date DATA and is normalised deterministically", () => {
  const ms = Date.parse(NOW_ISO);
  const a = captureEnvironmentProvenance({ env: {}, now: ms, allowlist: [] });
  const b = captureEnvironmentProvenance({ env: {}, now: new Date(ms), allowlist: [] });
  assert.equal(a.captured_at, NOW_ISO);
  assert.equal(b.captured_at, NOW_ISO);
});

check("determinism: identical fixed DATA inputs => byte-identical output", () => {
  const args = {
    env: { CI: "true", TZ: "UTC", TOKEN_X: "leak-me" },
    platform: "darwin", arch: "arm64", cpuCount: 10, totalMem: 34359738368,
    nodeVersion: "v24.0.0", now: NOW_ISO, allowlist: ["CI", "TZ", "TOKEN_X"],
  };
  const one = JSON.stringify(captureEnvironmentProvenance(args));
  const two = JSON.stringify(captureEnvironmentProvenance(args));
  assert.equal(one, two);
});

check("captured output passes its own verifyNoSecrets self-check", () => {
  const env = {
    SECRET_TOKEN: "should-vanish", API_KEY: "gone", NODE_ENV: "production",
    BUILD_META: PLANTED_SECRET, LANG: "en_US.UTF-8",
  };
  const prov = captureEnvironmentProvenance({
    env, platform: "darwin", arch: "arm64", cpuCount: 8, totalMem: 17179869184,
    nodeVersion: "v24.0.0", now: NOW_ISO,
    allowlist: ["SECRET_TOKEN", "API_KEY", "NODE_ENV", "BUILD_META", "LANG"],
  });
  const res = verifyNoSecrets(prov);
  assert.equal(res.ok, true);
});

check("verifyNoSecrets BITES on a crafted leak — secret-shaped NAME", () => {
  const leak = {
    schema_version: SCHEMA_VERSION, node_version: "v24", platform: "linux",
    arch: "x64", cpu_count: 1, total_mem: 1, captured_at: NOW_ISO,
    env_allowlisted: { API_TOKEN: "hand-planted" }, // secret-shaped name smuggled in
  };
  assert.throws(() => verifyNoSecrets(leak), /LEAK — secret-shaped name/);
});

check("verifyNoSecrets BITES on a crafted leak — secret-shaped VALUE under a benign name", () => {
  const leak = {
    schema_version: SCHEMA_VERSION, node_version: "v24", platform: "linux",
    arch: "x64", cpu_count: 1, total_mem: 1, captured_at: NOW_ISO,
    env_allowlisted: { BUILD_META: PLANTED_SECRET }, // raw secret value smuggled in
  };
  assert.throws(() => verifyNoSecrets(leak), /LEAK — secret-shaped value/);
  // And the thrown error must NOT echo the secret value itself.
  try {
    verifyNoSecrets(leak);
  } catch (e) {
    assert.ok(!String(e.message).includes(PLANTED_SECRET), "error must not echo the secret");
  }
});

check("verifyNoSecrets bites on a secret-shaped value smuggled into a top-level field", () => {
  const leak = {
    schema_version: SCHEMA_VERSION, node_version: PLANTED_SECRET, platform: "linux",
    arch: "x64", cpu_count: 1, total_mem: 1, captured_at: NOW_ISO, env_allowlisted: {},
  };
  assert.throws(() => verifyNoSecrets(leak), /LEAK — secret-shaped value in field/);
});

check("verifyNoSecrets rejects non-object input honestly", () => {
  assert.throws(() => verifyNoSecrets(null), /not an object/);
  assert.throws(() => verifyNoSecrets("nope"), /not an object/);
});

check("predicate helpers behave: isSecretName / looksLikeSecretValue", () => {
  assert.equal(isSecretName("MY_SECRET"), true);
  assert.equal(isSecretName("ACCESS_TOKEN"), true);
  assert.equal(isSecretName("APIKEY"), true);
  assert.equal(isSecretName("API_KEY"), true);
  assert.equal(isSecretName("LANG"), false);
  assert.equal(looksLikeSecretValue(PLANTED_SECRET), true);
  assert.equal(looksLikeSecretValue("hello"), false);
  assert.equal(looksLikeSecretValue(REDACTED), false); // our own sentinel is safe
  assert.equal(looksLikeSecretValue(UNKNOWN), false);
});

check("the real process env is NEVER read into output (purity guard)", () => {
  // Plant a canary in the REAL process env, then prove the pure path ignores it entirely.
  process.env.__L3_CANARY__ = "canary-must-not-appear";
  const prov = captureEnvironmentProvenance({
    env: { SAFE: "ok" }, now: NOW_ISO, allowlist: ["SAFE", "__L3_CANARY__"],
  });
  const serialized = JSON.stringify(prov);
  assert.ok(!serialized.includes("canary-must-not-appear"), "must not read real process.env");
  // The canary name, if allowlisted, resolves against the passed env (absent) => UNKNOWN.
  assert.equal(prov.env_allowlisted.__L3_CANARY__, UNKNOWN);
  delete process.env.__L3_CANARY__;
});

// ---------------------------------------------------------------------------------------------

console.log(`L3-ENV-PROVENANCE-SELFTEST: PASS (${pass} checks)`);
process.exit(0);
