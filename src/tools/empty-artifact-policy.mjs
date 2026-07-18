// Manifest-controlled empty-evidence policy (STACK-1E). Empty evidence is INVALID BY DEFAULT.
// A zero-byte artifact may pass ONLY when its EXACT repo-relative path is declared in a governed
// empty-artifact manifest with allow_empty:true + reason + producer + producer_exit_status + one or
// more required NON-EMPTY companion artifacts whose hashes verify, and whose content binds the
// artifact to its evaluated_sha and qualification_run_id. NO extension-wide / wildcard / directory
// exemption is permitted. Extension is never sufficient. Fail-closed.
import { createHash } from "node:crypto";

export function sha256(buf) { return createHash("sha256").update(buf).digest("hex"); }

// entry: the manifest declaration for one artifact_path.
// ctx.readFile(repoRelPath) -> Buffer | null   (reads a companion; null if missing)
// Returns { allowed: boolean, reason: string }.
export function validateEmptyArtifact(artifactPath, entry, ctx) {
  const bad = (r) => ({ allowed: false, reason: r });
  if (!entry) return bad(`undeclared empty file (not in empty-artifact manifest): ${artifactPath}`);
  if (entry.artifact_path !== artifactPath) return bad(`manifest path mismatch for ${artifactPath}`);
  if (entry.allow_empty !== true) return bad(`allow_empty not true for ${artifactPath}`);
  if (typeof entry.empty_reason !== "string" || !entry.empty_reason.trim()) return bad(`missing empty_reason for ${artifactPath}`);
  if (typeof entry.producer !== "string" || !entry.producer.trim()) return bad(`missing producer for ${artifactPath}`);
  if (typeof entry.producer_exit_status !== "number") return bad(`missing/invalid producer_exit_status for ${artifactPath}`);
  if (typeof entry.qualification_run_id !== "string" || !entry.qualification_run_id.trim()) return bad(`missing qualification_run_id for ${artifactPath}`);
  if (typeof entry.evaluated_sha !== "string" || !/^[0-9a-f]{40}$/.test(entry.evaluated_sha)) return bad(`missing/invalid evaluated_sha for ${artifactPath}`);
  const comps = entry.companion_artifacts;
  if (!Array.isArray(comps) || comps.length === 0) return bad(`no companion_artifacts for ${artifactPath}`);
  const hashes = entry.companion_hashes || {};
  let evaluatedShaBound = false, runIdBound = false;
  for (const c of comps) {
    const buf = ctx.readFile(c);
    if (buf === null || buf === undefined) return bad(`missing companion ${c} for ${artifactPath}`);
    if (buf.length === 0) return bad(`empty companion ${c} for ${artifactPath}`);
    if (!hashes[c]) return bad(`no declared hash for companion ${c}`);
    if (sha256(buf) !== hashes[c]) return bad(`companion hash mismatch for ${c}`);
    const text = buf.toString("utf8");
    if (text.includes(entry.evaluated_sha)) evaluatedShaBound = true;
    if (text.includes(entry.qualification_run_id)) runIdBound = true;
  }
  if (!evaluatedShaBound) return bad(`evaluated_sha not bound in any companion for ${artifactPath} (wrong evaluated SHA?)`);
  if (!runIdBound) return bad(`qualification_run_id not bound in any companion for ${artifactPath} (wrong run id?)`);
  return { allowed: true, reason: "manifest-declared empty artifact with verified companions + bindings" };
}

// Reject a manifest that tries a wildcard / extension-only exemption.
export function manifestIsWellFormed(manifest) {
  const problems = [];
  if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.entries)) return ["manifest missing entries array"];
  for (const e of manifest.entries) {
    const p = e && e.artifact_path;
    if (typeof p !== "string" || !p) { problems.push("entry with no artifact_path"); continue; }
    if (p.includes("*") || p.includes("?") || p.endsWith("/")) problems.push(`wildcard/directory empty exemption not permitted: ${p}`);
    if (/^\*?\.[a-z0-9]+$/i.test(p)) problems.push(`extension-only exemption not permitted: ${p}`);
  }
  return problems;
}
