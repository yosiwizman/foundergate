// FounderGate LRCQ — pre-consumption PROVIDER-TARGET verification (FG-LRCQ-ACT-022).
//
// A governed run must execute the EXACT reviewed, immutable versioned provider target bound by the
// activation/manifest — NOT a mutable host alias/symlink (e.g. ~/.local/bin/claude) that can be retargeted
// to a different Claude version after review. This verifier rehashes the bound target on disk IMMEDIATELY
// before activation consumption and fails CLOSED on any drift, so a symlink that now points at an unreviewed
// version cannot change what the signed activation executes. It NEVER writes and NEVER runs a provider job
// (a `--version` metadata call is injectable and used only to confirm the bound version).
import { createHash } from "node:crypto";
import { readFileSync, existsSync, lstatSync, statSync, realpathSync } from "node:fs";

export function sha256File(p) { return "sha256:" + createHash("sha256").update(readFileSync(p)).digest("hex"); }

export const PROVIDER_VERIFY_CODES = [
  "OK", "PROVIDER_BINDING_UNKNOWN", "PROVIDER_TARGET_MISSING", "PROVIDER_TARGET_NOT_REGULAR_FILE",
  "PROVIDER_TARGET_NOT_EXECUTABLE", "PROVIDER_TARGET_IS_MUTABLE_ALIAS", "PROVIDER_DIGEST_MISMATCH",
  "PROVIDER_VERSION_MISMATCH", "PROVIDER_REALPATH_MISMATCH",
];

// binding: { resolvedTarget, expectedIdentity, expectedVersion, installNamespace? }
// deps (injectable for tests; production defaults hit the real fs): { hashFile, lstat, stat, realpath, exists, versionRunner }
// versionRunner(path) -> version string. If absent, verification returns PROVIDER_BINDING_UNKNOWN (UNKNOWN never passes).
export function verifyProviderTarget(binding, deps = {}) {
  const hashFile = deps.hashFile || sha256File;
  const lstat = deps.lstat || lstatSync;
  const stat = deps.stat || statSync;
  const realpath = deps.realpath || realpathSync;
  const exists = deps.exists || existsSync;
  const versionRunner = deps.versionRunner;
  const R = (code, extra = {}) => ({ ok: code === "OK", code, ...extra });

  const b = binding || {};
  const { resolvedTarget, expectedIdentity, expectedVersion, installNamespace } = b;
  if (!resolvedTarget || !expectedIdentity || !expectedVersion) return R("PROVIDER_BINDING_UNKNOWN", { reason: "missing resolvedTarget/expectedIdentity/expectedVersion" });
  if (!exists(resolvedTarget)) return R("PROVIDER_TARGET_MISSING", { target: resolvedTarget });
  // The bound target file must itself be a REGULAR FILE, never a symlink/mutable alias (a retargetable alias
  // is exactly the drift this closes). Parent-directory symlinks (e.g. /var -> /private/var) are irrelevant;
  // only the target inode matters, so we lstat the target itself rather than requiring realpath == path.
  let ls; try { ls = lstat(resolvedTarget); } catch { return R("PROVIDER_TARGET_MISSING", { target: resolvedTarget }); }
  if (ls.isSymbolicLink && ls.isSymbolicLink()) return R("PROVIDER_TARGET_IS_MUTABLE_ALIAS", { target: resolvedTarget, reason: "bound target is a symlink; bind the immutable versioned file" });
  let st; try { st = stat(resolvedTarget); } catch { return R("PROVIDER_TARGET_MISSING", { target: resolvedTarget }); }
  if (!st.isFile()) return R("PROVIDER_TARGET_NOT_REGULAR_FILE", { target: resolvedTarget });
  if (!((st.mode & 0o111) !== 0)) return R("PROVIDER_TARGET_NOT_EXECUTABLE", { target: resolvedTarget, mode: (st.mode & 0o777).toString(8) });
  // Optional install-namespace containment (informational unless provided).
  if (installNamespace && !String(resolvedTarget).includes(installNamespace)) return R("PROVIDER_REALPATH_MISMATCH", { target: resolvedTarget, installNamespace, reason: "target outside reviewed provider install namespace" });
  // AUTHORITY: rehash the actual bytes on disk and compare to the activation-bound identity.
  let digest; try { digest = hashFile(resolvedTarget); } catch (e) { return R("PROVIDER_BINDING_UNKNOWN", { reason: "hash failed: " + (e && e.message) }); }
  if (digest !== expectedIdentity) return R("PROVIDER_DIGEST_MISMATCH", { target: resolvedTarget, actual: digest, expected: expectedIdentity });
  // Version confirmation (UNKNOWN never passes).
  if (typeof versionRunner !== "function") return R("PROVIDER_BINDING_UNKNOWN", { reason: "no version runner — UNKNOWN never passes" });
  let version; try { version = String(versionRunner(resolvedTarget)); } catch (e) { return R("PROVIDER_VERSION_MISMATCH", { reason: "version check failed: " + (e && e.message) }); }
  if (!version.includes(expectedVersion)) return R("PROVIDER_VERSION_MISMATCH", { actual: version.trim(), expected: expectedVersion });
  let rp = null; try { rp = realpath(resolvedTarget); } catch { /* informational only */ }
  return R("OK", { receipt: { target: resolvedTarget, realpath: rp, digest, version: expectedVersion, mode: (st.mode & 0o777).toString(8), verified_epoch: null } });
}
