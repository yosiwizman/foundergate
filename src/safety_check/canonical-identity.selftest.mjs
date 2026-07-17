// Selftest: the Safety Check server exposes a canonical identity so a launcher can verify it is the
// expected service (not merely a :4700 that returns 200), and it leaks no private path in the founder
// surface. Auto-discovered by scripts/run-selftests.mjs.
import { createSafetyServer } from "./service.mjs";
import assert from "node:assert";

const server = createSafetyServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const id = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json();

assert.equal(id.service, "foundergate-safety-check", "canonical service name");
assert.equal(id.ui_contract, "phase7.1-neutral-first-v1", "UI contract version present");
assert.equal(id.server_entry, "src/safety_check/service.mjs", "server entry identity");
assert.ok(/^[0-9a-f]{16}$/.test(id.repo_id), "repo_id is a 16-hex hash, not a path");
assert.ok(!JSON.stringify(id).includes("/Users/"), "identity leaks no absolute home path");
assert.equal(id.active_run, null, "no active run at rest");
assert.equal(typeof id.pid, "number", "pid present");
// /api/identity alias returns the same identity
const id2 = await (await fetch(`http://127.0.0.1:${port}/api/identity`)).json();
assert.equal(id2.service, id.service, "/api/identity aliases /api/health identity");

server.close();
console.log("canonical-identity.selftest: OK (canonical service identity; no private path; run-state bound)");
