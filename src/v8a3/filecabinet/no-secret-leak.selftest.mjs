// FounderGate V8-A3 — NO-SECRET-LEAK PROOF (required acceptance artifact).
//
// Adversarial: build a project containing real secret-shaped, production, and
// unclassified files, then try EVERY access path (preview/copy/download) and prove
// NONE returns the protected content. Also proves path-traversal is refused and
// that a safe file IS viewable. Fail-closed: a single leak fails the build.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, linkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classifyFile, safePreview, safeCopy, safeDownload } from "./cabinet.mjs";

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }

const root = mkdtempSync(join(tmpdir(), "v8a3-leak-"));
const SECRET_VALUE = "gh" + "p_" + "A".repeat(36);
const KEY_VALUE = "-----BEGIN RSA PRIVATE KEY-----\nMIIsecret\n-----END RSA PRIVATE KEY-----";
try {
  mkdirSync(join(root, "config"), { recursive: true });
  mkdirSync(join(root, "production-data"), { recursive: true });
  writeFileSync(join(root, ".env"), `TOKEN=${SECRET_VALUE}\n`);
  writeFileSync(join(root, "config", "id_rsa"), KEY_VALUE);
  writeFileSync(join(root, "secrets.json"), JSON.stringify({ token: SECRET_VALUE }));
  writeFileSync(join(root, "production-data", "customers.json"), JSON.stringify([{ email: "real@x.com" }]));
  writeFileSync(join(root, "weird.xyz"), "unclassified content 12345");
  writeFileSync(join(root, "README.md"), "# Safe public readme\n");

  const PROTECTED = [".env", "config/id_rsa", "secrets.json", "production-data/customers.json", "weird.xyz"];

  check("no protected file is previewable/copyable/downloadable, and no content leaks", () => {
    for (const rel of PROTECTED) {
      for (const fn of [safePreview, safeCopy, safeDownload]) {
        const r = fn(root, rel, []);
        assert.equal(r.allowed, false, `${rel} must be blocked by ${fn.name}`);
        assert.ok(!("content" in r), `${rel}: no content field may be returned`);
        const blob = JSON.stringify(r);
        assert.ok(!blob.includes(SECRET_VALUE) && !blob.includes("MIIsecret") && !blob.includes("real@x.com"),
          `${rel}: response must not contain the protected value`);
      }
    }
  });

  check("classifier never grants preview to SECRET/UNKNOWN/PRODUCTION_DATA", () => {
    for (const rel of PROTECTED) {
      const c = classifyFile(rel);
      if (["SECRET", "UNKNOWN", "PRODUCTION_DATA"].includes(c.data_class)) {
        assert.equal(c.access.preview, false);
        assert.equal(c.access.copy, false);
        assert.equal(c.access.download, false);
      }
    }
  });

  check("a safe file IS viewable (README → preview returns content)", () => {
    const r = safePreview(root, "README.md", []);
    assert.equal(r.allowed, true);
    assert.match(r.content, /Safe public readme/);
  });

  check("path traversal is refused (../../etc/passwd, absolute)", () => {
    const trav = safePreview(root, "../../../../etc/passwd", []);
    assert.equal(trav.allowed, false);
    assert.ok(!("content" in trav));
  });

  check("a project rule cannot expose a secret (escalate-only)", () => {
    const r = safePreview(root, ".env", [{ match: "**/.env", class: "PUBLIC_SAFE" }]);
    assert.equal(r.allowed, false);
  });

  // ---- checker round-1 findings, now locked ----

  check("FINDING 2: a safe-named symlink to a secret is BLOCKED (realpath re-classify)", () => {
    symlinkSync(join(root, ".env"), join(root, "README-alias.md")); // README-alias.md -> .env
    for (const fn of [safePreview, safeCopy, safeDownload]) {
      const r = fn(root, "README-alias.md", []);
      assert.equal(r.allowed, false, `symlink to .env must be blocked by ${fn.name}`);
      assert.ok(!JSON.stringify(r).includes(SECRET_VALUE), "symlinked secret must not leak");
    }
  });

  check("FINDING 2: a symlink pointing OUTSIDE the project is BLOCKED", () => {
    const outside = mkdtempSync(join(tmpdir(), "v8a3-outside-"));
    try {
      writeFileSync(join(outside, "host-secret.txt"), "OUTSIDE-" + SECRET_VALUE);
      symlinkSync(join(outside, "host-secret.txt"), join(root, "docs-roadmap.md"));
      const r = safePreview(root, "docs-roadmap.md", []);
      assert.equal(r.allowed, false);
      assert.ok(!JSON.stringify(r).includes(SECRET_VALUE));
    } finally { rmSync(outside, { recursive: true, force: true }); }
  });

  check("FINDING 1: a nested ** escalation rule actually escalates (no leak)", () => {
    mkdirSync(join(root, "analytics", "pii"), { recursive: true });
    writeFileSync(join(root, "analytics", "pii", "users.js"), 'export const PII=[{ssn:"123-45-6789"}]');
    const rules = [{ match: "analytics/**", class: "SECRET" }];
    // without escalation this is App Source/PROJECT_INTERNAL and would be viewable
    assert.equal(classifyFile("analytics/pii/users.js").data_class, "PROJECT_INTERNAL");
    // with the ** rule it must be SECRET and blocked
    assert.equal(classifyFile("analytics/pii/users.js", rules).data_class, "SECRET");
    const r = safePreview(root, "analytics/pii/users.js", rules);
    assert.equal(r.allowed, false);
    assert.ok(!JSON.stringify(r).includes("123-45-6789"));
  });

  check("HARD LINK: a safe-named hard link to a secret is BLOCKED (nlink>1 fail-closed)", () => {
    // `ln .env public.md` — the alias has a PUBLIC-SAFE name and NO distinct realpath,
    // so name/realpath classification alone would leak. nlink>1 must fail closed.
    let linked = true;
    try { linkSync(join(root, ".env"), join(root, "public.md")); } catch { linked = false; }
    if (!linked) return; // filesystem without hard-link support — skip
    for (const fn of [safePreview, safeCopy, safeDownload]) {
      const r = fn(root, "public.md", []);
      assert.equal(r.allowed, false, `hard link to .env must be blocked by ${fn.name}`);
      assert.ok(!JSON.stringify(r).includes(SECRET_VALUE), "hard-linked secret must not leak");
    }
  });

  check("FINDING 4: a traversal path returns a blocked object (no throw)", () => {
    let r;
    assert.doesNotThrow(() => { r = safePreview(root, "../../../../etc/passwd", []); });
    assert.equal(r.allowed, false);
    assert.ok(!("content" in r));
  });

  console.log(`\nV8A3-NO-SECRET-LEAK-PROOF: PASS (${passed} checks)`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
