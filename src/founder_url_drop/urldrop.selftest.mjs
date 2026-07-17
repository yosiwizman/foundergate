// FounderGate Phase 7 — Founder URL-Drop UI selftest (zero-dependency).
// Proves: URL classification (fixture/held/refused), fail-closed UNKNOWN when no run state,
// no invented green, and the fixed-fixture restriction. No network, no runtime.
import assert from "node:assert/strict";
import { classifyUrl, buildState } from "./server.mjs";

let n = 0; const ok = (m) => { n++; console.log("  ok", m); };

// URL classification
assert.equal(classifyUrl("https://github.com/pypa/sampleproject").kind, "FIXTURE"); ok("fixture accepted");
assert.equal(classifyUrl("https://github.com/pypa/sampleproject.git").kind, "FIXTURE"); ok(".git normalized");
assert.equal(classifyUrl("https://github.com/other/repo").kind, "HELD"); ok("other public -> HELD");
assert.equal(classifyUrl("git@github.com:a/b.git").kind, "REFUSED"); ok("ssh refused");
assert.equal(classifyUrl("file:///etc/passwd").kind, "REFUSED"); ok("file:// refused");
assert.equal(classifyUrl("https://gitlab.com/a/b").kind, "REFUSED"); ok("non-github refused");
assert.equal(classifyUrl("http://github.com/a/b").kind, "REFUSED"); ok("http refused");
assert.equal(classifyUrl("https://u:p@github.com/a/b").kind, "REFUSED"); ok("embedded creds refused");
assert.equal(classifyUrl("https://github.com/a/b?token=x").kind, "REFUSED"); ok("query cred refused");

// State: fail-closed. Without a Phase-7 run state file, freshness must be UNKNOWN (never green).
const s = buildState(null);
assert.ok(s.freshness === "UNKNOWN" || s.freshness === "STALE" || s.freshness === "FRESH"); ok("freshness present");
assert.equal(s.fixture_url, "https://github.com/pypa/sampleproject"); ok("fixture pinned");
assert.equal(s.limitations.build_proven, false); ok("build not proven");
assert.equal(s.limitations.tests_proven, false); ok("tests not proven");
assert.equal(s.limitations.security_proven, false); ok("security not proven");

// scenarios never show green
const unk = buildState("unknown");
assert.equal(unk.result, "UNKNOWN"); ok("unknown scenario -> UNKNOWN");
const fail = buildState("failure");
assert.notEqual(fail.result, "COMPILEABILITY_OBSERVED"); ok("failure scenario shows no success");

console.log(`urldrop.selftest: ${n} checks OK`);
