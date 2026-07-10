// FounderGate V8-A3 — File Cabinet classification + access enforcement (SENSITIVE).
//
// This module decides what a founder can SEE. Misclassification leaks secrets, so
// it is FAIL-SAFE: a secret-shaped path is SECRET even if another category also
// matches; anything unrecognised is UNKNOWN and BLOCKED (never assumed safe).
// Content (preview/copy/download) is returned ONLY when the file's class allows
// it — SECRET, UNKNOWN, and PRODUCTION_DATA never expose content here.
//
// Read-only. No network, no provider/send/payment path. Roadmap §4.8.

import { readFileSync, existsSync, statSync, realpathSync } from "node:fs";
import { join, basename, extname, isAbsolute, normalize, resolve, relative, sep } from "node:path";

// Data classes (most→least restrictive matters for fail-safe defaults).
export const CLASSES = Object.freeze([
  "SECRET", "PRODUCTION_DATA", "DO_NOT_EXPORT", "PRIVATE_FOUNDER_DATA",
  "PROJECT_INTERNAL", "PUBLIC_SAFE", "UNKNOWN",
]);

// What each class permits. Fail-safe: SECRET/UNKNOWN/PRODUCTION_DATA expose nothing.
export const ACCESS = Object.freeze({
  PUBLIC_SAFE: { preview: true, copy: true, download: true },
  PROJECT_INTERNAL: { preview: true, copy: true, download: true },
  PRIVATE_FOUNDER_DATA: { preview: true, copy: true, download: false }, // viewable, not exported
  DO_NOT_EXPORT: { preview: true, copy: false, download: false }, // viewable, never exported/copied out
  PRODUCTION_DATA: { preview: false, copy: false, download: false }, // gated
  SECRET: { preview: false, copy: false, download: false }, // hidden content
  UNKNOWN: { preview: false, copy: false, download: false }, // blocked until classified
});

export function access(dataClass) {
  return ACCESS[dataClass] || ACCESS.UNKNOWN;
}

const lc = (s) => String(s).toLowerCase();
const isEnvTemplate = (b) => /^\.env\.(example|template|sample)$/.test(b);

// Secret-shaped names (fail-safe — checked FIRST, wins over any category).
// Case-insensitive; tolerant of trailing whitespace/dots (case-insensitive/odd
// filesystems), so `.ENV`, `.env ` and friends still classify SECRET.
function isSecretPath(rel) {
  const bRaw = basename(rel);
  const b = bRaw.replace(/[.\s]+$/, "").toLowerCase(); // drop trailing dots/space, lowercase
  if (isEnvTemplate(bRaw) || isEnvTemplate(b)) return false; // templates are not real secrets
  if (/^\.env(\.|$)/.test(b)) return true; // .env, .env.local, .env.prod, .ENV ...
  if (/\.env$/.test(b)) return true; // backup.env, prod.env, config.env, ..env
  if (b === ".envrc" || b === "wp-config.php") return true; // direnv / WordPress DB creds
  if (/(^|[._-])(secret|secrets|credential|credentials|token|apikey|api[_-]?key|password|passwd)([._-]|$)/.test(b)) return true;
  if (/\.(key|pem|p12|pfx|pkcs12|keystore|jks|p8|ppk|asc|gpg)$/.test(b)) return true;
  if (/(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)$/.test(rel.toLowerCase()) && !/\.pub$/.test(b)) return true;
  if (b === ".npmrc" || b === ".netrc" || b === ".pgpass" || b === ".htpasswd") return true;
  return false;
}

// Category + default class from the path (§4.8 category table). Fail-safe order.
function categoryFor(rel) {
  const r = lc(rel), b = lc(basename(rel));
  if (isSecretPath(rel)) return { category: "Sensitive / Hidden", data_class: "SECRET" };
  if (/(^|\/)(production[-_]data|prod[-_]data)(\/|$)/.test(r) || /\.prod\.(json|db|sql|csv)$/.test(b)) {
    return { category: "Configuration", data_class: "PRODUCTION_DATA" };
  }
  if (isEnvTemplate(basename(rel)) || /(^|\/)(supabase|vercel|docker)(\/|$)/.test(r) || b === "dockerfile" || b === "docker-compose.yml") {
    return { category: "Integrations", data_class: "PROJECT_INTERNAL" };
  }
  if (/(^|\/)docs\/(roadmap|current_status|founder_gates|known_limits|panic_card)/.test(r) ||
      /(^|\/)(readme|roadmap|current_status|known_limits|panic_card)\.md$/.test(r)) {
    return { category: "Founder Documents", data_class: "PUBLIC_SAFE" };
  }
  if (/\.foundergate\/notes(\/|$)/.test(r)) return { category: "Notes", data_class: "PRIVATE_FOUNDER_DATA" };
  if (/\.foundergate\/(evidence|bugs|witnesses)(\/|$)/.test(r) || /assembly-evidence\//.test(r)) {
    return { category: "Evidence", data_class: "PROJECT_INTERNAL" };
  }
  if (/(selftest|\.test\.|__tests__|\/tests?\/|test-results|ci-summary|checker-report)/.test(r)) {
    return { category: "Tests & Proof", data_class: "PROJECT_INTERNAL" };
  }
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(b)) return { category: "Product Screens", data_class: "PROJECT_INTERNAL" };
  if (/(^|\/)(package\.json|package-lock\.json|tsconfig|.*\.config\.(js|mjs|ts|json)|.*\.ya?ml)$/.test(b) ||
      b === "makefile" || b === ".gitignore") {
    return { category: "Configuration", data_class: "PROJECT_INTERNAL" };
  }
  if (/\.(mjs|js|ts|tsx|jsx|py|rb|go|rs|java|c|cpp|css|html)$/.test(b) || /(^|\/)(src|app|lib|components|pages)\//.test(r)) {
    return { category: "App Source", data_class: "PROJECT_INTERNAL" };
  }
  return { category: "Uncategorized", data_class: "UNKNOWN" }; // fail-safe: blocked
}

// Classify one project-relative file path. Explicit project rules (C3) can only
// make a file MORE restrictive (SECRET), never less — misclassification is one-way safe.
export function classifyFile(relPath, rules = []) {
  let { category, data_class } = categoryFor(relPath);
  for (const rule of rules) {
    if (rule && rule.match && new RegExp(globToRe(rule.match)).test(relPath)) {
      if (rule.class === "SECRET") { category = "Sensitive / Hidden"; data_class = "SECRET"; }
    }
  }
  return { path: relPath, category, data_class, access: access(data_class) };
}

// Correct glob→regex: single-pass so `**` (cross-slash) is not re-mangled by the
// `*` rule, and `?` becomes a single non-slash char (not a regex quantifier).
function globToRe(glob) {
  const s = String(glob);
  let out = "^";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "*") {
      if (s[i + 1] === "*") { out += ".*"; i++; if (s[i + 1] === "/") i++; } // ** spans path segments
      else out += "[^/]*";
    } else if (c === "?") {
      out += "[^/]";
    } else if (".+^${}()|[]\\".includes(c)) {
      out += "\\" + c;
    } else {
      out += c;
    }
  }
  return out + "$";
}

// Lexical containment (absolute/traversal). Throws; callers fail-closed on throw.
function lexicalAbs(projectRoot, relPath) {
  if (isAbsolute(relPath)) throw new Error("path must be project-relative");
  const abs = normalize(join(projectRoot, relPath));
  const root = resolve(projectRoot);
  if (abs !== root && !abs.startsWith(root + sep)) throw new Error("path escapes the project");
  return abs;
}

// Restrictiveness rank (lower = more restrictive). SECRET/UNKNOWN are most
// restrictive (they expose nothing); PUBLIC_SAFE is least.
const RANK = { SECRET: 0, UNKNOWN: 0, PRODUCTION_DATA: 1, DO_NOT_EXPORT: 2, PRIVATE_FOUNDER_DATA: 3, PROJECT_INTERNAL: 4, PUBLIC_SAFE: 5 };
function mostRestrictive(a, b) {
  return (RANK[a] ?? 0) <= (RANK[b] ?? 0) ? a : b;
}
function blocked(dataClass, category, action) {
  return {
    allowed: false, data_class: dataClass, category,
    reason: dataClass === "SECRET" ? "This file is protected (secret) and cannot be shown."
      : dataClass === "UNKNOWN" ? "This file isn't classified yet, so it's blocked for your safety."
      : dataClass === "PRODUCTION_DATA" ? "This is production data — it needs a gate before it can be opened."
      : `This file's class (${dataClass}) does not allow ${action}.`,
  };
}

// safePreview / safeCopy / safeDownload — return content ONLY if the class allows.
// FAIL-CLOSED: any error (traversal, bad symlink, unexpected) blocks and never
// returns content. Symlinks are resolved with realpathSync and RE-CLASSIFIED by
// their real target — the more restrictive of (name-class, target-class) wins, so
// a `README.md` symlinked to `.env` is treated as SECRET (blocked).
function gated(projectRoot, relPath, rules, action) {
  const root = resolve(projectRoot);
  let nameCls;
  try {
    nameCls = classifyFile(relPath, rules);
    const abs = lexicalAbs(root, relPath);
    if (!existsSync(abs)) return blocked(nameCls.data_class, nameCls.category, action);
    const real = realpathSync(abs); // follows symlinks
    const realRoot = realpathSync(root);
    if (real !== realRoot && !real.startsWith(realRoot + sep)) {
      return { allowed: false, data_class: "SECRET", category: nameCls.category,
        reason: "This file points outside your project and is blocked for your safety." };
    }
    const st = statSync(real);
    if (!st.isFile()) return blocked(nameCls.data_class, nameCls.category, action);
    // Hard links defeat name/realpath classification: a secret file hard-linked to a
    // safe name (`ln secret.env readme.md`) has no distinct realpath, so it would be
    // judged by the SAFE name. A regular file with nlink>1 cannot be safely
    // identified — fail closed (blocked), same posture as an out-of-project symlink.
    if (st.nlink > 1) {
      return { allowed: false, data_class: "SECRET", category: nameCls.category,
        reason: "This file has more than one name (a hard link), so its identity can't be verified — it's blocked for your safety." };
    }
    // effective class = most restrictive of the requested NAME and the REAL target.
    const realCls = classifyFile(relative(root, real), rules);
    const effective = mostRestrictive(nameCls.data_class, realCls.data_class);
    if (!access(effective)[action]) return blocked(effective, nameCls.category, action);
    return { allowed: true, data_class: effective, category: nameCls.category, content: readFileSync(real, "utf8") };
  } catch {
    // fail-closed — never leak on an unexpected error.
    return { allowed: false, data_class: "UNKNOWN", category: (nameCls && nameCls.category) || "Uncategorized",
      reason: "This file could not be safely opened, so it's blocked." };
  }
}
export const safePreview = (root, rel, rules) => gated(root, rel, rules, "preview");
export const safeCopy = (root, rel, rules) => gated(root, rel, rules, "copy");
export const safeDownload = (root, rel, rules) => gated(root, rel, rules, "download");
