// FounderGate V8-A3 — File Cabinet classifier selftest (pass AND fail).

import assert from "node:assert/strict";
import { classifyFile, access, ACCESS } from "./cabinet.mjs";

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }

check("secret-shaped files classify SECRET (fail-safe)", () => {
  for (const p of [".env", ".env.local", ".env.production", "config/id_rsa", "secrets.json", "app/api-key.txt", "server.key", "cert.pem", ".npmrc"]) {
    assert.equal(classifyFile(p).data_class, "SECRET", `${p} should be SECRET`);
  }
});

check("FINDING 3: case/extension/whitespace secret variants → SECRET", () => {
  for (const p of [".ENV", ".Env.local", ".env ", "auth.p8", "server.ppk", "keystore.jks", "config/.pgpass", "deep/nested/.env", "API_KEY.txt", "creds.gpg"]) {
    assert.equal(classifyFile(p).data_class, "SECRET", `${p} should be SECRET`);
  }
  assert.equal(classifyFile("id_rsa.pub").data_class !== "SECRET", true, "public key is not secret");
  // checker round-2 note: label these secret-bearing files SECRET (not just UNKNOWN-blocked)
  for (const p of ["backup.env", "prod.env", ".envrc", "wp-config.php", "config/settings.env"]) {
    assert.equal(classifyFile(p).data_class, "SECRET", `${p} should be SECRET`);
  }
});

check("env templates are NOT secret (Integrations/PROJECT_INTERNAL)", () => {
  assert.equal(classifyFile(".env.example").data_class, "PROJECT_INTERNAL");
  assert.equal(classifyFile(".env.template").data_class, "PROJECT_INTERNAL");
});

check("founder documents → PUBLIC_SAFE", () => {
  assert.equal(classifyFile("docs/ROADMAP.md").data_class, "PUBLIC_SAFE");
  assert.equal(classifyFile("README.md").data_class, "PUBLIC_SAFE");
});

check("app source / config / screens / notes / evidence categories", () => {
  assert.equal(classifyFile("src/app.mjs").category, "App Source");
  assert.equal(classifyFile("package.json").category, "Configuration");
  assert.equal(classifyFile("shots/home.png").category, "Product Screens");
  assert.equal(classifyFile(".foundergate/notes/idea.md").data_class, "PRIVATE_FOUNDER_DATA");
  assert.equal(classifyFile(".foundergate/bugs/b.json").category, "Evidence");
});

check("production data → PRODUCTION_DATA (gated)", () => {
  assert.equal(classifyFile("production-data/customers.json").data_class, "PRODUCTION_DATA");
  assert.equal(classifyFile("dump.prod.sql").data_class, "PRODUCTION_DATA");
});

check("unrecognised files → UNKNOWN (blocked)", () => {
  assert.equal(classifyFile("weird.xyz").data_class, "UNKNOWN");
  assert.equal(classifyFile("noext").data_class, "UNKNOWN");
});

check("access policy: SECRET/UNKNOWN/PRODUCTION_DATA expose nothing", () => {
  for (const c of ["SECRET", "UNKNOWN", "PRODUCTION_DATA"]) {
    assert.deepEqual(access(c), { preview: false, copy: false, download: false }, `${c} must expose nothing`);
  }
});

check("access policy: safe classes allow preview; private/do-not-export restrict export", () => {
  assert.deepEqual(access("PUBLIC_SAFE"), { preview: true, copy: true, download: true });
  assert.equal(access("PRIVATE_FOUNDER_DATA").download, false);
  assert.equal(access("DO_NOT_EXPORT").copy, false);
  assert.equal(access("DO_NOT_EXPORT").download, false);
});

check("explicit project rule can only ESCALATE to SECRET (one-way safe)", () => {
  const rules = [{ match: "docs/**", class: "SECRET" }];
  assert.equal(classifyFile("docs/ROADMAP.md", rules).data_class, "SECRET");
  // a rule cannot make a secret LESS restrictive
  const loosen = [{ match: "**/.env", class: "PUBLIC_SAFE" }];
  assert.equal(classifyFile(".env", loosen).data_class, "SECRET");
});

check("every class has an access entry", () => {
  for (const c of Object.keys(ACCESS)) assert.ok(access(c));
});

console.log(`\nV8A3-CLASSIFY-SELFTEST: PASS (${passed} checks)`);
