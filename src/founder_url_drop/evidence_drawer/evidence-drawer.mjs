// Lane B — URL-drop Safety Check: evidence drawer linkage (pure, read-only).
//
// Plain English: after a founder drops a URL and a Safety Check runs, the founder
// needs a truthful "evidence drawer" that links the check's verdict to the exact
// evidence pack that backs it (by SHA-256), and lists what was recorded. This is
// DISPLAY ONLY: it never runs a check, never approves, never certifies green, and
// it REFUSES to show secret/blocked content in the clear (data-class boundary).
//
// Pure + deterministic: no I/O, no network, no clock, no randomness.
export const UNKNOWN = "UNKNOWN";

export function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Data-class boundary: only PUBLIC content is shown in the clear. SECRET / BLOCKED
// are redacted; an UNKNOWN class is treated as blocked (fail closed — never leak).
const SHOWN_CLASSES = new Set(["PUBLIC"]);
export function redactEntry(entry) {
  const cls = entry && typeof entry.class === "string" ? entry.class : "UNKNOWN";
  const label = entry && entry.label != null ? String(entry.label) : UNKNOWN;
  if (SHOWN_CLASSES.has(cls)) {
    return Object.freeze({ label, value: entry.value == null ? UNKNOWN : String(entry.value), class: cls, redacted: false });
  }
  return Object.freeze({ label, value: `‹REDACTED: ${cls}›`, class: cls, redacted: true });
}

// Build the read-only drawer view-model linking a safety result to its evidence pack.
export function buildDrawer({ safetyResult, evidencePack } = {}) {
  const verdict = safetyResult && typeof safetyResult.verdict === "string" ? safetyResult.verdict : UNKNOWN;
  const sha = evidencePack && typeof evidencePack.manifest_sha256 === "string" && evidencePack.manifest_sha256.length > 0
    ? evidencePack.manifest_sha256 : UNKNOWN;
  const rawEntries = (evidencePack && Array.isArray(evidencePack.entries)) ? evidencePack.entries : [];
  const entries = Object.freeze(rawEntries.map(redactEntry));
  const linked = verdict !== UNKNOWN && sha !== UNKNOWN;
  return Object.freeze({
    title: "Safety Check — evidence drawer",
    source_url: safetyResult && safetyResult.url != null ? String(safetyResult.url) : UNKNOWN,
    verdict,                       // never coerced to PASS; UNKNOWN when absent
    evidence_sha256: sha,          // the exact pack identity, or UNKNOWN
    entries,                       // classified content redacted
    entry_count: entries.length,
    redacted_count: entries.filter((e) => e.redacted).length,
    linked,                        // true only when verdict AND sha are both present
    certifies_green: false,        // this view never certifies readiness
  });
}

// Deterministic plain-English render (display-escaped).
export function renderDrawerText(drawer) {
  const lines = [
    `${escapeHtml(drawer.title)}`,
    `url: ${escapeHtml(drawer.source_url)}`,
    `verdict: ${escapeHtml(drawer.verdict)}`,
    `evidence_sha256: ${escapeHtml(drawer.evidence_sha256)}`,
    `linked: ${drawer.linked ? "yes" : "no"}`,
    `entries (${drawer.entry_count}, redacted ${drawer.redacted_count}):`,
  ];
  for (const e of drawer.entries) lines.push(`  - ${escapeHtml(e.label)}: ${escapeHtml(e.value)}`);
  return lines.join("\n");
}
