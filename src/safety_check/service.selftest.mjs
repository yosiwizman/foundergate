// FounderGate Phase 7.1 — Safety Check service selftest (no VM, no network).
import assert from "node:assert/strict";
import { classifyUrl } from "./service.mjs";
let n = 0; const ok = (m) => { n++; };
assert.equal(classifyUrl("https://github.com/pypa/sampleproject").kind, "FIXTURE"); ok();
assert.equal(classifyUrl("https://github.com/pypa/sampleproject.git").kind, "FIXTURE"); ok();
assert.equal(classifyUrl("https://github.com/x/y").kind, "HELD"); ok();
assert.equal(classifyUrl("git@github.com:a/b.git").kind, "REFUSED"); ok();
assert.equal(classifyUrl("file:///etc/passwd").kind, "REFUSED"); ok();
assert.equal(classifyUrl("https://gitlab.com/a/b").kind, "REFUSED"); ok();
assert.equal(classifyUrl("http://github.com/a/b").kind, "REFUSED"); ok();
assert.equal(classifyUrl("https://u:p@github.com/a/b").kind, "REFUSED"); ok();
assert.equal(classifyUrl("https://github.com/a/b?token=x").kind, "REFUSED"); ok();
console.log(`service.selftest: ${n} checks OK`);
