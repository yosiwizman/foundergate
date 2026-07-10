// V8-A4 PG-CORE — NO-BLOCKED-CONTENT-LEAK proof (committed CI proof, SENSITIVE).
//
// Proves the Guide can NEVER read into its context, quote, or summarize the content
// of any file the File Cabinet hides — SECRET, UNKNOWN, or PRODUCTION_DATA — through
// ANY intent (direct file request, "summarize", or a files overview). Each blocked
// file carries a unique sentinel; the sentinel must appear in NO Guide output.

import assert from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, linkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { answer } from "./guide.mjs";

const root = mkdtempSync(join(tmpdir(), "v8a4-leak-"));
function write(rel, content) {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content);
}

// unique sentinels — one per blocked file. None may ever surface.
const S = {
  secret: "LEAK_SENTINEL_SECRET_a1",
  env: "LEAK_SENTINEL_ENV_b2",
  key: "LEAK_SENTINEL_KEY_c3",
  prod: "LEAK_SENTINEL_PROD_d4",
  unknown: "LEAK_SENTINEL_UNKNOWN_e5",
  symlink: "LEAK_SENTINEL_SYMLINK_f6",
  hardlink: "LEAK_SENTINEL_HARDLINK_g7",
};

mkdirSync(join(root, ".foundergate"), { recursive: true });
write(".foundergate/status.json", JSON.stringify({ state: "ok", headline: "All good (mock)." }));
write(".foundergate/data_classification.json", JSON.stringify({ default_class: "PROJECT_INTERNAL", block_unknown_files: true, rules: [] }));

write("config.secret.json", `{"token":"${S.secret}"}`);          // SECRET by name
write(".env", `PASSWORD=${S.env}`);                               // SECRET by name
write("deploy/private.key", `-----BEGIN KEY----- ${S.key}`);      // SECRET (key ext)
write("production-data/customers.prod.json", `[{"x":"${S.prod}"}]`); // PRODUCTION_DATA
write("weird.bin", S.unknown);                                    // UNKNOWN (fail-safe)
write("hidden-secret.txt", S.symlink);                            // real secret target
// symlink injection: a PUBLIC-named alias (README.md is PUBLIC_SAFE) → secret target.
try { symlinkSync(join(root, "hidden-secret.txt"), join(root, "README.md")); } catch { /* ok */ }
// hard-link injection: a PUBLIC-named alias (docs/CURRENT_STATUS.md is PUBLIC_SAFE)
// hard-linked to a secret (no distinct realpath; classifiable only by the safe name).
write("real-secret.env", S.hardlink);
mkdirSync(join(root, "docs"), { recursive: true });
try { linkSync(join(root, "real-secret.env"), join(root, "docs/CURRENT_STATUS.md")); } catch { /* ok on FS without hard links */ }

const blockedFiles = [
  "config.secret.json", ".env", "deploy/private.key",
  "production-data/customers.prod.json", "weird.bin",
  "README.md", "docs/CURRENT_STATUS.md", // safe-NAMED aliases that must still block
];
const allSentinels = Object.values(S);

let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };
const containsAnySentinel = (r) => allSentinels.find((s) => JSON.stringify(r).includes(s));

console.log("== V8-A4 no-blocked-content-leak proof ==");
try {
  check("every blocked file is reported protected/blocked with NO content", () => {
    for (const f of blockedFiles) {
      const r = answer(root, `show me ${f}`);
      assert.ok(r.blocked === true || r.unknown === true, `${f} must be blocked/unknown`);
      assert.ok(!("content" in r), `${f} must not carry content`);
      assert.ok(!r.quoted, `${f} must not be quoted`);
      const leak = containsAnySentinel(r);
      assert.ok(!leak, `sentinel ${leak} leaked for ${f}`);
    }
  });

  check("asking to SUMMARIZE a blocked file leaks nothing", () => {
    for (const f of blockedFiles) {
      const r = answer(root, `summarize ${f} for me`);
      const leak = containsAnySentinel(r);
      assert.ok(!leak, `summarize leaked ${leak} for ${f}`);
    }
  });

  check("the files overview never inlines blocked content", () => {
    const r = answer(root, "what files do I have?");
    const leak = containsAnySentinel(r);
    assert.ok(!leak, `files overview leaked ${leak}`);
  });

  check("a status question never inlines blocked content", () => {
    const r = answer(root, "what is happening?");
    assert.ok(!containsAnySentinel(r));
  });

  console.log(`\nV8A4-NO-BLOCKED-LEAK-SELFTEST: PASS ${pass}`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
