// FounderGate V8-B VB2 — ANTI-REPEAT ENGINE surface (read-only, NON-EXECUTING).
//
// Plain English: the V8-B completion matrix marks **"Anti-repeat system" = PARTIAL**. What exists on
// disk today is a handful of one-off "anti-repeat" self-tests (e.g.
// `src/tools/launcher-health.selftest.mjs`, whose own header calls itself "anti-repeat for the Run-4
// session defect"). What is MISSING — named in the matrix as **"defect → pattern → regression
// conversion"** — is the thing ROADMAP §4.7 (B6, "Anti-repeat law") actually asks for:
//   *Every bug the founder personally catches becomes a new automated check — the system may be
//    wrong, but never wrong the same way twice.*
//
// This module is the engine that reads ONE defect record and shows its conversion into a regression
// check, together with the ONE honesty that makes an anti-repeat system worth anything — and NOTHING
// ELSE:
//   - `deriveRegressionCheck(defect, opts)` is the ENGINE: a PURE function that reads a
//     caller-supplied defect record and lifts it into a conversion object — the defect, a generalized
//     failure PATTERN derived from the defect's own structure, and the regression CHECK exactly as the
//     record declares it. It never reads disk, never opens a network, never acts, and it NEVER invents
//     a check, a wiring, or a proof the record did not declare.
//   - The render/view functions take a caller-supplied conversion snapshot and RETURN a plain object
//     or a STRING. Same snapshot in → byte-identical page out. No fs, no net, no child_process, no
//     clock, no randomness.
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>, <form>,
//     <button>, <input>, on* handler, or navigable link (<a href>). There is nothing here to AUTHOR a
//     check, WIRE it into a suite, or RUN it. Converting a defect into a wired, proven check is a
//     later, separately-owned act; it is not wired here.
//
// THE HONESTY STANCE — the heart of an anti-repeat system (Law 43: never invent state; B6):
//   - "Never wrong the same way twice" is EARNED, not asserted. A defect is shown as PROTECTED
//     ("never again") ONLY when a regression check is (a) authored, (b) WIRED into a suite that
//     actually runs, and (c) PROVEN to reproduce the defect (it fails on the bug and passes on the
//     fix). Anything less is said out loud: "not yet protected — this defect can recur". Claiming
//     never-again over a check that does not run, or was never seen to catch the bug, is the most
//     seductive anti-repeat lie there is.
//   - A check that is AUTHORED but not WIRED "does not run, so it protects nothing". A check that is
//     WIRED but not PROVEN "may stay green even if the bug returns". Neither is silently upgraded.
//   - The PATTERN is derived from the defect's own structure (area + failure kind + symptom), never
//     from thin air. When the defect gives only a bare symptom with no area/kind, the pattern is
//     "the exact instance only" and the surface warns that a VARIANT of the bug would slip past.
//   - Founder-caught evidence may carry customer/secret data (Founder Evidence law). A defect whose
//     data class is not displayable has its symptom/evidence shown REDACTED — but its protection
//     status (pattern signature, wired, proven) is computed and shown regardless, because whether the
//     bug is caught-again does not depend on whether its raw evidence can be printed.
//   TRUTH LABELLING: the snapshot's `source` ("live" vs "fixture") is carried to the page and never
//   conflated — a founder always knows whether they read a live conversion or a committed sample.

import { UNKNOWN, isDisplayableClass, REDACTED } from "./cto-queue.mjs";

export const ANTI_REPEAT_ENGINE_VERSION = "1.0.0";

// The Anti-repeat law (ROADMAP §4.7 / §14, B6), shown verbatim on the surface.
export const ANTI_REPEAT_LAW =
  "Every bug the founder personally catches becomes a new automated check — the system may be wrong, but never wrong the same way twice.";

// The defect → pattern → regression CONVERSION pipeline (B6). Display/analysis order only — presence
// of each stage is derived from the conversion, never assumed.
export const CONVERSION_STAGES = Object.freeze([
  Object.freeze({ key: "defect", label: "Defect captured — what went wrong, and where" }),
  Object.freeze({ key: "pattern", label: "Failure pattern generalized — the class of bug, not one instance" }),
  Object.freeze({ key: "check", label: "Regression check authored — a test that would catch it" }),
  Object.freeze({ key: "wired", label: "Check wired into a suite that actually runs" }),
  Object.freeze({ key: "proven", label: "Check proven to reproduce the defect (red on the bug, green on the fix)" }),
]);

// A trimmed string, or "" — never a coerced object/number pretending to be text.
function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

// A deterministic, non-cryptographic 32-bit FNV-1a hash rendered as 8 hex chars. Used ONLY as a
// display/grouping SIGNATURE for a failure pattern — it is safe to show even for a redacted defect
// because a hash carries none of the hashed content back. No import, no randomness, no clock.
function fnv1aHex(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // h *= 0x01000193, expressed as shifts to stay in 32-bit unsigned integer math.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8);
}

// normalizeCheck(raw) -> a frozen, honest check view, or null when nothing was authored. WIRED is
// true only when the record says it is registered AND names a home suite; PROVEN is true only when
// the record explicitly says the check reproduces the defect. Neither is ever assumed.
function normalizeCheck(raw) {
  const r = raw && typeof raw === "object" ? raw : null;
  if (!r) return null;
  const id = str(r.id) || null;
  const text = str(r.text) || str(r.assertion) || str(r.check) || str(r.description) || null;
  if (!id && !text) return null; // no check authored at all
  const home = str(r.home) || str(r.suite) || str(r.file) || null;
  const registered = r.registered === true || r.wired === true;
  const wired = registered && !!home; // wired REQUIRES a real home; "registered" with no home is not wired
  const proven = r.reproducesDefect === true || r.proven === true;
  return Object.freeze({
    id,
    text,
    home,
    registered,
    wired,
    proven,
    by: str(r.by) || null,
    at: str(r.at) || null, // inert DATA shown verbatim; never parsed against a clock
    note: str(r.note) || null,
  });
}

// normalizeConversion(conv) -> a frozen, normalized conversion. Idempotent, so both an
// engine-produced object and a raw hand-supplied one flow through the same honest shape (and the same
// data-class redaction). Never mutates the input.
function normalizeConversion(conv) {
  const c = conv && typeof conv === "object" ? conv : {};
  const dataClass = str(c.dataClass) || null;
  // No class declared → treated as displayable (the caller vouched nothing to hide); a declared class
  // is displayable only if it is a permitted display class, else its text is redacted.
  const displayable = dataClass === null ? true : isDisplayableClass(dataClass);
  const show = (v) => {
    const s = str(v);
    if (!s) return null;
    return displayable ? s : REDACTED;
  };

  const area = str(c.area) || null;
  const failureKind = str(c.failureKind) || null;
  const symptomRaw = str(c.symptom);
  const defectId = str(c.defectId) || null;
  const hasDefect = !!(defectId || str(c.title) || symptomRaw || area);

  // The pattern SIGNATURE is derived from the defect's own structure. The symptom is folded in as a
  // one-way hash only, so the signature is safe to display even when the symptom itself is redacted.
  const symptomKey = symptomRaw.toLowerCase().replace(/\s+/g, " ").trim();
  const sigInput = `${(area || "").toLowerCase()}|${(failureKind || "").toLowerCase()}|${symptomKey}`;
  const signature = hasDefect ? fnv1aHex(sigInput) : null;
  // "Generalized" = the pattern rises above one literal instance: it names an area AND a failure kind,
  // so a variant sharing that area+kind is described too. A bare symptom alone is instance-only.
  const generalized = !!area && !!failureKind;

  return Object.freeze({
    defectId,
    title: str(c.title) || defectId || "defect",
    caughtBy: str(c.caughtBy) || null,
    caughtAt: str(c.caughtAt) || null, // inert
    area,
    failureKind,
    symptom: show(symptomRaw),
    evidence: show(c.evidence),
    dataClass,
    displayable,
    pattern: Object.freeze({ signature, area, failureKind, generalized }),
    check: normalizeCheck(c.check),
    mock: typeof c.mock === "boolean" ? c.mock : null,
    hasDefect,
  });
}

// deriveRegressionCheck(defect, opts) -> THE ENGINE. A PURE function that lifts ONE caller-supplied
// defect record into a conversion object (defect + derived pattern + declared check). It reads only
// the object it is given: no fs, no net. It NEVER authors the check itself, NEVER marks it wired or
// proven — those come from the record (via `defect.regressionCheck`/`defect.check` or `opts.check`).
//   opts: { check, mock }
export function deriveRegressionCheck(defect, opts = {}) {
  const d = defect && typeof defect === "object" ? defect : {};
  const check =
    opts.check != null ? opts.check : d.regressionCheck != null ? d.regressionCheck : d.check != null ? d.check : null;
  const mockRaw = opts.mock != null ? opts.mock : d.mock;
  return Object.freeze({
    defectId: str(d.defectId) || str(d.id) || null,
    title: str(d.title) || null,
    caughtBy: str(d.caughtBy) || str(d.reporter) || null,
    caughtAt: str(d.caughtAt) || str(d.at) || null,
    area: str(d.area) || str(d.where) || str(d.component) || null,
    failureKind: str(d.failureKind) || str(d.kind) || null,
    symptom: str(d.symptom) || str(d.text) || null,
    evidence: str(d.evidence) || null,
    dataClass: str(d.dataClass) || str(d.data_class) || null,
    check,
    mock: typeof mockRaw === "boolean" ? mockRaw : null,
  });
}

// deriveAntiRepeatView(snapshot) -> a PURE, frozen analysis view over a caller-supplied snapshot:
//   { source, collectedAt, conversion: <engine-produced or raw> }
// It never mutates the input, never invents a field, and marks every gap out loud.
export function deriveAntiRepeatView(snapshot) {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const source = s.source === "live" ? "live" : s.source === "fixture" ? "fixture" : UNKNOWN;
  const conversion = normalizeConversion(s.conversion != null ? s.conversion : s.card);
  const c = conversion;
  const check = c.check;

  const hasCheck = !!check;
  const wired = !!(check && check.wired);
  const proven = !!(check && check.proven);
  const generalized = c.pattern.generalized;

  // B6: "never wrong the same way twice" is earned. PROTECTED only when the check is authored, wired,
  // and proven. An unproven or unwired check can never be shown as never-again.
  const neverAgain = hasCheck && wired && proven;
  const neverAgainReason = !hasCheck
    ? "no regression check authored — this defect is not converted and can recur"
    : !wired
      ? "regression check authored but not wired into a running suite — it does not run, so it protects nothing"
      : !proven
        ? "regression check wired but not proven to reproduce the defect — it may stay green even if the bug returns"
        : "regression check wired and proven — this exact failure is now caught automatically (the system may still be wrong a new way)";

  // The conversion pipeline, each stage marked present/absent from the conversion ALONE.
  const stagePresent = {
    defect: c.hasDefect,
    pattern: generalized,
    check: hasCheck,
    wired,
    proven,
  };
  const pipeline = CONVERSION_STAGES.map((st) =>
    Object.freeze({ key: st.key, label: st.label, present: !!stagePresent[st.key] })
  );
  const pipelineReadyCount = pipeline.filter((p) => p.present).length;

  // Quality warnings — surfaced, never used to silently pass or fabricate a missing part.
  const warnings = [];
  if (!c.hasDefect) warnings.push("the defect itself is not captured — there is nothing to convert");
  if (c.hasDefect && !generalized)
    warnings.push("the pattern is the exact instance only (no area + failure-kind) — a variant of this bug would slip past");
  if (!hasCheck) warnings.push("no regression check authored — the defect is not converted into an automated check");
  else if (!wired) warnings.push("the regression check is not wired into a running suite — it does not actually run");
  else if (!proven) warnings.push("the regression check is not proven to reproduce the defect (no red→green evidence)");
  if (!c.displayable)
    warnings.push(`defect evidence is ${c.dataClass}-classed and shown redacted — the anti-repeat status is computed regardless`);

  return Object.freeze({
    version: ANTI_REPEAT_ENGINE_VERSION,
    source, // "live" | "fixture" | "UNKNOWN"
    collectedAt: str(s.collectedAt) || null,
    readOnly: true,
    conversion: c,
    hasCheck,
    wired,
    proven,
    generalized,
    neverAgain,
    neverAgainReason,
    pipeline: Object.freeze(pipeline),
    pipelineReadyCount,
    pipelineTotal: CONVERSION_STAGES.length,
    warnings: Object.freeze(warnings),
    warningCount: warnings.length,
    law: ANTI_REPEAT_LAW,
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

const SOURCE_LABEL = Object.freeze({
  live: "Live conversion",
  fixture: "Fixture (committed sample — not live)",
  [UNKNOWN]: "Unknown source",
});

// ── Plain-text rendering (terminal/log + tests that assert content without HTML) ─────────────

// renderAntiRepeatText(snapshot) -> founder-readable plain text of the whole conversion. Pure.
export function renderAntiRepeatText(snapshot) {
  const v = deriveAntiRepeatView(snapshot);
  const c = v.conversion;
  const lines = [
    `ANTI-REPEAT — read-only; shows whether a caught bug became a wired, proven check. Converts nothing.`,
    `Law: ${v.law}`,
    `Source: ${SOURCE_LABEL[v.source]}`,
  ];
  if (v.collectedAt) lines.push(`Collected at: ${v.collectedAt}`);
  lines.push("");

  // HEADER + THE VERDICT.
  lines.push(`${c.title}${c.mock === true ? "  (MOCK — a placeholder, not a real defect)" : ""}`);
  if (c.defectId) lines.push(`  Defect: ${c.defectId}`);
  lines.push(`  Caught by: ${c.caughtBy || "(not recorded)"}${c.caughtAt ? `  at ${c.caughtAt}` : ""}`);
  lines.push(`  Verdict: ${v.neverAgain ? "PROTECTED — never again" : "NOT YET PROTECTED — can recur"}`);
  lines.push(`  Why: ${v.neverAgainReason}`);
  lines.push("");

  // 1) THE DEFECT.
  lines.push(`WHAT WENT WRONG (the defect)`);
  lines.push(`  Symptom: ${c.symptom || "(not captured)"}`);
  lines.push(`  Where: ${c.area || "(area not recorded)"}`);
  lines.push(`  Kind: ${c.failureKind || "(failure kind not recorded)"}`);
  if (c.evidence) lines.push(`  Evidence: ${c.evidence}`);
  if (!c.displayable) lines.push(`  (evidence is ${c.dataClass}-classed — shown redacted)`);
  lines.push("");

  // 2) THE PATTERN.
  lines.push(`THE FAILURE PATTERN`);
  lines.push(`  Signature: ${c.pattern.signature || "(no defect to derive a pattern from)"}`);
  lines.push(
    `  ${c.pattern.generalized ? "Generalized — names an area and a failure kind, so variants are described" : "Exact instance only — a variant of this bug would slip past a check that matches it literally"}`
  );
  lines.push("");

  // 3) THE REGRESSION CHECK.
  lines.push(`THE REGRESSION CHECK`);
  if (!v.hasCheck) {
    lines.push(`  (no regression check authored — the defect is not converted into an automated check)`);
  } else {
    if (c.check.id) lines.push(`  Check: ${c.check.id}`);
    if (c.check.text) lines.push(`  Asserts: ${c.check.text}`);
    lines.push(`  Home: ${c.check.home || "(no home suite named — not wired)"}`);
    lines.push(`  Wired (actually runs): ${v.wired ? "yes" : "NO"}`);
    lines.push(`  Proven (reproduces the defect): ${v.proven ? "yes" : "NO"}`);
    if (c.check.by || c.check.at) lines.push(`  ${c.check.by ? `by ${c.check.by}` : ""}${c.check.at ? `  at ${c.check.at}` : ""}`.trimEnd());
  }
  lines.push("");

  // PIPELINE.
  lines.push(`DEFECT → PATTERN → REGRESSION PIPELINE (${v.pipelineReadyCount}/${v.pipelineTotal} stages present)`);
  for (const p of v.pipeline) lines.push(`  [${p.present ? "x" : " "}] ${p.label}`);
  lines.push("");

  // WARNINGS.
  if (v.warnings.length) {
    lines.push(`OPEN CONCERNS`);
    for (const w of v.warnings) lines.push(`  ! ${w}`);
  }
  return lines.join("\n").replace(/\n+$/, "");
}

// ── HTML rendering (pure display; no behaviour) ──────────────────────────────────────────────

function chip(text, tone) {
  return `<span class="fg-chip fg-tone-${escapeHtml(tone)}">${escapeHtml(text)}</span>`;
}

function renderHeaderHtml(v) {
  const c = v.conversion;
  const chips = [
    chip(v.neverAgain ? "protected — never again" : "not yet protected", v.neverAgain ? "ok" : "warn"),
  ];
  if (c.caughtBy) chips.push(chip(`caught by ${c.caughtBy}`, "info"));
  if (!c.displayable) chips.push(chip(`${c.dataClass} — evidence redacted`, "warn"));
  if (c.mock === true) chips.push(chip("mock — placeholder, not a real defect", "warn"));
  return [
    `  <section class="fg-header" aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>${escapeHtml(c.title)}</h2>${chips.join("")}</div>`,
    c.defectId ? `    <p class="fg-meta">Defect <code>${escapeHtml(c.defectId)}</code>${c.caughtAt ? ` · caught at ${escapeHtml(c.caughtAt)}` : ""}</p>` : ``,
    `    <p class="fg-note fg-${v.neverAgain ? "ok" : "warn"}"><strong>${escapeHtml(v.neverAgainReason)}</strong></p>`,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

function renderDefectHtml(v) {
  const c = v.conversion;
  return [
    `  <section aria-readonly="true">`,
    `    <h2>What went wrong</h2>`,
    `    <p class="fg-note">The defect as caught. Shown verbatim; nothing is added.${c.displayable ? "" : " Evidence is redacted by data class."}</p>`,
    c.symptom
      ? `    <p class="fg-body">${escapeHtml(c.symptom)}</p>`
      : `    <p class="fg-empty">Symptom not captured — it is not on record.</p>`,
    `    <p class="fg-meta">Where: ${c.area ? escapeHtml(c.area) : "(not recorded)"} · Kind: ${c.failureKind ? escapeHtml(c.failureKind) : "(not recorded)"}</p>`,
    c.evidence ? `    <p class="fg-meta">Evidence: ${escapeHtml(c.evidence)}</p>` : ``,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

function renderPatternHtml(v) {
  const c = v.conversion;
  return [
    `  <section aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>The failure pattern</h2>${chip(c.pattern.generalized ? "generalized" : "exact instance only", c.pattern.generalized ? "ok" : "warn")}</div>`,
    `    <p class="fg-note">Derived from the defect's own structure (area · failure kind · symptom). The signature is a one-way hash — safe to show even when the symptom is redacted.</p>`,
    c.pattern.signature
      ? `    <p class="fg-meta">Signature: <code>${escapeHtml(c.pattern.signature)}</code></p>`
      : `    <p class="fg-empty">No defect on record — no pattern to derive.</p>`,
    `    <p class="fg-note${c.pattern.generalized ? "" : " fg-warn"}">${escapeHtml(c.pattern.generalized ? "Names an area and a failure kind — a variant sharing them is described, not just this one instance." : "Exact instance only — a variant of this bug would slip past a check that matches it literally. It is not generalized here.")}</p>`,
    `  </section>`,
  ].join("\n");
}

function renderCheckHtml(v) {
  const c = v.conversion;
  if (!v.hasCheck) {
    return [
      `  <section aria-readonly="true">`,
      `    <h2>The regression check</h2>`,
      `    <p class="fg-empty">No regression check authored — this defect is not converted into an automated check. It is not invented.</p>`,
      `  </section>`,
    ].join("\n");
  }
  const ck = c.check;
  return [
    `  <section aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>The regression check</h2>${chip(v.wired ? "wired" : "not wired", v.wired ? "ok" : "warn")}${chip(v.proven ? "proven" : "not proven", v.proven ? "ok" : "warn")}</div>`,
    ck.id ? `    <p class="fg-meta">Check <code>${escapeHtml(ck.id)}</code></p>` : ``,
    ck.text ? `    <p class="fg-body">${escapeHtml(ck.text)}</p>` : ``,
    `    <p class="fg-note">Home: ${ck.home ? `<code>${escapeHtml(ck.home)}</code>` : "<span class=\"fg-warn\">no home suite named — not wired</span>"}</p>`,
    `    <p class="fg-note${v.wired ? "" : " fg-warn"}">Wired (actually runs): <strong>${v.wired ? "yes" : "no — it does not run, so it protects nothing"}</strong></p>`,
    `    <p class="fg-note${v.proven ? "" : " fg-warn"}">Proven (reproduces the defect): <strong>${v.proven ? "yes" : "no — it may stay green even if the bug returns"}</strong></p>`,
    ck.by || ck.at ? `    <p class="fg-meta">${ck.by ? `by ${escapeHtml(ck.by)}` : ""}${ck.at ? ` · at ${escapeHtml(ck.at)}` : ""}${ck.note ? ` · ${escapeHtml(ck.note)}` : ""}</p>` : ``,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

function renderPipelineHtml(v) {
  const rows = v.pipeline.map(
    (p) =>
      `      <li class="fg-stage fg-stage-${p.present ? "on" : "off"}"><span class="fg-stage-mark">${p.present ? "✓" : "—"}</span><span>${escapeHtml(p.label)}</span></li>`
  );
  return [
    `  <section aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>Defect → pattern → regression pipeline</h2>${chip(`${v.pipelineReadyCount} of ${v.pipelineTotal} present`, v.pipelineReadyCount === v.pipelineTotal ? "ok" : "warn")}</div>`,
    `    <p class="fg-note">Each stage is marked present or absent from the conversion alone; a missing stage is shown, never assumed done.</p>`,
    `    <ul class="fg-stages">`,
    ...rows,
    `    </ul>`,
    `  </section>`,
  ].join("\n");
}

function renderWarningsHtml(v) {
  if (!v.warnings.length) return "";
  return [
    `  <section aria-readonly="true">`,
    `    <h2>Open concerns</h2>`,
    `    <ul class="fg-list fg-warn-list">`,
    ...v.warnings.map((w) => `      <li>${escapeHtml(w)}</li>`),
    `    </ul>`,
    `  </section>`,
  ].join("\n");
}

// renderAntiRepeatHtml(snapshot) -> the composed body as an HTML fragment. Pure display; no
// <script>/form/button/input/on*/href.
export function renderAntiRepeatHtml(snapshot) {
  const v = deriveAntiRepeatView(snapshot);
  return [
    renderHeaderHtml(v),
    renderDefectHtml(v),
    renderPatternHtml(v),
    renderCheckHtml(v),
    renderPipelineHtml(v),
    renderWarningsHtml(v),
  ].filter(Boolean).join("\n");
}

// The self-contained style. Inlined so the rendered page is a PORTABLE evidence artifact that stands
// alone, using the shared founder palette for visual kinship with the sibling VB2 surfaces. Style
// only — no behaviour. Colour law: green is EARNED (a wired, proven check); amber is any gap that
// leaves the defect able to recur (no check / not wired / not proven / instance-only pattern).
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
    h2{font-size:16px;margin:0 0 4px}
    .fg-sub{color:var(--muted);margin:0 0 24px}
    .fg-law{color:var(--text);background:var(--panel2);border:1px solid var(--line);border-left:3px solid var(--purple);
      border-radius:8px;padding:10px 14px;margin:0 0 20px;font-style:italic}
    .fg-note{color:var(--muted);font-size:12.5px;margin:.4em 0 0}
    .fg-note strong{color:var(--text)}
    .fg-note.fg-warn,.fg-warn{color:var(--amber)}
    .fg-note.fg-ok,.fg-ok{color:var(--green)}
    .fg-meta{color:var(--dim);font-size:12px;margin:.3em 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .fg-body{margin:.5em 0 0}
    section{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
      padding:18px 20px;margin:0 0 20px}
    .fg-head-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
    .fg-chip{font-size:11.5px;border-radius:999px;padding:1px 9px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
    .fg-tone-ok{color:var(--green);border-color:rgba(34,197,94,.4)}
    .fg-tone-bad{color:var(--red);border-color:rgba(242,109,109,.5)}
    .fg-tone-warn{color:var(--amber);border-color:rgba(245,184,61,.45)}
    .fg-tone-info{color:var(--blue);border-color:rgba(59,130,246,.4)}
    .fg-tone-muted{color:var(--muted)}
    .fg-list{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
    .fg-list li{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:9px 13px}
    .fg-warn-list li{border-color:rgba(245,184,61,.35)}
    .fg-empty{color:var(--muted);margin:.5em 0 0}
    .fg-stages{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
    .fg-stage{display:flex;align-items:center;gap:12px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:9px 13px}
    .fg-stage-mark{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;width:1.2em;text-align:center}
    .fg-stage-on{border-color:rgba(34,197,94,.35)}
    .fg-stage-on .fg-stage-mark{color:var(--green)}
    .fg-stage-off{opacity:.7}
    .fg-stage-off .fg-stage-mark{color:var(--amber)}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--text)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

// renderSurfaceHtml(snapshot) -> a COMPLETE, self-contained founder-readable page. Pure: same
// snapshot in, byte-identical page out (no clock, no randomness). It carries NO <script>, <form>,
// <button>, <input>, on* handler, or navigable link (<a href>) — observably read-only.
export function renderSurfaceHtml(snapshot) {
  const v = deriveAntiRepeatView(snapshot);
  const srcTone = v.source === "live" ? "info" : v.source === "fixture" ? "muted" : "warn";
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>Anti-repeat — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>Anti-repeat</h1>`,
    `    <p class="fg-sub">Did a caught bug become an automated check that will catch it again? A defect is shown as <em>protected — never again</em> only when a regression check is authored, wired into a suite that actually runs, and proven to reproduce the defect. Anything less is said out loud as <em>not yet protected — can recur</em>; a missing part is never invented. This surface only shows the conversion; it authors, wires, and runs nothing.</p>`,
    `    <p class="fg-law">${escapeHtml(v.law)}</p>`,
    `    <div class="fg-head-row">${chip(SOURCE_LABEL[v.source], srcTone)}${v.collectedAt ? `<span class="fg-meta">collected ${escapeHtml(v.collectedAt)}</span>` : ""}</div>`,
    renderAntiRepeatHtml(snapshot),
    `    <p class="fg-foot">Read-only view · never-again is earned by a wired, proven check, never asserted · a missing pattern/check/proof is never invented · authoring and wiring a check is a later, separately-owned act, not wired here.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

// renderSurfaceText(snapshot) -> plain-text dedicated surface. Pure. Convenience alias so callers
// have a symmetric {Html,Text} pair like the other VB2 surfaces.
export function renderSurfaceText(snapshot) {
  return renderAntiRepeatText(snapshot);
}
