// FounderGate V8-A2 — Cannot-Invent-State proof for the new V8-A2 surfaces (AC1).
//
// Law 54 carried into V8-A2: the Preview Bay and Bug Collector must never invent
// state. Missing preview config → honest stopped/UNKNOWN (never a fake "running"
// or "live"); missing data-classification → class UNKNOWN (never assumed safe).

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PreviewController, PreviewError } from "./preview/preview-controller.mjs";
import { captureBug } from "./bugs/bug-collector.mjs";

let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`  PASS: ${name}`); }

const cleanups = [];
function proj(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "v8a2-cis-"));
  mkdirSync(join(root, ".foundergate"), { recursive: true });
  for (const [n, o] of Object.entries(files)) writeFileSync(join(root, ".foundergate", n), JSON.stringify(o));
  cleanups.push(root);
  return root;
}

try {
  await check("no preview.json → status stopped, labels null; start refuses (no fake running)", () => {
    const pc = new PreviewController(proj());
    const s = pc.status();
    assert.equal(s.status, "stopped");
    assert.equal(s.labels, null); // never invents labels
  });

  await check("start() with no preview.json rejects with a plain-English error", async () => {
    const pc = new PreviewController(proj());
    await assert.rejects(() => pc.start(), (e) => e instanceof PreviewError && /preview\.json/.test(e.message));
  });

  await check("preview labels never claim 'live' for the safe fixture config", () => {
    const root = proj({ "preview.json": { schema_version: "1.0.0", target: "static-preview", app_dir: "app", environment: "preview", sends: "off", payments: "mock" } });
    const pc = new PreviewController(root);
    const s = pc.status();
    assert.notEqual(s.labels && s.labels.environment, "live");
    assert.equal(s.labels.sends, "off");
  });

  await check("bug capture with NO data_classification → class UNKNOWN (never assumed safe)", () => {
    const root = proj(); // no data_classification.json
    const pkt = captureBug(root, { view: "v", note: "hi" });
    assert.equal(pkt.data_classification, "UNKNOWN");
  });

  await check("bug environment_label is UNKNOWN when no preview.json", () => {
    const pkt = captureBug(proj(), { view: "v", note: "hi" });
    assert.equal(pkt.environment_label, "unknown");
  });

  console.log(`\nV8A2-CANNOT-INVENT-STATE-SELFTEST: PASS (${passed} checks)`);
} finally {
  for (const r of cleanups) { try { rmSync(r, { recursive: true, force: true }); } catch {} }
}
