// STACK-1E: 18 mutation proofs — empty evidence is INVALID BY DEFAULT; only an exact manifest-declared
// artifact with verified companions + bindings is accepted; the historical no-output artifact is
// representable honestly; every other empty artifact stays fail-closed. Auto-discovered under src/.
import assert from "node:assert";
import { validateEmptyArtifact, manifestIsWellFormed, sha256 } from "./empty-artifact-policy.mjs";

const SHA = "b9af1def60009ac9dae69bf519b5e0a2680d4600";
const RUNID = "integrated-8h-rerun-20260717T173028Z";
const C1 = "d/freeze.json", C2 = "d/result.md";
const c1buf = Buffer.from(`{"head":"${SHA}","x":1}`);       // binds evaluated_sha
const c2buf = Buffer.from(`# run ${RUNID}\nPASS`);            // binds run id
const files = { [C1]: c1buf, [C2]: c2buf };
const ctx = { readFile: (p) => (p in files ? files[p] : null) };
const validEntry = () => ({
  artifact_path: "d/sentinel-watch.log", allow_empty: true, empty_reason: "no output",
  producer: "sentinel-watch.mjs", producer_exit_status: 0, qualification_run_id: RUNID,
  evaluated_sha: SHA, companion_artifacts: [C1, C2],
  companion_hashes: { [C1]: sha256(c1buf), [C2]: sha256(c2buf) }, reviewer: "t0",
});
let n = 0;
const rej = (path, entry, msg) => { const v = validateEmptyArtifact(path, entry, ctx); assert.equal(v.allowed, false, msg + " should be REJECTED (" + JSON.stringify(v) + ")"); n++; };
const acc = (path, entry, msg) => { const v = validateEmptyArtifact(path, entry, ctx); assert.ok(v.allowed, msg + " should be ACCEPTED (" + v.reason + ")"); n++; };

// 1-9: undeclared empties of every kind are rejected (entry undefined)
for (const p of ["x/arbitrary.log", "x/driver.log", "x/command.log", "x/attestation.log",
                 "x/teardown.log", "x/security.log", "x/data.json", "x/notes.md", "x/hashes.sha256"]) {
  rej(p, undefined, `undeclared empty ${p}`);
}
// 10: declared with valid companions -> accepted
acc("d/sentinel-watch.log", validEntry(), "declared sentinel-watch.log with valid companions");
// 11: without companions
rej("d/sentinel-watch.log", { ...validEntry(), companion_artifacts: [], companion_hashes: {} }, "no companions");
// 12: with an empty companion
{ const e = validEntry(); files["d/empty.json"] = Buffer.alloc(0); e.companion_artifacts = [C1, "d/empty.json"]; e.companion_hashes = { [C1]: sha256(c1buf), "d/empty.json": sha256(Buffer.alloc(0)) };
  rej("d/sentinel-watch.log", e, "empty companion"); delete files["d/empty.json"]; }
// 13: wrong companion hash
{ const e = validEntry(); e.companion_hashes = { [C1]: "0".repeat(64), [C2]: sha256(c2buf) }; rej("d/sentinel-watch.log", e, "wrong companion hash"); }
// 14: wrong run id (not bound in any companion)
rej("d/sentinel-watch.log", { ...validEntry(), qualification_run_id: "some-other-run-20260101T000000Z" }, "wrong run id");
// 15: wrong evaluated sha (not bound in any companion)
rej("d/sentinel-watch.log", { ...validEntry(), evaluated_sha: "0".repeat(40) }, "wrong evaluated sha");
// extra structural rejects (allow_empty false / missing reason / bad exit status)
rej("d/sentinel-watch.log", { ...validEntry(), allow_empty: false }, "allow_empty false");
rej("d/sentinel-watch.log", { ...validEntry(), empty_reason: "" }, "missing reason");
rej("d/sentinel-watch.log", { ...validEntry(), producer_exit_status: "0" }, "non-numeric exit status");
// 16: manifest tampering / 17: wildcard / 18: extension-only -> manifestIsWellFormed rejects
assert.ok(manifestIsWellFormed({ entries: [{ artifact_path: "a/*.log", allow_empty: true }] }).length > 0, "wildcard rejected"); n++;
assert.ok(manifestIsWellFormed({ entries: [{ artifact_path: ".log", allow_empty: true }] }).length > 0, "extension-only rejected"); n++;
assert.ok(manifestIsWellFormed({ entries: [{ artifact_path: "docs/x/", allow_empty: true }] }).length > 0, "directory rejected"); n++;
assert.ok(manifestIsWellFormed({ entries: [{ allow_empty: true }] }).length > 0, "no artifact_path rejected"); n++;
assert.equal(manifestIsWellFormed({ entries: [{ artifact_path: "d/sentinel-watch.log", allow_empty: true }] }).length, 0, "exact path well-formed"); n++;

console.log(`empty-artifact-policy.selftest: OK (${n} checks — default-reject; manifest-declared + companion-verified accepted; no wildcard/extension exemption)`);
