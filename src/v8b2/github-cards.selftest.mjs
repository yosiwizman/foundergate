// FounderGate V8-B VB2 — GitHub INTEGRATION CARDS surface proof: links are derived honestly
// (never invented), the source truth-label is carried, the page is a COMPLETE read-only
// surface, and it has grown NO act edge and NO navigable link.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeBundle } from "../collectors/github/github-collector.mjs";
import * as surface from "./github-cards.mjs";
import {
  deriveCards, repoSlug, renderCardsHtml, renderCardsText,
  renderSurfaceHtml, renderSurfaceText, GITHUB_HOST,
} from "./github-cards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// The REAL committed collector fixture, run through the FROZEN normalizer — the same data path
// the evidence generator uses. No network: normalizeBundle is pure over an already-fetched raw.
const RAW = JSON.parse(
  readFileSync(join(HERE, "..", "collectors", "github", "fixtures", "sample-bundle.json"), "utf8")
);
const BUNDLE = normalizeBundle(RAW);

console.log("== VB2 GitHub integration cards — surface ==");

check("deriveCards carries the collector's source truth-label (never conflates live/fixture)", () => {
  const v = deriveCards(BUNDLE);
  assert.equal(v.source, "fixture", "fixture bundle must be labelled fixture");
  assert.equal(v.readOnly, true);
  assert.equal(deriveCards({ source: "live-gh", repo: "o/r" }).source, "live-gh");
  assert.equal(deriveCards({ source: "weird" }).source, "UNKNOWN", "unknown source said out loud");
});

check("repoSlug validates owner/name and refuses anything else (no invented slug)", () => {
  assert.deepEqual(repoSlug("owner/example-repo"), { owner: "owner", name: "example-repo", slug: "owner/example-repo" });
  assert.equal(repoSlug("not-a-slug"), null);
  assert.equal(repoSlug("too/many/parts"), null);
  assert.equal(repoSlug("owner/"), null);
  assert.equal(repoSlug("bad owner/repo"), null);
  assert.equal(repoSlug("[REDACTED]/repo"), null, "a redacted owner is not linkable");
});

check("repo card derives the canonical repo URL from a clean slug", () => {
  const v = deriveCards(BUNDLE);
  assert.equal(v.repo.slug, "owner/example-repo");
  assert.equal(v.repo.linkable, true);
  assert.equal(v.repo.url, `${GITHUB_HOST}/owner/example-repo`);
});

check("a non-owner/name repo yields NO link and says so (Law 54 — never invent a URL)", () => {
  const v = deriveCards({ source: "fixture", repo: "just-a-name", pullRequests: [] });
  assert.equal(v.repo.linkable, false);
  assert.equal(v.repo.url, null);
  const text = renderCardsText({ source: "fixture", repo: "just-a-name" });
  assert.ok(text.includes("no canonical link"), "text states the absence out loud");
  assert.ok(text.includes("not in owner/name form"), "text explains why the repo has no link");
});

check("PR/branch/commit/file URLs are the canonical GitHub shapes for PR139", () => {
  const v = deriveCards(BUNDLE);
  const pr = v.prs.find((p) => p.number === 139);
  const base = `${GITHUB_HOST}/owner/example-repo`;
  assert.equal(pr.links.pr, `${base}/pull/139`);
  assert.equal(pr.links.branch, `${base}/tree/feature/example-lane`, "branch slashes preserved, segments encoded");
  assert.equal(pr.links.commit, `${base}/commit/7e1e068a372dcb2eb4f28da301c7ee844824bc35`);
  assert.equal(pr.headShaShort, "7e1e068");
  const f = pr.files.find((x) => x.filename === "scripts/_lib/example-lane.mjs");
  assert.equal(f.url, `${base}/blob/7e1e068a372dcb2eb4f28da301c7ee844824bc35/scripts/_lib/example-lane.mjs`,
    "file blob URL is pinned to the head SHA");
});

check("file URL falls back to the branch when no valid head SHA, and to null when neither is clean", () => {
  const base = `${GITHUB_HOST}/o/r`;
  const noSha = deriveCards({
    source: "fixture", repo: "o/r",
    pullRequests: [{ number: 5, branch: "main", headSha: "", filesChanged: [{ filename: "a/b.txt" }] }],
  });
  assert.equal(noSha.prs[0].files[0].url, `${base}/blob/main/a/b.txt`, "pins to branch when SHA missing");
  assert.equal(noSha.prs[0].links.commit, null, "no commit link without a valid SHA");
  const neither = deriveCards({
    source: "fixture", repo: "o/r",
    pullRequests: [{ number: 6, branch: "", headSha: "", filesChanged: [{ filename: "a/b.txt" }] }],
  });
  assert.equal(neither.prs[0].files[0].url, null, "no file link with neither SHA nor branch");
});

check("a malicious branch/path never yields a URL and never escapes as markup", () => {
  const evil = deriveCards({
    source: "fixture", repo: "o/r",
    pullRequests: [{
      number: 7, branch: '../../etc"><script>', headSha: "1234567",
      filesChanged: [{ filename: "../../secret" }, { filename: 'ok"><b>.txt' }],
    }],
  });
  const pr = evil.prs[0];
  assert.equal(pr.links.branch, null, "path traversal branch is not linkable");
  assert.equal(pr.files[0].url, null, "traversal file path is not linkable");
  assert.equal(pr.files[1].url, null, "file path with unsafe chars is not linkable");
  const html = renderSurfaceHtml({
    source: "fixture", repo: "o/r",
    pullRequests: [{ number: 7, branch: '../../etc"><script>x', headSha: "1234567", filesChanged: [] }],
  });
  assert.ok(!/<script>x/.test(html), "the injected script tag must not appear raw");
  assert.ok(html.includes("&lt;script&gt;"), "the branch text is escaped");
});

check("URL components are never built from redacted leaves", () => {
  const v = deriveCards({
    source: "fixture", repo: "o/r",
    pullRequests: [{ number: 8, branch: "[REDACTED]", headSha: "[REDACTED]", filesChanged: [{ filename: "[REDACTED]" }] }],
  });
  assert.equal(v.prs[0].links.branch, null);
  assert.equal(v.prs[0].links.commit, null);
  assert.equal(v.prs[0].files[0].url, null);
});

check("CI rollup and Copilot binding flow through into the derived card (PR139)", () => {
  const pr = deriveCards(BUNDLE).prs.find((p) => p.number === 139);
  assert.equal(pr.ci.state, "failing");
  assert.equal(pr.ci.failed, 1);
  assert.equal(pr.mergeable, "CONFLICTING");
  assert.equal(pr.copilotReviewed, true);
  assert.equal(pr.copilotBoundToHead, true, "Copilot review is on the current head SHA");
});

check("deriveCards is PURE — it does not mutate the bundle", () => {
  const snapshot = JSON.stringify(BUNDLE);
  deriveCards(BUNDLE);
  assert.equal(JSON.stringify(BUNDLE), snapshot, "deriveCards mutated the bundle");
});

check("garbage / empty input degrades to an honest empty view, never throws", () => {
  for (const bad of [null, undefined, 42, "x", [], {}]) {
    const v = deriveCards(bad);
    assert.equal(v.prs.length, 0);
    assert.equal(v.openPrCount, 0);
    assert.equal(v.repo.linkable, false);
  }
});

check("renderSurfaceHtml is a COMPLETE page embedding repo + PR cards + links", () => {
  const html = renderSurfaceHtml(BUNDLE);
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes("<html") && html.includes("</html>"), "has <html>..</html>");
  assert.ok(html.includes("<head>") && html.includes("</head>"), "has <head>");
  assert.ok(html.includes("<body>") && html.includes("</body>"), "has <body>");
  assert.ok(html.includes("GitHub Integration Cards"), "has the surface heading");
  assert.ok(html.includes("owner/example-repo"), "embeds the repo slug");
  assert.ok(html.includes(`${GITHUB_HOST}/owner/example-repo/pull/139`), "embeds a canonical PR URL as text");
  assert.ok(html.includes("Fixture"), "surfaces the source truth-label");
});

check("THE CRITICAL PROOF: the page has NO act affordance AND no navigable link", () => {
  const html = renderSurfaceHtml(BUNDLE);
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link (<a href>) — links are copyable text only");
  assert.ok(!/<a[\s>]/i.test(html), "no anchor element at all");
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
});

check("rendering is DETERMINISTIC — same bundle in, byte-identical output (no clock/randomness)", () => {
  assert.equal(renderSurfaceHtml(BUNDLE), renderSurfaceHtml(BUNDLE));
  assert.equal(renderCardsText(BUNDLE), renderCardsText(BUNDLE));
  assert.equal(renderSurfaceText(BUNDLE), renderCardsText(BUNDLE), "surface text is the cards text");
});

check("NO ACT EDGE (source scan): the module imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("github-cards.mjs");
  const SIDE_EFFECT_IMPORTS = [
    "node:fs", "node:child_process", "node:net", "node:http", "node:https",
    "node:dgram", "node:worker_threads", "node:process", "child_process",
  ];
  for (const imp of SIDE_EFFECT_IMPORTS) {
    assert.ok(!src.includes(`"${imp}"`) && !src.includes(`'${imp}'`), `surface imports ${imp}`);
  }
  const SIDE_EFFECT_CALLS = ["writeFileSync", "writeFile", "appendFile", "spawn", "exec(", "execSync", "fetch(", "Date.now(", "process.exit", "eval("];
  for (const call of SIDE_EFFECT_CALLS) {
    assert.ok(!src.includes(call), `surface contains side-effecting token ${call}`);
  }
  assert.ok(!/v8b1/i.test(src), "surface must not reference v8b1 (lane isolation)");
});

check("NO ACT EDGE (export scan): every exported function is read-only-named", () => {
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|merge|mintToken|token)/i;
  const names = Object.keys(surface).filter((k) => typeof surface[k] === "function");
  const allowed = new Set(["deriveCards", "repoSlug", "renderCardsHtml", "renderCardsText", "renderSurfaceHtml", "renderSurfaceText"]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on surface: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `surface export ${n} reads like an act edge`);
  }
});

console.log(`\nV8B2-GITHUB-CARDS-SELFTEST: PASS (${pass} checks)`);
