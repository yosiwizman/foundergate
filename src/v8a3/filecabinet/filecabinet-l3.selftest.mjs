// FounderGate V8-A3 — File Cabinet READABILITY guard (L3, Run-5).
//
// A real non-developer (macOS Finder as her reference) said the preview window was
// "very small… if I need to read, I can see it better". L3 rebuilt the browsing
// surface: a LIST/READING view toggle (Reading = a dominant preview pane), sort
// controls, a filename search, and a dimmed shared path-prefix. This static guard
// locks those in AND proves they are PURE PRESENTATION — sort/search/view never
// fetch content; the ONLY content request is in openFile(), where the server
// (cabinet.mjs) decides access. Blocked files keep the calm-lock treatment.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = join(HERE, "ui");
const html = readFileSync(join(UI, "filecabinet.html"), "utf8");
const css = readFileSync(join(UI, "filecabinet.css"), "utf8");
const js = readFileSync(join(UI, "filecabinet.js"), "utf8");

let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`  PASS: ${name}`); };

check("LIST / READING view toggle exists and is wired", () => {
  assert.match(html, /id="view-list-btn"/, "list-view button missing");
  assert.match(html, /id="view-gallery-btn"/, "reading/gallery-view button missing");
  assert.match(js, /setView\(["']gallery["']\)/, "the reading view must be selectable");
  assert.match(js, /setView\(["']list["']\)/, "the list view must be selectable");
  // the reading (gallery) view must give the preview pane a DOMINANT, readable size.
  assert.match(css, /\.cabinet\.view-gallery\s*\{[^}]*grid-template-columns/, "gallery layout must exist");
  const gv = css.match(/\.cabinet\.view-gallery \.viewer-body\s*\{([^}]*)\}/);
  assert.ok(gv, "gallery viewer-body must have its own (larger) treatment");
  assert.match(gv[1], /min-height:\s*(\d{3,})px/, "gallery preview must have a large min-height");
  assert.ok(parseInt(gv[1].match(/min-height:\s*(\d+)px/)[1], 10) >= 400, "gallery preview min-height must be >= 400px");
});

check("sort controls (name / category / protection / recently-changed) exist and are wired", () => {
  assert.match(html, /id="sort-select"/, "sort control missing");
  for (const v of ["category", "name", "class", "changed"]) assert.match(html, new RegExp(`value="${v}"`), `sort option ${v} missing`);
  assert.match(js, /sort-select["']\)\.addEventListener/, "sort control must be wired");
  assert.match(js, /state\.sort\s*===\s*["']changed["']/, "recently-changed sort must be handled");
  assert.match(js, /\bmtime\b/, "recently-changed must sort on mtime");
});

check("filename search exists, is wired, and matches the distinctive tail", () => {
  assert.match(html, /id="search-box"/, "search box missing");
  assert.match(js, /search-box["']\)\.addEventListener/, "search must be wired");
  assert.match(js, /function matches\s*\(/, "a matches() search predicate must exist");
  assert.match(js, /const \[, tail\] = splitPath\(f\.path\)/, "search must derive the filename tail via splitPath");
  assert.match(js, /tail\.toLowerCase\(\)\.includes/, "search must match on the filename tail");
});

check("(d) shared path-prefix is de-emphasised (dim prefix, bright tail)", () => {
  assert.match(css, /\.path-prefix\s*\{[^}]*color:\s*var\(--muted\)/, ".path-prefix must be dimmed");
  assert.match(css, /\.path-tail\s*\{/, ".path-tail must be styled (bright)");
  assert.match(js, /className = "path-prefix"/, "the render must split the prefix into a .path-prefix span");
});

check("READ-ONLY & PURE PRESENTATION: sort/search/view never fetch content", () => {
  // the ONLY content request is action=preview/copy/download, all inside openFile().
  const openFile = js.match(/async function openFile\([\s\S]*?\n\}/);
  assert.ok(openFile, "openFile must exist");
  for (const act of ["action=preview", "action=copy", "action=download"]) {
    // every content request lives inside openFile — count global vs in-openFile occurrences.
    const global = (js.match(new RegExp(act, "g")) || []).length;
    const inOpen = (openFile[0].match(new RegExp(act, "g")) || []).length;
    assert.equal(global, inOpen, `content request "${act}" must occur ONLY inside openFile (found ${global - inOpen} elsewhere)`);
  }
  // no write/upload affordance (read-only).
  assert.doesNotMatch(html, /type="file"|multipart\/form-data|<input[^>]*upload/i, "no upload control in a read-only viewer");
  assert.doesNotMatch(js, /method:\s*["']POST["']|FormData|\.upload/i, "no write/upload path in the File Cabinet UI");
});

check("blocked files keep the calm-lock treatment in the render (every view)", () => {
  assert.match(js, /const blockedFile = isBlockedClass\(f\.data_class\)/, "rows must derive blocked from isBlockedClass");
  assert.match(js, /blockedFile\s*\?\s*" blocked"|" blocked" : ""/, "blocked rows must get the .blocked (calm lock) class");
});

console.log(`\nV8A3-FILECABINET-L3-SELFTEST: PASS (${passed} checks)`);
