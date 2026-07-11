// FounderGate — DESIGN-CONSISTENCY guard (VA-REPAIR-4 / J0).
//
// Run 4: "doesn't match the other style" (Files), "a little bit off" (Preview),
// "very dull" (Guide) — four apps, four divergent stylesheets. This guard locks the
// fix: all four founder-facing apps load the SHARED design-token stylesheet
// (src/ui/tokens.css), their servers serve it, and their CSS uses the shared palette
// (visual kinship markers) — never a divergent light palette of their own.

import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const R = (p) => readFileSync(join(REPO, p), "utf8");

const APPS = [
  { name: "Dashboard", html: "src/v8a1/dashboard/index.html", css: "src/v8a1/dashboard/styles.css", server: "src/v8a1/dashboard/server.mjs" },
  { name: "Preview Bay", html: "src/v8a2/preview/ui/preview-bay.html", css: "src/v8a2/preview/ui/preview-bay.css", server: "src/v8a2/server.mjs" },
  { name: "File Cabinet", html: "src/v8a3/filecabinet/ui/filecabinet.html", css: "src/v8a3/filecabinet/ui/filecabinet.css", server: "src/v8a3/filecabinet/server.mjs" },
  { name: "Project Guide", html: "src/v8a4/guide/ui/guide.html", css: "src/v8a4/guide/ui/guide.css", server: "src/v8a4/guide/server.mjs" },
];

let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };

console.log("== design-consistency guard (J0) ==");

check("the shared design-token stylesheet exists with the palette + components", () => {
  assert.ok(existsSync(join(REPO, "src", "ui", "tokens.css")), "missing src/ui/tokens.css");
  const t = R("src/ui/tokens.css");
  assert.match(t, /--bg:\s*#0f1216/, "tokens must define the shared dark --bg");
  for (const comp of [".fg-card", ".fg-badge", ".fg-chip", ".fg-btn"]) assert.ok(t.includes(comp), `tokens must define ${comp}`);
});

check("every app HTML loads the shared tokens.css", () => {
  for (const a of APPS) assert.match(R(a.html), /<link[^>]+href="tokens\.css"/, `${a.name} must <link> tokens.css`);
});

check("every app server serves tokens.css (allowlisted + shared path)", () => {
  for (const a of APPS) {
    const s = R(a.server);
    assert.match(s, /SAFE_FILES[\s\S]*?"tokens\.css"/, `${a.name} server must allowlist tokens.css`);
    assert.match(s, /TOKENS\s*=\s*resolve\([^)]*"ui",\s*"tokens\.css"\)/, `${a.name} server must resolve the shared tokens path`);
    assert.match(s, /name === "tokens\.css" \? TOKENS/, `${a.name} server must serve tokens.css from the shared path`);
  }
});

check("every app CSS uses the shared palette (visual kinship) — no divergent light theme", () => {
  for (const a of APPS) {
    const c = R(a.css);
    for (const v of ["var(--bg)", "var(--panel)", "var(--accent)"]) assert.ok(c.includes(v), `${a.name} CSS must use ${v} (kinship)`);
    // no app may re-declare a divergent LIGHT background in its DEFAULT :root (that
    // caused the divergence). A theme-aware :root[data-theme="light"] variant is fine.
    assert.doesNotMatch(c, /:root\s*\{[^}]*--bg:\s*#(?:f5f6f8|fff\b)/i, `${a.name} must not set a light --bg in the default :root (inherit the shared dark tokens)`);
  }
});

console.log(`\nV8-DESIGN-CONSISTENCY-GUARD: PASS ${pass}`);
