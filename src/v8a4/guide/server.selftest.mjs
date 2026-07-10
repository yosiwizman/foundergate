// V8-A4 PG-UI — Project Guide server self-test (loopback only).
// Boots the real server on an ephemeral 127.0.0.1 port and drives the ask API:
// grounded status, a SECRET file blocked with no content, an action refused, and
// the capabilities endpoint. No fixture is mutated; no network beyond loopback.

import assert from "node:assert";
import { createGuideServer } from "./server.mjs";

const server = createGuideServer();
let pass = 0;
const check = async (name, fn) => { await fn(); console.log(`  PASS: ${name}`); pass++; };

function req(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = {
      hostname: "127.0.0.1", port, path, method,
      headers: body ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {},
    };
    import("node:http").then(({ request }) => {
      const cr = request(r, (res) => {
        let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(b || "{}") }));
      });
      cr.on("error", reject);
      if (data) cr.write(data);
      cr.end();
    });
  });
}

console.log("== V8-A4 Project Guide server selftest ==");

await new Promise((res) => server.listen(0, "127.0.0.1", res));
const port = server.address().port;
try {
  assert.equal(server.address().address, "127.0.0.1"); // loopback only

  await check("POST /api/guide/ask 'what is happening?' is grounded + cited", async () => {
    const { status, json } = await req(port, "POST", "/api/guide/ask", { question: "what is happening?" });
    assert.equal(status, 200);
    assert.equal(json.kind, "explain");
    assert.ok(json.citations.some((c) => c.includes("status.json")));
  });

  await check("a SECRET file is blocked through the API with NO content", async () => {
    const { json } = await req(port, "POST", "/api/guide/ask", { question: "show me mock-config.txt" });
    assert.equal(json.blocked, true);
    assert.ok(!("content" in json) && !json.quoted);
  });

  await check("an action request is refused through the API", async () => {
    const { json } = await req(port, "POST", "/api/guide/ask", { question: "delete the mock-config.txt file" });
    assert.equal(json.kind, "refusal");
    assert.equal(json.actionRefused, true);
  });

  await check("GET /api/guide/capabilities lists prompt chips", async () => {
    const { json } = await req(port, "GET", "/api/guide/capabilities");
    assert.ok(Array.isArray(json.capabilities) && json.capabilities.length > 0);
  });

  await check("GET / serves the chat panel html", async () => {
    const { status } = await new Promise((resolve, reject) => {
      import("node:http").then(({ get }) => {
        get({ hostname: "127.0.0.1", port, path: "/" }, (res) => { res.resume(); resolve({ status: res.statusCode }); }).on("error", reject);
      });
    });
    assert.equal(status, 200);
  });

  console.log(`\nV8A4-GUIDE-SERVER-SELFTEST: PASS ${pass}`);
} finally {
  server.close();
}
