// FounderGate V8-B VB2 — PLAYWRIGHT EVIDENCE INDEX (read-only, NON-EXECUTING).
//
// Plain English: FounderGate already captures Playwright evidence, but only for ONE surface —
// the Phase7.1 safety-check foreground capture bakes its own RESULT.json, screenshot index,
// trace, video and hash manifest into a single hand-written bundle. Every OTHER surface that
// produces a Playwright bundle (the founder URL-drop UI, future lane surfaces, the raw
// `@playwright/test` JSON reporter) is invisible: nothing reads across those bundles and tells
// the founder, in one honest place, "here is every Playwright evidence bundle we have, what each
// one claims, and — the part that matters — which claims are NOT backed by the artifacts that
// would prove them." That is the gap the V8-B completion matrix names for the Playwright evidence
// system: *generalized evidence indexer* (today it is "Phase7.1 safety-check only").
//
// This module is that indexer — a GENERALIZED, surface-agnostic reader over evidence-bundle
// descriptors — and NOTHING ELSE:
//   - It is PURE and read-only: every function takes bundle descriptors the caller supplies and
//     RETURNS a plain object or a STRING. It never captures, runs a browser, acts, approves, or
//     executes anything, and it never reads the disk itself.
//   - NO side effects: no fs, no network, no child_process, no clock, no randomness. The disk
//     reading (parse RESULT.json, count screenshots, check for a trace) happens in the EVIDENCE
//     GENERATOR that feeds this module; the module only normalizes and composes the DATA it is
//     handed. VB2 never invents state (Law 54): a bundle that does not DECLARE a trace is indexed
//     as "no trace" — said out loud — never guessed to have one.
//   - It is SURFACE-AGNOSTIC: a bundle carries whatever `surface` string produced it; the index
//     buckets by that string in first-appearance order. It is not wired to the safety-check
//     surface, so a new lane's Playwright bundle indexes the same way with no code change here.
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>, <form>,
//     <button>, <input>, on* handler, or navigable link. Indexing evidence is not acting on it.
//
// Honesty over flattery — the headline behaviour: a bundle that CLAIMS success (verdict PASS) but
// does NOT declare the core falsifiable artifacts (at least one screenshot, a trace, and a hash
// manifest) is flagged as an UNSUPPORTED CLAIM. This is the generalized form of the "false green"
// guard the safety-check evidence already applies to one surface: a green light nobody can check
// is worse than a red one, so the index refuses to let an unbacked pass read as proven.

import { UNKNOWN } from "./cto-queue.mjs";

export const EVIDENCE_INDEX_VERSION = "1.0.0";

// The normalized verdict of a bundle. UNKNOWN is a first-class, honest value — a bundle whose
// state cannot be read is UNKNOWN, never assumed to have passed.
export const VERDICT = Object.freeze(["PASS", "FAIL", "RUNNING", UNKNOWN]);

const VERDICT_LABEL = Object.freeze({
  PASS: "Passed",
  FAIL: "Failed",
  RUNNING: "Running",
  [UNKNOWN]: "Unknown state",
});

// The core falsifiable artifacts a Playwright bundle must DECLARE for its verdict to be
// checkable: at least one screenshot, a saved trace, and a hash manifest binding the files. A
// video is surfaced but NOT required — a green run legitimately keeps none (retain-on-failure).
// These are the things a reviewer can open and verify; without them a "PASS" is just a word.
const CORE_ARTIFACTS = "at least one screenshot + a trace + a hash manifest";

// A non-negative integer count, or 0. A missing/garbage/negative value normalizes to 0 — an
// absent count means "none declared", said out loud; it is never guessed upward (Law 54).
function count(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

// A strict boolean presence. Only an explicit `true` counts as "declared present"; anything else
// (absent, false, truthy-but-not-true) is "not declared" — presence is never inferred.
function present(v) {
  return v === true;
}

// normalizeVerdict(descriptor) -> one of VERDICT. Surface-agnostic: it reads a raw run-state
// STRING (as the founder-surface captures write, e.g. "FOREGROUND_TEST_VERIFIED") first, and
// falls back to raw @playwright/test reporter stats (passed / failed counts). If neither can be
// read honestly, the verdict is UNKNOWN — never assumed PASS.
export function normalizeVerdict(descriptor) {
  const d = descriptor || {};
  const state = typeof d.state === "string" ? d.state.toUpperCase() : "";
  if (state) {
    if (/VERIFIED|PASSED|\bPASS\b|SUCCESS|GREEN/.test(state)) return "PASS";
    if (/FAILED|\bFAIL\b|REFUS|ERROR|RED/.test(state)) return "FAIL";
    if (/RUNNING|PENDING|IN[_-]?PROGRESS/.test(state)) return "RUNNING";
    // a state string we do not recognize is NOT evidence of a pass — fall through to stats.
  }
  const failed = typeof d.failed === "number" && Number.isFinite(d.failed) ? d.failed : null;
  const passed = typeof d.passed === "number" && Number.isFinite(d.passed) ? d.passed : null;
  if (failed !== null && failed > 0) return "FAIL";
  if (failed === 0 && passed !== null && passed > 0) return "PASS";
  return UNKNOWN;
}

// normalizeBundle(descriptor) -> a PURE, frozen normalized record. Read-only: it derives a
// verdict and a declared-artifact tally from the descriptor and decides two honest flags:
//   - supported: does the bundle DECLARE the core falsifiable artifacts? (checkable at all)
//   - unsupported_claim: does it CLAIM a pass it cannot back? (verdict PASS but not supported)
// It never mutates the input and never invents a field the descriptor did not carry.
export function normalizeBundle(descriptor) {
  const d = descriptor || {};
  const id = typeof d.id === "string" && d.id ? d.id : UNKNOWN;
  const surface = typeof d.surface === "string" && d.surface ? d.surface : UNKNOWN;
  const path = typeof d.path === "string" ? d.path : "";
  const verdict = normalizeVerdict(d);
  const evidence = Object.freeze({
    screenshots: count(d.screenshots),
    video: present(d.video),
    trace: present(d.trace),
    hashes: present(d.hashes),
    dom_assertions: count(d.dom_assertions),
    downloads: count(d.downloads),
  });
  const supported = evidence.screenshots > 0 && evidence.trace && evidence.hashes;
  const unsupported_claim = verdict === "PASS" && !supported;
  return Object.freeze({ id, surface, path, verdict, evidence, supported, unsupported_claim });
}

// indexDigest(bundles) -> a PURE derived summary across every bundle. Honest by construction:
//   - by_verdict has every verdict bucket present and zero-filled, and the buckets SUM to total
//     (no bundle is lost or double-counted).
//   - by_surface keys are the surfaces that actually appear, in first-appearance order — no
//     hardcoded surface list, so a new surface's bundles bucket themselves.
//   - unsupported_claims is the headline: how many bundles claim a pass the artifacts can't back.
//   - artifact_totals sums only DECLARED artifacts — never an assumed one.
export function indexDigest(bundles) {
  const list = Array.isArray(bundles) ? bundles.map(normalizeBundle) : [];
  const by_verdict = Object.fromEntries(VERDICT.map((v) => [v, 0]));
  const by_surface = {};
  const artifact_totals = { screenshots: 0, videos: 0, traces: 0, hashes: 0, dom_assertions: 0, downloads: 0 };
  let supported = 0;
  const unsupported_claim_ids = [];
  for (const b of list) {
    by_verdict[b.verdict] += 1; // b.verdict is always one of VERDICT, so this never drops a bundle
    if (!Object.prototype.hasOwnProperty.call(by_surface, b.surface)) by_surface[b.surface] = 0;
    by_surface[b.surface] += 1;
    artifact_totals.screenshots += b.evidence.screenshots;
    artifact_totals.videos += b.evidence.video ? 1 : 0;
    artifact_totals.traces += b.evidence.trace ? 1 : 0;
    artifact_totals.hashes += b.evidence.hashes ? 1 : 0;
    artifact_totals.dom_assertions += b.evidence.dom_assertions;
    artifact_totals.downloads += b.evidence.downloads;
    if (b.supported) supported += 1;
    if (b.unsupported_claim) unsupported_claim_ids.push(b.id);
  }
  return {
    total: list.length,
    by_verdict,
    by_surface,
    supported,
    partial_evidence: list.length - supported,
    unsupported_claims: unsupported_claim_ids.length,
    unsupported_claim_ids,
    artifact_totals,
  };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// renderDigestText(bundles) -> string. Founder-readable one-glance summary. Pure.
export function renderDigestText(bundles) {
  const d = indexDigest(bundles);
  const verdicts = VERDICT.map((v) => `${VERDICT_LABEL[v]}: ${d.by_verdict[v]}`);
  const lines = [
    `PLAYWRIGHT EVIDENCE — INDEX (read-only; indexes captured bundles, runs nothing)`,
    `Bundles indexed: ${d.total}`,
    `  ${verdicts.join("  ·  ")}`,
    `  Backed by core evidence: ${d.supported}  ·  Partial evidence: ${d.partial_evidence}`,
  ];
  if (d.unsupported_claims > 0) {
    lines.push(`  UNSUPPORTED CLAIMS (PASS not backed by ${CORE_ARTIFACTS}): ${d.unsupported_claims} — ${d.unsupported_claim_ids.join(", ")}`);
  }
  return lines.join("\n");
}

// renderDigestHtml(bundles) -> string of HTML. Pure display: a row of stat cards. No <script>,
// form, button, handler, or link — nothing an interaction can ride. Red is used ONLY for the
// unsupported-claims card, and only when it is non-zero: a problem, not a routine state.
export function renderDigestHtml(bundles) {
  const d = indexDigest(bundles);
  const cards = [statCard("Bundles", d.total, "fg-stat-total")];
  for (const v of VERDICT) cards.push(statCard(VERDICT_LABEL[v], d.by_verdict[v], `fg-stat-verdict-${escapeHtml(v.toLowerCase())}`));
  cards.push(statCard("Backed by evidence", d.supported, "fg-stat-supported"));
  if (d.unsupported_claims > 0) {
    cards.push(statCard("Unsupported claims", d.unsupported_claims, "fg-stat-unsupported"));
  }
  return [
    `<section class="fg-index-digest" aria-readonly="true">`,
    `  <h2>Evidence summary</h2>`,
    `  <p class="fg-note">A read-only count of every Playwright evidence bundle we hold, across all surfaces. Nothing here runs a test, opens a browser, or acts on anything.</p>`,
    `  <div class="fg-stat-row">`,
    ...cards,
    `  </div>`,
    `</section>`,
  ].join("\n");
}

function statCard(label, value, cls) {
  return (
    `    <div class="fg-stat ${cls}">` +
    `<span class="fg-stat-value">${escapeHtml(value)}</span>` +
    `<span class="fg-stat-label">${escapeHtml(label)}</span>` +
    `</div>`
  );
}

// renderBundleListHtml(bundles) -> string of HTML. Pure display of the per-bundle rows. Each row
// states the bundle's surface, verdict, and DECLARED artifacts. A bundle that claims a pass it
// cannot back carries a loud, honest flag — this is the one place red is warranted.
export function renderBundleListHtml(bundles) {
  const list = Array.isArray(bundles) ? bundles.map(normalizeBundle) : [];
  if (list.length === 0) {
    return `<section aria-readonly="true"><h2>Bundles</h2><p class="fg-empty">No Playwright evidence bundles indexed yet.</p></section>`;
  }
  const rows = list.map((b) => {
    const chips = [
      chip(`${b.evidence.screenshots} screenshot${b.evidence.screenshots === 1 ? "" : "s"}`, b.evidence.screenshots > 0),
      chip("trace", b.evidence.trace),
      chip("video", b.evidence.video),
      chip("hash manifest", b.evidence.hashes),
      chip(`${b.evidence.dom_assertions} DOM assertion${b.evidence.dom_assertions === 1 ? "" : "s"}`, b.evidence.dom_assertions > 0),
    ].join("");
    const flag = b.unsupported_claim
      ? `      <p class="fg-flag">⚠ Claims PASS but does not declare ${escapeHtml(CORE_ARTIFACTS)} — this pass is not checkable.</p>`
      : (b.supported ? `      <p class="fg-ok">Backed by the core falsifiable artifacts.</p>` : `      <p class="fg-partial">Partial evidence — not a claimed pass, so nothing is overstated.</p>`);
    return [
      `    <li class="fg-bundle">`,
      `      <div class="fg-bundle-head">`,
      `        <span class="fg-verdict fg-verdict-${escapeHtml(b.verdict.toLowerCase())}">${escapeHtml(VERDICT_LABEL[b.verdict])}</span>`,
      `        <span class="fg-bundle-id">${escapeHtml(b.id)}</span>`,
      `      </div>`,
      `      <div class="fg-bundle-surface">surface: ${escapeHtml(b.surface)}</div>`,
      b.path ? `      <div class="fg-bundle-path">${escapeHtml(b.path)}</div>` : ``,
      `      <div class="fg-chips">${chips}</div>`,
      flag,
      `    </li>`,
    ].filter(Boolean).join("\n");
  });
  return [
    `<section aria-readonly="true">`,
    `  <h2>Bundles</h2>`,
    `  <ul class="fg-bundle-list">`,
    ...rows,
    `  </ul>`,
    `</section>`,
  ].join("\n");
}

function chip(label, on) {
  return `<span class="fg-chip ${on ? "fg-chip-on" : "fg-chip-off"}">${on ? "" : "no "}${escapeHtml(label)}</span>`;
}

// The self-contained style for the dedicated surface. Inlined so the rendered page is a PORTABLE
// evidence artifact that stands alone. Uses the shared founder palette from src/ui/tokens.css for
// visual kinship. Style only — no behaviour. Colour law: red is reserved for the genuine problem
// (an unsupported claim / a failed bundle); routine "partial evidence" is calm, not alarming.
const SURFACE_STYLE = `
    :root{
      --bg:#0d1117;--panel:#161c26;--panel2:#1b2230;--line:#2a3344;
      --text:#e6ebf2;--muted:#93a0b4;--dim:#6b7789;
      --blue:#3b82f6;--green:#22c55e;--amber:#f5b83d;--purple:#a78bfa;--red:#f26d6d;--radius:12px;
    }
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);
      font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
    .fg-wrap{max-width:920px;margin:0 auto;padding:32px 20px 56px}
    .fg-eyebrow{color:var(--purple);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600}
    h1{font-size:27px;margin:.2em 0 .1em}
    h2{font-size:16px;margin:0 0 .4em}
    .fg-sub{color:var(--muted);margin:0 0 24px}
    .fg-note{color:var(--muted);font-size:12.5px;margin:.1em 0 14px}
    section{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
      padding:18px 20px;margin:0 0 20px}
    .fg-stat-row{display:flex;flex-wrap:wrap;gap:12px}
    .fg-stat{flex:1 1 120px;background:var(--panel2);border:1px solid var(--line);
      border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:2px}
    .fg-stat-value{font-size:26px;font-weight:700}
    .fg-stat-label{color:var(--muted);font-size:12.5px}
    .fg-stat-verdict-pass .fg-stat-value,.fg-stat-supported .fg-stat-value{color:var(--green)}
    .fg-stat-verdict-fail .fg-stat-value{color:var(--red)}
    .fg-stat-verdict-running .fg-stat-value{color:var(--blue)}
    .fg-stat-verdict-unknown .fg-stat-value{color:var(--purple)}
    .fg-stat-unsupported{border-color:rgba(242,109,109,.5)}
    .fg-stat-unsupported .fg-stat-value{color:var(--red)}
    .fg-bundle-list{list-style:none;margin:0;padding:0}
    .fg-bundle{border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:0 0 10px;background:var(--panel2)}
    .fg-bundle-head{display:flex;align-items:center;gap:8px}
    .fg-verdict{display:inline-block;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;
      border-radius:999px;padding:1px 8px}
    .fg-verdict-pass{color:var(--green);border:1px solid rgba(34,197,94,.4)}
    .fg-verdict-fail{color:var(--red);border:1px solid rgba(242,109,109,.5)}
    .fg-verdict-running{color:var(--blue);border:1px solid rgba(59,130,246,.4)}
    .fg-verdict-unknown{color:var(--purple);border:1px solid rgba(167,139,250,.4)}
    .fg-bundle-id{font-weight:600}
    .fg-bundle-surface{color:var(--muted);font-size:12.5px;margin-top:4px}
    .fg-bundle-path{color:var(--dim);font-size:12px;margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .fg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    .fg-chip{font-size:11.5px;border-radius:999px;padding:1px 8px;border:1px solid var(--line)}
    .fg-chip-on{color:var(--text)}
    .fg-chip-off{color:var(--dim)}
    .fg-flag{color:var(--red);font-size:12.5px;margin:8px 0 0}
    .fg-ok{color:var(--green);font-size:12.5px;margin:8px 0 0}
    .fg-partial{color:var(--muted);font-size:12.5px;margin:8px 0 0}
    .fg-empty{color:var(--muted)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

// renderSurfaceHtml(bundles) -> a COMPLETE, self-contained founder-readable page. Pure: same
// bundles in, byte-identical page out (no clock, no randomness). It composes the derived summary
// and the per-bundle list into one dedicated surface. It carries NO <script>, <form>, <button>,
// <input>, on* handler, or navigable link — the page is observably read-only.
export function renderSurfaceHtml(bundles) {
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>Playwright Evidence Index — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>Playwright Evidence Index</h1>`,
    `    <p class="fg-sub">Every Playwright evidence bundle we hold, across all surfaces, in one place — with an honest flag on any bundle that claims a pass its artifacts cannot back. This surface only indexes evidence; it runs nothing and acts on nothing.</p>`,
    indent(renderDigestHtml(bundles)),
    indent(renderBundleListHtml(bundles)),
    `    <p class="fg-foot">Read-only view · this indexer never captures or runs a test — the capture edge stays in the evidence generators.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

function indent(block) {
  return block.split("\n").map((l) => (l === "" ? l : `    ${l}`)).join("\n");
}

// renderSurfaceText(bundles) -> plain-text dedicated surface (summary + per-bundle lines). Pure.
// Useful for a terminal/log rendering and for tests that assert content without HTML.
export function renderSurfaceText(bundles) {
  const list = Array.isArray(bundles) ? bundles.map(normalizeBundle) : [];
  const lines = [renderDigestText(bundles), "", "BUNDLES"];
  if (list.length === 0) {
    lines.push("  (none indexed yet)");
    return lines.join("\n");
  }
  for (const b of list) {
    lines.push(`  [${VERDICT_LABEL[b.verdict]}] ${b.id}  (surface: ${b.surface})`);
    lines.push(`     screenshots:${b.evidence.screenshots} trace:${b.evidence.trace ? "yes" : "no"} video:${b.evidence.video ? "yes" : "no"} hashes:${b.evidence.hashes ? "yes" : "no"} dom:${b.evidence.dom_assertions}`);
    if (b.unsupported_claim) lines.push(`     ⚠ UNSUPPORTED CLAIM — PASS not backed by ${CORE_ARTIFACTS}`);
  }
  return lines.join("\n");
}
