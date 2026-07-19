// FounderGate V8-B VB2 — LICENSE / IP REGISTER surface (read-only, NON-EXECUTING).
//
// Plain English: the V8-B acceptance list names a **"Minimal License/IP register" (C15)** —
// dependencies, copied code, worker outputs, and their license constraints, recorded so a founder can
// see whether the project is clear to make a commercial or pilot claim. ROADMAP §6.11 gives the
// concrete artifact (`.foundergate/license_ip_register.json`) and its minimum fields; **Law 66** is the
// doctrine:
//   *Any open-source worker, copied component, or AI tool used by FounderGate must enter the
//    License/IP Register before real use. Unknown license/IP risk blocks commercial/pilot claims.
//    Human legal review is required for high-risk or unclear licenses. The register is a concrete
//    .foundergate/license_ip_register.json artifact, not just a policy.*
//
// This module is the engine that reads ONE register snapshot and shows, per entry and rolled up, the
// ONE honesty that makes a license/IP register worth anything — and NOTHING ELSE:
//   - `deriveEntryVerdict(entry)` is the per-item ENGINE: a PURE function that reads a caller-supplied
//     register entry (the §6.11 fields) and returns its normalized shape PLUS an honest clearance
//     verdict — cleared, or the exact list of reasons it blocks a commercial/pilot claim. It never
//     reads disk, never opens a network, never acts, and it NEVER invents a license, a status, or a
//     risk the record did not declare.
//   - `deriveRegisterView(snapshot)` rolls the per-entry verdicts up into the register-level clearance.
//   - The render/view functions take a caller-supplied snapshot and RETURN a plain object or a STRING.
//     Same snapshot in → byte-identical page out. No fs, no net, no child_process, no clock, no
//     randomness.
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>, <form>,
//     <button>, <input>, on* handler, or navigable link (<a href>). There is nothing here to ADD an
//     entry, MARK one reviewed/approved, or ADVANCE a release label. Reviewing a component, approving
//     it, or writing the register file is a later, separately-owned act; it is not wired here.
//
// THE HONESTY STANCE — the heart of a license/IP register (Law 66; Law 54 "never invent state"):
//   - A commercial/pilot claim is CLEAR only when EVERY recorded entry is cleared: license known,
//     commercial use confirmed allowed, copyleft/redistribution risk neither high nor unknown, status
//     APPROVED, and reviewed (a reviewer_source AND a date_reviewed on record). A SINGLE unknown or
//     high-risk or unreviewed entry BLOCKS the whole claim — "unknown license/IP risk blocks
//     commercial/pilot claims" is not a caution, it is a stop.
//   - UNKNOWN is never guessed toward "permissive". A missing/unrecognized license → license unknown;
//     a missing/unrecognized risk → risk "unknown"; a missing/unrecognized status → UNKNOWN. Each is
//     said out loud, and each blocks. The register never upgrades a gap into an approval.
//   - An EMPTY register does NOT mean "all clear". It means nothing is recorded — and any open-source
//     worker, copied component, or AI tool actually in use is then UNREGISTERED, in breach of Law 66.
//     The surface calls this "unsubstantiated", never "clear".
//   - High copyleft risk or an unclear/unknown license flags "human legal review required" — surfaced
//     regardless, because that decision is a human's, never the harness's.
//   - A register entry may itself carry proprietary terms (Founder Evidence law). An entry whose data
//     class is not displayable has its free-text terms shown REDACTED — but its clearance verdict
//     (license known, risk, reviewed, status) is computed and shown regardless, because whether a
//     component clears a commercial claim does not depend on whether its raw terms can be printed.
//   TRUTH LABELLING: the snapshot's `source` ("live" vs "fixture") is carried to the page and never
//   conflated — a founder always knows whether they read the live register or a committed sample.

import { UNKNOWN, isDisplayableClass, REDACTED } from "./cto-queue.mjs";

export const LICENSE_IP_REGISTER_VERSION = "1.0.0";

// The License/IP Register law (ROADMAP §6.11 / §14, Law 66), shown verbatim on the surface.
export const LICENSE_IP_REGISTER_LAW =
  "Any open-source worker, copied component, or AI tool used by FounderGate must enter the License/IP Register before real use. Unknown license/IP risk blocks commercial/pilot claims. Human legal review is required for high-risk or unclear licenses. The register is a concrete .foundergate/license_ip_register.json artifact, not just a policy.";

// The §6.11 status enum. UNKNOWN is the honest default when the record does not declare a status
// (Law 54) — never silently upgraded to APPROVED.
export const ENTRY_STATUS = Object.freeze(["APPROVED", "WARN", "BLOCKED", UNKNOWN]);

// The §6.11 risk vocabulary (copyleft_risk / redistribution_risk). "unknown" is a real risk level, not
// an absence — an unknown risk blocks a commercial/pilot claim.
export const RISK_LEVELS = Object.freeze(["none", "low", "medium", "high", "unknown"]);

// The §6.11 "copied_code_or_adapter_only" vocabulary — how the component is used.
export const COMPONENT_KINDS = Object.freeze(["adapter", "copied", "subprocess", "none"]);

// Register-level clearance for a commercial/pilot claim, derived from the entries alone.
export const CLEARANCE = Object.freeze(["clear", "blocked", "unsubstantiated"]);

// A trimmed string, or "" — never a coerced object/number pretending to be text.
function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

// Tri-state boolean: only an explicit true/false counts; anything else is unknown (null). A missing
// commercial_use_allowed is NOT "false" and NOT "true" — it is unknown, and unknown blocks.
function triBool(v) {
  return v === true ? true : v === false ? false : null;
}

// Normalize a declared risk to one of RISK_LEVELS. A missing or unrecognized value → "unknown" — never
// guessed toward "none".
function riskLevel(v) {
  const s = str(v).toLowerCase();
  return RISK_LEVELS.includes(s) ? s : "unknown";
}

// Normalize a declared status to the §6.11 enum. Missing/unrecognized → UNKNOWN (Law 54).
function normStatus(v) {
  const s = str(v).toUpperCase();
  return ENTRY_STATUS.includes(s) ? s : UNKNOWN;
}

// Normalize the component-usage kind, or null when the record does not declare it.
function normKind(v) {
  const s = str(v).toLowerCase();
  return COMPONENT_KINDS.includes(s) ? s : null;
}

// Is a license string an actual, known license — as opposed to absent or self-declared "unknown"?
function licenseIsKnown(license) {
  const s = str(license);
  if (!s) return false;
  return !/^(unknown|unlicensed|n\/?a|tbd|\?+)$/i.test(s);
}

// deriveEntryVerdict(entry) -> THE PER-ITEM ENGINE. A PURE function that reads ONE caller-supplied
// register entry (the §6.11 minimum fields) and returns its normalized shape PLUS an honest clearance
// verdict. It reads only the object it is given: no fs, no net. It NEVER approves the entry, NEVER
// invents a license/status/risk, and NEVER upgrades a gap into a clearance. Idempotent: an
// already-normalized entry flows through the same honest shape (and the same redaction).
export function deriveEntryVerdict(entry) {
  const e = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};

  const dataClass = str(e.dataClass) || str(e.data_class) || null;
  // No class declared → displayable (the caller vouched nothing to hide); a declared class is
  // displayable only if it is a permitted display class, else its free-text terms are redacted.
  const displayable = dataClass === null ? true : isDisplayableClass(dataClass);
  const show = (v) => {
    const s = str(v);
    if (!s) return null;
    return displayable ? s : REDACTED;
  };

  const packageName = str(e.package_name) || str(e.packageName) || str(e.name) || null;
  const version = str(e.version) || null;
  const license = str(e.license) || null;
  const licenseKnown = licenseIsKnown(license);

  const commercialUse = triBool(
    e.commercial_use_allowed != null ? e.commercial_use_allowed : e.commercialUseAllowed != null ? e.commercialUseAllowed : e.commercialUse
  );
  const componentKind = normKind(e.copied_code_or_adapter_only != null ? e.copied_code_or_adapter_only : e.componentKind);
  const attributionRequired = (e.attribution_required != null ? e.attribution_required : e.attributionRequired) === true;
  const copyleftRisk = riskLevel(e.copyleft_risk != null ? e.copyleft_risk : e.copyleftRisk);
  const redistributionRisk = riskLevel(e.redistribution_risk != null ? e.redistribution_risk : e.redistributionRisk);
  const humanLegalReviewRequired =
    (e.human_legal_review_required != null ? e.human_legal_review_required : e.humanLegalReviewRequired) === true;
  const status = normStatus(e.status);
  const dateReviewed = str(e.date_reviewed) || str(e.dateReviewed) || null; // inert DATA; never parsed against a clock
  const reviewerSource = str(e.reviewer_source) || str(e.reviewerSource) || null;
  const reviewed = !!dateReviewed && !!reviewerSource;

  // ── The honest clearance verdict: the EXACT reasons this entry blocks a commercial/pilot claim ──
  const blockingReasons = [];
  if (!packageName) blockingReasons.push("the entry names no package/component — there is nothing identifiable to clear");
  if (!licenseKnown)
    blockingReasons.push("the license is unknown — an unknown license/IP risk blocks commercial/pilot claims (Law 66)");
  if (commercialUse !== true)
    blockingReasons.push(
      commercialUse === false
        ? "commercial use is declared NOT allowed for this component"
        : "commercial use is not confirmed allowed (unknown) — unknown license/IP risk blocks the claim"
    );
  if (copyleftRisk === "high")
    blockingReasons.push("copyleft risk is high — source-disclosure/redistribution obligations; human legal review required");
  else if (copyleftRisk === "unknown")
    blockingReasons.push("copyleft risk is unknown — unknown license/IP risk blocks commercial/pilot claims");
  if (redistributionRisk === "high") blockingReasons.push("redistribution risk is high");
  else if (redistributionRisk === "unknown")
    blockingReasons.push("redistribution risk is unknown — unknown license/IP risk blocks commercial/pilot claims");
  if (status !== "APPROVED")
    blockingReasons.push(
      status === "BLOCKED"
        ? "status is BLOCKED — the reviewer stopped this component"
        : status === "WARN"
          ? "status is WARN — flagged for caution, not cleared for a commercial/pilot claim"
          : "status is UNKNOWN — no clearance is on record (never assume APPROVED)"
    );
  if (!reviewed)
    blockingReasons.push(
      "not reviewed — no reviewer_source and/or date_reviewed on record; it has not cleared review before real use (Law 66)"
    );

  const cleared = blockingReasons.length === 0;
  const blocking = !cleared;

  // Human legal review is a human's call, surfaced whenever the license is high-copyleft or unclear.
  const needsLegalReview = humanLegalReviewRequired || copyleftRisk === "high" || !licenseKnown;

  // Non-blocking OBLIGATIONS the founder still carries even for a cleared component.
  const obligations = [];
  if (attributionRequired) obligations.push("attribution required — the license notice must be preserved in distributions");
  if (copyleftRisk === "low" || copyleftRisk === "medium")
    obligations.push(`copyleft risk ${copyleftRisk} — file/library-level source or notice obligations may apply on redistribution`);
  const modelProviderTerms = str(e.model_provider_terms) || str(e.modelProviderTerms) || null;
  if (modelProviderTerms && !/^n\/?a$/i.test(modelProviderTerms))
    obligations.push("AI model/provider output terms apply — see model_provider_terms");

  return Object.freeze({
    packageName,
    sourceRepoVendor: show(e.source_repo_vendor != null ? e.source_repo_vendor : e.sourceRepoVendor),
    version,
    license,
    licenseKnown,
    commercialUse,
    componentKind,
    attributionRequired,
    copyleftRisk,
    redistributionRisk,
    outputTerms: show(e.output_terms != null ? e.output_terms : e.outputTerms),
    modelProviderTerms: displayable ? modelProviderTerms : modelProviderTerms ? REDACTED : null,
    humanLegalReviewRequired,
    status,
    reviewed,
    dateReviewed,
    reviewerSource: show(reviewerSource),
    dataClass,
    displayable,
    cleared,
    blocking,
    blockingReasons: Object.freeze(blockingReasons),
    needsLegalReview,
    obligations: Object.freeze(obligations),
  });
}

// deriveRegisterView(snapshot) -> a PURE, frozen analysis view over a caller-supplied snapshot:
//   { source, collectedAt, register: { entries: [...] } }   (also accepts snapshot.entries directly)
// It never mutates the input, never invents an entry, and rolls the per-entry verdicts up into an
// honest register-level clearance — where a SINGLE blocking entry blocks the whole commercial claim.
export function deriveRegisterView(snapshot) {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const source = s.source === "live" ? "live" : s.source === "fixture" ? "fixture" : UNKNOWN;

  const rawEntries = Array.isArray(s.entries)
    ? s.entries
    : s.register && Array.isArray(s.register.entries)
      ? s.register.entries
      : Array.isArray(s.register)
        ? s.register
        : [];

  const entries = rawEntries.map(deriveEntryVerdict);
  const total = entries.length;
  const blocking = entries.filter((e) => e.blocking);
  const cleared = entries.filter((e) => e.cleared);
  const legalReview = entries.filter((e) => e.needsLegalReview);
  const redacted = entries.filter((e) => !e.displayable);

  const byStatus = { APPROVED: 0, WARN: 0, BLOCKED: 0, [UNKNOWN]: 0 };
  for (const e of entries) byStatus[e.status] = (byStatus[e.status] || 0) + 1;

  // Register-level clearance. An empty register is "unsubstantiated" — NOT "clear": nothing is
  // recorded, so it substantiates no commercial/pilot claim (Law 66). One blocking entry → "blocked".
  const clearance = total === 0 ? "unsubstantiated" : blocking.length > 0 ? "blocked" : "clear";
  const commercialClaimClear = clearance === "clear";

  const warnings = [];
  if (total === 0)
    warnings.push(
      "the register is empty — nothing is recorded. An empty register does not clear commercial use; any open-source worker, copied component, or AI tool actually in use is then UNREGISTERED, in breach of Law 66."
    );
  if (blocking.length > 0)
    warnings.push(
      `${blocking.length} of ${total} entr${blocking.length === 1 ? "y blocks" : "ies block"} a commercial/pilot claim — unknown or high license/IP risk, or not yet reviewed. One blocking entry blocks the whole claim.`
    );
  if (legalReview.length > 0)
    warnings.push(
      `${legalReview.length} entr${legalReview.length === 1 ? "y requires" : "ies require"} human legal review (high-risk or unclear license) — that decision is a human's, not the harness's.`
    );
  if (redacted.length > 0)
    warnings.push(
      `${redacted.length} entr${redacted.length === 1 ? "y has" : "ies have"} non-displayable terms shown redacted — the clearance verdict is computed regardless.`
    );

  return Object.freeze({
    version: LICENSE_IP_REGISTER_VERSION,
    source, // "live" | "fixture" | "UNKNOWN"
    collectedAt: str(s.collectedAt) || null,
    readOnly: true,
    entries: Object.freeze(entries),
    total,
    clearedCount: cleared.length,
    blockingCount: blocking.length,
    legalReviewCount: legalReview.length,
    redactedCount: redacted.length,
    byStatus: Object.freeze(byStatus),
    clearance, // "clear" | "blocked" | "unsubstantiated"
    commercialClaimClear,
    warnings: Object.freeze(warnings),
    warningCount: warnings.length,
    law: LICENSE_IP_REGISTER_LAW,
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
  live: "Live register",
  fixture: "Fixture (committed sample — not live)",
  [UNKNOWN]: "Unknown source",
});

const CLEARANCE_LABEL = Object.freeze({
  clear: "CLEAR — no license/IP risk blocks a commercial/pilot claim",
  blocked: "BLOCKED — license/IP risk blocks a commercial/pilot claim",
  unsubstantiated: "UNSUBSTANTIATED — nothing recorded; no claim is cleared",
});

const STATUS_TONE = Object.freeze({ APPROVED: "ok", WARN: "warn", BLOCKED: "bad", [UNKNOWN]: "warn" });

function riskDisplay(level) {
  return level === "none" ? "none" : level === "unknown" ? "unknown" : level;
}
function riskTone(level) {
  return level === "none" || level === "low" ? "ok" : level === "medium" ? "warn" : level === "high" ? "bad" : "warn";
}

// ── Plain-text rendering (terminal/log + tests that assert content without HTML) ─────────────

// renderRegisterText(snapshot) -> founder-readable plain text of the whole register. Pure.
export function renderRegisterText(snapshot) {
  const v = deriveRegisterView(snapshot);
  const lines = [
    `LICENSE / IP REGISTER — read-only; shows whether recorded components clear a commercial/pilot claim. Approves nothing.`,
    `Law: ${v.law}`,
    `Source: ${SOURCE_LABEL[v.source]}`,
  ];
  if (v.collectedAt) lines.push(`Collected at: ${v.collectedAt}`);
  lines.push("");

  // THE VERDICT (roll-up).
  lines.push(`COMMERCIAL / PILOT CLAIM: ${CLEARANCE_LABEL[v.clearance]}`);
  lines.push(
    `  Entries: ${v.total}  ·  cleared: ${v.clearedCount}  ·  blocking: ${v.blockingCount}  ·  need legal review: ${v.legalReviewCount}`
  );
  lines.push(
    `  By status: APPROVED ${v.byStatus.APPROVED} · WARN ${v.byStatus.WARN} · BLOCKED ${v.byStatus.BLOCKED} · UNKNOWN ${v.byStatus[UNKNOWN]}`
  );
  lines.push("");

  // THE ENTRIES.
  if (v.total === 0) {
    lines.push(`(the register is empty — nothing is recorded)`);
  } else {
    lines.push(`RECORDED COMPONENTS`);
    for (const e of v.entries) {
      lines.push("");
      lines.push(`  • ${e.packageName || "(unnamed component)"}${e.version ? ` @ ${e.version}` : ""}  [${e.cleared ? "CLEARED" : "BLOCKS CLAIM"}]`);
      if (e.sourceRepoVendor) lines.push(`    Vendor/source: ${e.sourceRepoVendor}`);
      lines.push(`    License: ${e.license || "(none recorded)"}${e.licenseKnown ? "" : "  (UNKNOWN — blocks)"}`);
      lines.push(
        `    Commercial use allowed: ${e.commercialUse === true ? "yes" : e.commercialUse === false ? "NO" : "unknown"}`
      );
      lines.push(`    Copyleft risk: ${riskDisplay(e.copyleftRisk)}  ·  Redistribution risk: ${riskDisplay(e.redistributionRisk)}`);
      lines.push(`    Used as: ${e.componentKind || "(not recorded)"}${e.attributionRequired ? "  ·  attribution required" : ""}`);
      lines.push(`    Status: ${e.status}  ·  Reviewed: ${e.reviewed || (e.dateReviewed && e.reviewerSource) ? "yes" : "NO"}${e.dateReviewed ? `  (${e.dateReviewed}${e.reviewerSource ? `, ${e.reviewerSource}` : ""})` : ""}`);
      if (e.needsLegalReview) lines.push(`    ! Human legal review required`);
      if (!e.displayable) lines.push(`    (terms are ${e.dataClass}-classed — shown redacted; verdict computed regardless)`);
      if (e.outputTerms) lines.push(`    Output terms: ${e.outputTerms}`);
      if (e.modelProviderTerms) lines.push(`    Model/provider terms: ${e.modelProviderTerms}`);
      for (const o of e.obligations) lines.push(`    - ${o}`);
      if (e.blocking) {
        lines.push(`    Why it blocks the claim:`);
        for (const r of e.blockingReasons) lines.push(`      · ${r}`);
      }
    }
  }
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
  const tone = v.clearance === "clear" ? "ok" : "warn";
  const chips = [
    chip(v.clearance === "clear" ? "commercial/pilot: clear" : v.clearance === "blocked" ? "commercial/pilot: blocked" : "commercial/pilot: unsubstantiated", tone),
    chip(`${v.total} entr${v.total === 1 ? "y" : "ies"}`, "info"),
  ];
  if (v.blockingCount > 0) chips.push(chip(`${v.blockingCount} blocking`, "warn"));
  if (v.legalReviewCount > 0) chips.push(chip(`${v.legalReviewCount} need legal review`, "warn"));
  return [
    `  <section class="fg-header" aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>Commercial / pilot claim</h2>${chips.join("")}</div>`,
    `    <p class="fg-note fg-${v.clearance === "clear" ? "ok" : "warn"}"><strong>${escapeHtml(CLEARANCE_LABEL[v.clearance])}</strong></p>`,
    `    <p class="fg-meta">cleared ${v.clearedCount} · blocking ${v.blockingCount} · APPROVED ${v.byStatus.APPROVED} · WARN ${v.byStatus.WARN} · BLOCKED ${v.byStatus.BLOCKED} · UNKNOWN ${v.byStatus[UNKNOWN]}</p>`,
    `  </section>`,
  ].join("\n");
}

function renderEntryHtml(e) {
  const rows = [
    `    <div class="fg-entry fg-entry-${e.cleared ? "ok" : "warn"}">`,
    `      <div class="fg-head-row"><h3>${escapeHtml(e.packageName || "(unnamed component)")}${e.version ? ` <span class="fg-dim">@ ${escapeHtml(e.version)}</span>` : ""}</h3>${chip(e.cleared ? "cleared" : "blocks claim", e.cleared ? "ok" : "warn")}${chip(e.status, STATUS_TONE[e.status] || "muted")}</div>`,
    e.sourceRepoVendor ? `      <p class="fg-meta">Vendor / source: ${escapeHtml(e.sourceRepoVendor)}</p>` : ``,
    `      <p class="fg-meta">License: ${e.license ? `<code>${escapeHtml(e.license)}</code>` : "<span class=\"fg-warn\">none recorded</span>"}${e.licenseKnown ? "" : " <span class=\"fg-warn\">— unknown, blocks</span>"} · Commercial use: <strong class="fg-${e.commercialUse === true ? "ok" : "warn"}">${e.commercialUse === true ? "allowed" : e.commercialUse === false ? "not allowed" : "unknown"}</strong></p>`,
    `      <p class="fg-meta">Copyleft risk: ${chip(riskDisplay(e.copyleftRisk), riskTone(e.copyleftRisk))} · Redistribution risk: ${chip(riskDisplay(e.redistributionRisk), riskTone(e.redistributionRisk))} · Used as: ${e.componentKind ? escapeHtml(e.componentKind) : "(not recorded)"}</p>`,
    `      <p class="fg-meta">Reviewed: <strong class="fg-${e.reviewed ? "ok" : "warn"}">${e.reviewed ? "yes" : "no"}</strong>${e.dateReviewed ? ` · ${escapeHtml(e.dateReviewed)}` : ""}${e.reviewerSource ? ` · ${escapeHtml(e.reviewerSource)}` : ""}</p>`,
    e.needsLegalReview ? `      <p class="fg-note fg-warn">Human legal review required — high-risk or unclear license.</p>` : ``,
    !e.displayable ? `      <p class="fg-note fg-warn">Terms are ${escapeHtml(e.dataClass)}-classed and shown redacted — the clearance verdict is computed regardless.</p>` : ``,
    e.outputTerms ? `      <p class="fg-meta">Output terms: ${escapeHtml(e.outputTerms)}</p>` : ``,
    e.modelProviderTerms ? `      <p class="fg-meta">Model / provider terms: ${escapeHtml(e.modelProviderTerms)}</p>` : ``,
  ];
  if (e.obligations.length) {
    rows.push(`      <ul class="fg-list">`, ...e.obligations.map((o) => `        <li>${escapeHtml(o)}</li>`), `      </ul>`);
  }
  if (e.blocking) {
    rows.push(
      `      <p class="fg-note fg-warn">Why it blocks the claim:</p>`,
      `      <ul class="fg-list fg-warn-list">`,
      ...e.blockingReasons.map((r) => `        <li>${escapeHtml(r)}</li>`),
      `      </ul>`
    );
  }
  rows.push(`    </div>`);
  return rows.filter(Boolean).join("\n");
}

function renderEntriesHtml(v) {
  if (v.total === 0) {
    return [
      `  <section aria-readonly="true">`,
      `    <h2>Recorded components</h2>`,
      `    <p class="fg-empty">The register is empty — nothing is recorded. It is not invented, and an empty register clears no claim.</p>`,
      `  </section>`,
    ].join("\n");
  }
  return [
    `  <section aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>Recorded components</h2>${chip(`${v.clearedCount} cleared`, "ok")}${chip(`${v.blockingCount} blocking`, v.blockingCount ? "warn" : "muted")}</div>`,
    `    <p class="fg-note">Each entry's clearance is derived from its own recorded fields alone; a missing license/status/risk is shown, never assumed cleared.</p>`,
    ...v.entries.map(renderEntryHtml),
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

// renderRegisterHtml(snapshot) -> the composed body as an HTML fragment. Pure display; no
// <script>/form/button/input/on*/href.
export function renderRegisterHtml(snapshot) {
  const v = deriveRegisterView(snapshot);
  return [renderHeaderHtml(v), renderEntriesHtml(v), renderWarningsHtml(v)].filter(Boolean).join("\n");
}

// The self-contained style. Inlined so the rendered page is a PORTABLE evidence artifact that stands
// alone, using the shared founder palette for visual kinship with the sibling VB2 surfaces. Style only
// — no behaviour. Colour law: green is EARNED (a cleared entry / a clear register); amber/red is any
// gap that blocks a commercial claim (unknown or high license/IP risk, unreviewed, not APPROVED).
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
    h3{font-size:14.5px;margin:0}
    .fg-sub{color:var(--muted);margin:0 0 24px}
    .fg-law{color:var(--text);background:var(--panel2);border:1px solid var(--line);border-left:3px solid var(--purple);
      border-radius:8px;padding:10px 14px;margin:0 0 20px;font-style:italic}
    .fg-note{color:var(--muted);font-size:12.5px;margin:.4em 0 0}
    .fg-note strong{color:var(--text)}
    .fg-note.fg-warn,.fg-warn{color:var(--amber)}
    .fg-note.fg-ok,.fg-ok{color:var(--green)}
    .fg-meta{color:var(--dim);font-size:12px;margin:.3em 0 0}
    .fg-dim{color:var(--dim)}
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
    .fg-list li{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:9px 13px;font-size:12.5px}
    .fg-warn-list li{border-color:rgba(245,184,61,.35)}
    .fg-empty{color:var(--muted);margin:.5em 0 0}
    .fg-entry{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:13px 15px;margin:12px 0 0}
    .fg-entry-ok{border-left:3px solid var(--green)}
    .fg-entry-warn{border-left:3px solid var(--amber)}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--text)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

// renderSurfaceHtml(snapshot) -> a COMPLETE, self-contained founder-readable page. Pure: same snapshot
// in, byte-identical page out (no clock, no randomness). It carries NO <script>, <form>, <button>,
// <input>, on* handler, or navigable link (<a href>) — observably read-only.
export function renderSurfaceHtml(snapshot) {
  const v = deriveRegisterView(snapshot);
  const srcTone = v.source === "live" ? "info" : v.source === "fixture" ? "muted" : "warn";
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>License / IP register — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>License / IP register</h1>`,
    `    <p class="fg-sub">Which components — dependencies, copied code, worker/AI-tool outputs — are recorded, and do they clear a commercial or pilot claim? A claim is shown <em>clear</em> only when every recorded entry has a known license, confirmed commercial use, no high or unknown copyleft/redistribution risk, an APPROVED status, and a review on record. A single unknown, high-risk, or unreviewed entry <em>blocks</em> the whole claim; an empty register is <em>unsubstantiated</em>, never clear. Nothing here adds, reviews, or approves an entry.</p>`,
    `    <p class="fg-law">${escapeHtml(v.law)}</p>`,
    `    <div class="fg-head-row">${chip(SOURCE_LABEL[v.source], srcTone)}${v.collectedAt ? `<span class="fg-meta">collected ${escapeHtml(v.collectedAt)}</span>` : ""}</div>`,
    renderRegisterHtml(snapshot),
    `    <p class="fg-foot">Read-only view · clearance is earned by a known-license, reviewed, APPROVED entry, never asserted · unknown/high license-IP risk blocks commercial/pilot claims · an empty register clears nothing · reviewing and approving a component is a later, separately-owned act, not wired here.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

// renderSurfaceText(snapshot) -> plain-text dedicated surface. Pure. Convenience alias so callers have
// a symmetric {Html,Text} pair like the other VB2 surfaces.
export function renderSurfaceText(snapshot) {
  return renderRegisterText(snapshot);
}
