// FounderGate Phase 7.1 — Evidence Pack generator selftest (deterministic; no VM).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "ep-self-"));
writeFileSync(join(dir, "RUN_REQUEST.json"), JSON.stringify({ run_id: "sc-test", repository_url: "https://github.com/pypa/sampleproject", requested_at: "2026-01-01T00:00:00Z" }));
writeFileSync(join(dir, "RUN_RESULT.json"), JSON.stringify({ run_id: "sc-test", fixture_url: "https://github.com/pypa/sampleproject", exact_commit: "621e4974ca25ce531773def586ba3ed8e736b3fc", archive_sha256: "fd8597e4", canonical_manifest_sha256: "649ecb02", classification: "COMPILEABILITY_OBSERVED", compileall_exit: 0, egress_example_com: "DENIED", docker_socket: "ABSENT", port_binding_guard: "GUARD_PASS", vm_destroyed: true, teardown_get_status: "404" }));
writeFileSync(join(dir, "RUN_LIMITATIONS.json"), JSON.stringify({ build_proven: false }));
execFileSync("node", [join(HERE, "evidence-pack.mjs"), dir, "sc-test"], { stdio: "ignore" });
const pack = JSON.parse(readFileSync(join(dir, "EVIDENCE_PACK", "evidence-pack.json"), "utf8"));
assert.equal(pack.run_id, "sc-test");                                  // run-id bound
assert.equal(pack.exact_commit, "621e4974ca25ce531773def586ba3ed8e736b3fc"); // commit bound
assert.equal(pack.claims.build, "NOT_PROVEN");
assert.equal(pack.claims.tests, "NOT_PROVEN");
assert.equal(pack.claims.compileability, "OBSERVED");
assert.ok(/not a security, compliance, production-readiness, or bug-free certification/.test(pack.footer));
assert.ok(existsSync(join(dir, "EVIDENCE_PACK", "evidence-pack.md")));
assert.ok(existsSync(join(dir, "EVIDENCE_PACK", "evidence-pack.html")));
assert.ok(existsSync(join(dir, "EVIDENCE_PACK", "evidence-pack.sha256")));
// reproducibility: regenerate -> identical canonical JSON
const first = readFileSync(join(dir, "EVIDENCE_PACK", "evidence-pack.json"), "utf8");
execFileSync("node", [join(HERE, "evidence-pack.mjs"), dir, "sc-test"], { stdio: "ignore" });
assert.equal(readFileSync(join(dir, "EVIDENCE_PACK", "evidence-pack.json"), "utf8"), first); // deterministic
console.log("evidence-pack.selftest: OK (run-id + commit bound; not-proven labels; deterministic; no cert)");
