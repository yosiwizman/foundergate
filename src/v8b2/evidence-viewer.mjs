// FounderGate V8-B VB2 — EVIDENCE VIEWER (read-only, single-bundle drill-in, NON-EXECUTING).
//
// Plain English: the Playwright evidence INDEX (src/v8b2/playwright-evidence-index.mjs) reads
// ACROSS every bundle we hold and answers "which bundles exist, what does each claim, and which
// claims aren't backed?" — it is the directory. It does NOT let the founder open ONE bundle and
// READ it: what files it contains, how big they are, which of those files carry a hash you could
// recompute to prove they weren't swapped, what the run actually DID (its DOM steps), what it
// SHOWED (its screenshots), and what it recorded (its facts). That readable per-bundle surface is
// the gap the V8-B completion matrix names: **Evidence Viewer = NOT BUILT, missing "readable
// viewer surface"** — and the Playwright-index REPORT itself flagged it as the next lane.
//
// This module is that viewer — a reader over ONE bundle's contents — and NOTHING ELSE:
//   - It is PURE and read-only: every function takes a bundle descriptor the caller supplies and
//     RETURNS a plain object or a STRING. It never opens files, hashes anything, runs a browser,
//     acts, approves, or executes. It never reads the disk itself — the disk reading (parse the
//     RESULT.json, list the manifest, read byte sizes) happens in the EVIDENCE GENERATOR that
//     feeds this module; the viewer only presents the DATA it is handed.
//   - NO side effects: no fs, no network, no child_process, no clock, no randomness. Same bundle
//     in → byte-identical page out.
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>, <form>,
//     <button>, <input>, on* handler, or navigable link. Reading a bundle is not acting on it —
//     there is no "re-run" or "accept" control here; that edge stays frozen to VB3.
//
// The honesty headline — the part a *viewer* uniquely exposes: a bundle's hash manifest is what
// makes it FALSIFIABLE. A file listed in the manifest WITH a valid sha256 is *verifiable* — a
// reviewer can `shasum -a 256` it and check. A file listed WITHOUT a valid hash is *unverifiable*
// — the bundle names it but gives you no way to prove it is what it claims (Law 54: never assume a
// file matches). A bundle is *self-verifying* only when every listed file carries a recomputable
// hash. And a bundle whose recorded verdict is PASS but which is NOT self-verifying is an
// UNSUPPORTED CLAIM at the file level: it says "passed" while handing you files you cannot all
// check. The viewer shows the self-reported facts AND this independent, file-level check side by
// side, and never lets the fact "foreground_state: VERIFIED" override files that aren't hashed.

import { UNKNOWN } from "./cto-queue.mjs";
import { normalizeVerdict, VERDICT } from "./playwright-evidence-index.mjs";

export const EVIDENCE_VIEWER_VERSION = "1.0.0";

// A valid sha256 hex digest: exactly 64 hex characters. Anything else is "no usable hash".
const SHA256_RE = /^[0-9a-f]{64}$/i;

const VERDICT_LABEL = Object.freeze({
  PASS: "Passed",
  FAIL: "Failed",
  RUNNING: "Running",
  [UNKNOWN]: "Unknown state",
});

// A trimmed string, or "" — never a coerced object/number pretending to be text.
function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

// A non-negative integer, or null when it cannot be read. null means "not declared", said out
// loud (e.g. size unknown) — it is NEVER guessed to be 0 or upward (Law 54).
function intOrNull(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

// normalizeManifestEntry(entry) -> a PURE, frozen manifest row. It decides ONE honest thing the
// bundle's own words cannot fake: does this listed file carry a hash a reviewer could recompute?
// A missing/garbage/short hash makes the file `verifiable: false` — the viewer says "no hash to
// check", never pretends the file is proven.
export function normalizeManifestEntry(entry) {
  const e = entry || {};
  const path = str(e.path) || str(e.file) || UNKNOWN;
  const raw = str(e.sha256) || str(e.hash);
  const sha256 = SHA256_RE.test(raw) ? raw.toLowerCase() : null;
  const bytes = intOrNull(e.bytes);
  return Object.freeze({ path, sha256, bytes, verifiable: sha256 !== null });
}

// Recorded facts are the bundle's own key/value claims (e.g. the RESULT.json body). The viewer
// DISPLAYS them verbatim (escaped) — it interprets nothing and trusts nothing here; the
// independent check lives in the manifest, not in these self-reported words. Accepts either a
// plain object (key -> value, insertion order preserved) or an array of {key, value} pairs.
function normalizeFacts(facts) {
  let pairs = [];
  if (Array.isArray(facts)) {
    pairs = facts.map((f) => [str(f && f.key), f && f.value]);
  } else if (facts && typeof facts === "object") {
    pairs = Object.entries(facts);
  }
  return Object.freeze(
    pairs
      .filter(([k]) => k !== "")
      .map(([k, v]) => Object.freeze({ key: str(k), value: factValue(v) }))
  );
}

// A fact value rendered as a single honest string. Objects/arrays are JSON-stringified so nested
// structure is shown, not hidden; null/undefined become an explicit dash, never a blank that reads
// like "no problem".
function factValue(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

function stringList(list) {
  return Array.isArray(list) ? list.filter((x) => typeof x === "string" && x.trim() !== "") : [];
}

// Observable counts a bundle records about the run (console entries, network entries, page
// errors). Each is an integer or null ("not declared") — never guessed. page_errors is surfaced
// on its own because a non-zero count is a signal the founder should see.
function normalizeCounts(counts) {
  const c = counts && typeof counts === "object" ? counts : {};
  return Object.freeze({
    console: intOrNull(c.console),
    network: intOrNull(c.network),
    page_errors: intOrNull(c.page_errors),
  });
}

// normalizeView(descriptor) -> a PURE, frozen readable view of ONE bundle. It composes the
// self-reported verdict + facts with the independent, file-level manifest check and derives the
// honest headline flags. It never mutates the input and never invents a field.
export function normalizeView(descriptor) {
  const d = descriptor || {};
  const id = str(d.id) || UNKNOWN;
  const surface = str(d.surface) || UNKNOWN;
  const path = str(d.path);
  const verdict = normalizeVerdict(d);
  const facts = normalizeFacts(d.facts);
  const manifest = Array.isArray(d.manifest) ? d.manifest.map(normalizeManifestEntry) : [];
  const timeline = stringList(d.timeline);
  const screenshots = stringList(d.screenshots);
  const counts = normalizeCounts(d.counts);

  const file_count = manifest.length;
  const verifiable_files = manifest.filter((m) => m.verifiable).length;
  const unverifiable_files = file_count - verifiable_files;
  // total_bytes sums only DECLARED sizes; if any listed file has an unknown size we say so rather
  // than under-reporting a total as if it were complete.
  let total_bytes = 0;
  let bytes_complete = file_count > 0;
  for (const m of manifest) {
    if (m.bytes === null) bytes_complete = false;
    else total_bytes += m.bytes;
  }
  // self-verifying: there IS a manifest and EVERY file in it carries a recomputable hash.
  const self_verifying = file_count > 0 && unverifiable_files === 0;
  // the false-green guard at file granularity: a claimed PASS you cannot fully check.
  const unsupported_claim = verdict === "PASS" && !self_verifying;

  return Object.freeze({
    id, surface, path, verdict,
    facts, manifest, timeline, screenshots, counts,
    file_count, verifiable_files, unverifiable_files,
    total_bytes, bytes_complete,
    self_verifying, unsupported_claim,
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Human-readable byte size. Pure; deterministic. null in -> "size unknown" (said out loud).
function humanBytes(n) {
  if (n === null || n === undefined) return "size unknown";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

// renderViewText(descriptor) -> founder-readable plain text of the whole bundle. Pure.
export function renderViewText(descriptor) {
  const v = normalizeView(descriptor);
  const lines = [
    `EVIDENCE VIEWER — one bundle (read-only; reads a captured bundle, runs nothing)`,
    `Bundle: ${v.id}`,
    `Surface: ${v.surface}`,
    `Verdict: ${VERDICT_LABEL[v.verdict]}`,
  ];
  if (v.path) lines.push(`Path: ${v.path}`);
  lines.push("");
  // the honest headline first
  if (v.unsupported_claim) {
    lines.push(`⚠ UNSUPPORTED CLAIM — records PASS but is not self-verifying (${v.unverifiable_files} of ${v.file_count} listed file(s) carry no recomputable hash). This pass cannot be fully checked.`);
  } else if (v.self_verifying) {
    lines.push(`Self-verifying: every one of the ${v.file_count} listed file(s) carries a sha256 you can recompute.`);
  } else if (v.file_count === 0) {
    lines.push(`No hash manifest — this bundle lists no files, so nothing here is independently checkable.`);
  } else {
    lines.push(`Partial evidence — ${v.unverifiable_files} of ${v.file_count} listed file(s) carry no recomputable hash (not a claimed pass, so nothing is overstated).`);
  }
  lines.push("");
  lines.push(`FILE MANIFEST (${v.file_count} file(s)${v.file_count ? `, ${v.bytes_complete ? humanBytes(v.total_bytes) : humanBytes(v.total_bytes) + "+"}` : ""})`);
  if (v.file_count === 0) {
    lines.push("  (no files listed)");
  } else {
    for (const m of v.manifest) {
      lines.push(`  ${m.verifiable ? "✓" : "✗"} ${m.path}  (${humanBytes(m.bytes)})  ${m.sha256 ? m.sha256 : "NO HASH — unverifiable"}`);
    }
  }
  if (v.facts.length) {
    lines.push("", "RECORDED FACTS (as the bundle reported them — self-reported, not proof)");
    for (const f of v.facts) lines.push(`  ${f.key}: ${f.value}`);
  }
  if (v.timeline.length) {
    lines.push("", "OBSERVED STEPS (what the run did)");
    v.timeline.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  }
  if (v.screenshots.length) {
    lines.push("", `SCREENSHOTS (${v.screenshots.length}) — names only; the viewer lists, it does not embed`);
    for (const s of v.screenshots) lines.push(`  • ${s}`);
  }
  const cparts = [];
  if (v.counts.console !== null) cparts.push(`console:${v.counts.console}`);
  if (v.counts.network !== null) cparts.push(`network:${v.counts.network}`);
  if (v.counts.page_errors !== null) cparts.push(`page-errors:${v.counts.page_errors}`);
  if (cparts.length) lines.push("", `OBSERVED COUNTS: ${cparts.join("  ")}`);
  return lines.join("\n");
}

// ---- HTML section renderers (pure display; no behaviour) -------------------------------------

// The honesty banner: the one thing the viewer independently decided about this bundle. Red is
// reserved for the genuine problem (an unsupported claim); a routine "partial evidence" is calm.
function renderHonestyHtml(v) {
  let cls, msg;
  if (v.unsupported_claim) {
    cls = "fg-flag";
    msg = `⚠ Records PASS but is not self-verifying — ${v.unverifiable_files} of ${v.file_count} listed file(s) carry no recomputable hash, so this pass cannot be fully checked.`;
  } else if (v.self_verifying) {
    cls = "fg-ok";
    msg = `Self-verifying — every one of the ${v.file_count} listed file(s) carries a sha256 you can recompute to prove it wasn't swapped.`;
  } else if (v.file_count === 0) {
    cls = "fg-partial";
    msg = `No hash manifest — this bundle lists no files, so nothing here is independently checkable.`;
  } else {
    cls = "fg-partial";
    msg = `Partial evidence — ${v.unverifiable_files} of ${v.file_count} listed file(s) carry no recomputable hash. Not a claimed pass, so nothing is overstated.`;
  }
  return `  <section aria-readonly="true"><h2>Can this bundle be trusted?</h2><p class="${cls}">${escapeHtml(msg)}</p></section>`;
}

function renderManifestHtml(v) {
  if (v.file_count === 0) {
    return `  <section aria-readonly="true"><h2>File manifest</h2><p class="fg-empty">No files listed — this bundle carries no hash manifest, so nothing in it is independently checkable.</p></section>`;
  }
  const rows = v.manifest.map((m) => [
    `      <li class="fg-file ${m.verifiable ? "fg-file-ok" : "fg-file-bad"}">`,
    `        <div class="fg-file-head"><span class="fg-file-mark">${m.verifiable ? "✓" : "✗"}</span><span class="fg-file-path">${escapeHtml(m.path)}</span><span class="fg-file-size">${escapeHtml(humanBytes(m.bytes))}</span></div>`,
    m.sha256
      ? `        <div class="fg-file-hash">${escapeHtml(m.sha256)}</div>`
      : `        <div class="fg-file-nohash">no hash — this file is listed but cannot be verified</div>`,
    `      </li>`,
  ].join("\n"));
  const total = v.bytes_complete ? humanBytes(v.total_bytes) : `${humanBytes(v.total_bytes)}+ (some sizes unknown)`;
  return [
    `  <section aria-readonly="true">`,
    `    <h2>File manifest</h2>`,
    `    <p class="fg-note">${v.verifiable_files} of ${v.file_count} file(s) carry a recomputable sha256 · ${escapeHtml(total)}. Copy any hash and run <code>shasum -a 256 &lt;file&gt;</code> to check it yourself.</p>`,
    `    <ul class="fg-file-list">`,
    ...rows,
    `    </ul>`,
    `  </section>`,
  ].join("\n");
}

function renderFactsHtml(v) {
  if (v.facts.length === 0) return "";
  const rows = v.facts.map(
    (f) => `      <div class="fg-fact"><span class="fg-fact-k">${escapeHtml(f.key)}</span><span class="fg-fact-v">${escapeHtml(f.value)}</span></div>`
  );
  return [
    `  <section aria-readonly="true">`,
    `    <h2>Recorded facts</h2>`,
    `    <p class="fg-note">What the bundle reported about itself. These are self-reported claims — the manifest above, not this list, is what makes them checkable.</p>`,
    `    <div class="fg-fact-grid">`,
    ...rows,
    `    </div>`,
    `  </section>`,
  ].join("\n");
}

function renderObservedHtml(v) {
  const parts = [];
  if (v.timeline.length) {
    const steps = v.timeline.map((t, i) => `      <li><span class="fg-step-n">${i + 1}</span>${escapeHtml(t)}</li>`);
    parts.push(`    <h3>Steps the run took</h3>`, `    <ol class="fg-timeline">`, ...steps, `    </ol>`);
  }
  if (v.screenshots.length) {
    const shots = v.screenshots.map((s) => `      <li>${escapeHtml(s)}</li>`);
    parts.push(
      `    <h3>Screenshots (${v.screenshots.length})</h3>`,
      `    <p class="fg-note">Names only — the viewer lists what was captured; it does not embed or open images.</p>`,
      `    <ul class="fg-shot-list">`, ...shots, `    </ul>`
    );
  }
  const chips = [];
  if (v.counts.console !== null) chips.push(`<span class="fg-chip">console ${v.counts.console}</span>`);
  if (v.counts.network !== null) chips.push(`<span class="fg-chip">network ${v.counts.network}</span>`);
  if (v.counts.page_errors !== null) chips.push(`<span class="fg-chip ${v.counts.page_errors > 0 ? "fg-chip-warn" : ""}">page errors ${v.counts.page_errors}</span>`);
  if (chips.length) parts.push(`    <h3>Observed counts</h3>`, `    <div class="fg-chips">${chips.join("")}</div>`);
  if (parts.length === 0) return "";
  return [`  <section aria-readonly="true">`, `    <h2>What the run did</h2>`, ...parts, `  </section>`].join("\n");
}

// renderViewHtml(descriptor) -> the composed bundle body (honesty banner + manifest + facts +
// observed record) as an HTML fragment. Pure display; no <script>/form/button/input/on*/href.
export function renderViewHtml(descriptor) {
  const v = normalizeView(descriptor);
  return [
    renderHonestyHtml(v),
    renderManifestHtml(v),
    renderFactsHtml(v),
    renderObservedHtml(v),
  ].filter(Boolean).join("\n");
}

// The self-contained style. Inlined so the rendered page is a PORTABLE evidence artifact that
// stands alone, using the shared founder palette for visual kinship. Style only — no behaviour.
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
    h3{font-size:13.5px;margin:16px 0 .3em;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
    .fg-sub{color:var(--muted);margin:0 0 24px}
    .fg-note{color:var(--muted);font-size:12.5px;margin:.1em 0 14px}
    section{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
      padding:18px 20px;margin:0 0 20px}
    .fg-head-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
    .fg-verdict{display:inline-block;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;
      border-radius:999px;padding:1px 8px}
    .fg-verdict-pass{color:var(--green);border:1px solid rgba(34,197,94,.4)}
    .fg-verdict-fail{color:var(--red);border:1px solid rgba(242,109,109,.5)}
    .fg-verdict-running{color:var(--blue);border:1px solid rgba(59,130,246,.4)}
    .fg-verdict-unknown{color:var(--purple);border:1px solid rgba(167,139,250,.4)}
    .fg-bundle-id{font-weight:700;font-size:18px}
    .fg-surface{color:var(--muted);font-size:12.5px}
    .fg-path{color:var(--dim);font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:2px}
    .fg-file-list,.fg-shot-list{list-style:none;margin:0;padding:0}
    .fg-file{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:0 0 8px;background:var(--panel2)}
    .fg-file-ok{border-left:3px solid var(--green)}
    .fg-file-bad{border-left:3px solid var(--red)}
    .fg-file-head{display:flex;align-items:baseline;gap:8px}
    .fg-file-mark{font-weight:700}
    .fg-file-ok .fg-file-mark{color:var(--green)}
    .fg-file-bad .fg-file-mark{color:var(--red)}
    .fg-file-path{font-weight:600;flex:1 1 auto;word-break:break-all}
    .fg-file-size{color:var(--dim);font-size:12px;white-space:nowrap}
    .fg-file-hash{color:var(--muted);font-size:11.5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:4px;word-break:break-all}
    .fg-file-nohash{color:var(--red);font-size:12px;margin-top:4px}
    .fg-fact-grid{display:grid;grid-template-columns:minmax(140px,220px) 1fr;gap:6px 14px}
    .fg-fact{display:contents}
    .fg-fact-k{color:var(--muted);font-size:12.5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .fg-fact-v{font-size:12.5px;word-break:break-word}
    .fg-timeline{margin:0;padding:0 0 0 4px;list-style:none}
    .fg-timeline li{margin:0 0 4px}
    .fg-step-n{display:inline-block;min-width:20px;color:var(--purple);font-weight:600}
    .fg-shot-list li{color:var(--muted);font-size:12.5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .fg-chips{display:flex;flex-wrap:wrap;gap:6px}
    .fg-chip{font-size:11.5px;border-radius:999px;padding:1px 8px;border:1px solid var(--line);color:var(--muted)}
    .fg-chip-warn{color:var(--red);border-color:rgba(242,109,109,.5)}
    .fg-flag{color:var(--red);font-size:13px;margin:0}
    .fg-ok{color:var(--green);font-size:13px;margin:0}
    .fg-partial{color:var(--muted);font-size:13px;margin:0}
    .fg-empty{color:var(--muted)}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--text)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

// renderViewSurfaceHtml(descriptor) -> a COMPLETE, self-contained founder-readable page for ONE
// bundle. Pure: same descriptor in, byte-identical page out (no clock, no randomness). It carries
// NO <script>, <form>, <button>, <input>, on* handler, or navigable link — observably read-only.
export function renderViewSurfaceHtml(descriptor) {
  const v = normalizeView(descriptor);
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>Evidence Viewer — ${escapeHtml(v.id)} — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>Evidence Viewer</h1>`,
    `    <p class="fg-sub">One evidence bundle, read in full — its files and the hashes that make them checkable, what the run did, and what it recorded. This surface only reads the bundle; it runs nothing, opens no file, and acts on nothing.</p>`,
    `    <section aria-readonly="true">`,
    `      <div class="fg-head-row">`,
    `        <span class="fg-verdict fg-verdict-${escapeHtml(v.verdict.toLowerCase())}">${escapeHtml(VERDICT_LABEL[v.verdict])}</span>`,
    `        <span class="fg-bundle-id">${escapeHtml(v.id)}</span>`,
    `      </div>`,
    `      <div class="fg-surface">surface: ${escapeHtml(v.surface)}</div>`,
    v.path ? `      <div class="fg-path">${escapeHtml(v.path)}</div>` : ``,
    `    </section>`,
    renderViewHtml(descriptor),
    `    <p class="fg-foot">Read-only view · this viewer never opens a file, recomputes a hash, or re-runs a bundle — it presents only what the evidence generator read from disk. The act edge stays in VB3.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].filter(Boolean).join("\n");
}

// Re-export the verdict vocabulary so callers can render/label without reaching into the index.
export { VERDICT };
