#!/usr/bin/env node
// FounderGate PR #189 — the ONE deterministic PR title/body canonicalizer (FG-LRCQ metadata binding).
// Used by BOTH package generation and verification so the reviewed digest authenticates the EXACT live
// GitHub PR body while treating GitHub's trailing-newline normalization as equivalent. It normalizes ONLY
// line-ending form and final-newline count; it preserves every substantive character, internal blank
// line, leading/trailing space on non-final lines, Markdown, punctuation, wording, and ordering.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

export const CANON_ALGORITHM = "lrcq-pr-metadata-canon-1";

// Body: CRLF/CR -> LF; strip ALL trailing LF; if non-empty append exactly one LF; empty stays empty.
export function canonicalBody(body) {
  let b = String(body == null ? "" : body).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  b = b.replace(/\n+$/, "");
  return b.length > 0 ? b + "\n" : "";
}
// Title: normalize line endings to LF (titles are single-line; this is a determinism guard only). No trim.
export function canonicalTitle(title) {
  return String(title == null ? "" : title).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
// Canonical metadata bytes = UTF-8(canonicalTitle) + LF + UTF-8(canonicalBody).
export function canonicalMetadataBytes(title, body) {
  return Buffer.from(canonicalTitle(title) + "\n" + canonicalBody(body), "utf8");
}
export function prMetadataDigest(title, body) {
  return "sha256:" + createHash("sha256").update(canonicalMetadataBytes(title, body)).digest("hex");
}
export function rawDigest(s) {
  return "sha256:" + createHash("sha256").update(Buffer.from(String(s == null ? "" : s), "utf8")).digest("hex");
}

// CLI: `pr-metadata-canon.mjs live <pr#>` prints the canonical digest of the LIVE GitHub PR metadata,
// so an independent checker can re-derive the binding without trusting stored bytes.
if (process.argv[1] && /pr-metadata-canon\.mjs$/.test(process.argv[1])) {
  const [mode, pr] = process.argv.slice(2);
  if (mode === "live" && pr) {
    const title = execFileSync("gh", ["pr", "view", pr, "--json", "title", "-q", ".title"], { encoding: "utf8" }).replace(/\n$/, "");
    const body = execFileSync("gh", ["pr", "view", pr, "--json", "body", "-q", ".body"], { encoding: "utf8" });
    console.log(JSON.stringify({ algorithm: CANON_ALGORITHM, pr: Number(pr), raw_body_digest: rawDigest(body), canonical_metadata_digest: prMetadataDigest(title, body) }, null, 2));
  } else { console.error("usage: pr-metadata-canon.mjs live <pr#>"); process.exit(2); }
}
