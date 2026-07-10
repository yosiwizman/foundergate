// FounderGate V8-A3 — File Cabinet tree builder (read-only).
//
// Walks an attached project, classifies EVERY file (data-class badge on each), and
// groups files by plain-English category (§4.8). It never follows symlinks during
// the walk (symlinks are listed conservatively as SECRET so their badge can never
// under-state risk); content access is always enforced separately by cabinet.mjs.

import { readdirSync, existsSync, readFileSync, lstatSync } from "node:fs";
import { join, relative } from "node:path";
import { classifyFile, access } from "./cabinet.mjs";

const SKIP = new Set(["node_modules", ".git"]);

export function loadRules(projectRoot) {
  const p = join(projectRoot, ".foundergate", "data_classification.json");
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, "utf8")).rules || []; } catch { return []; }
}

export function buildTree(projectRoot, rules = loadRules(projectRoot)) {
  const files = [];
  (function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (SKIP.has(name)) continue;
      const abs = join(dir, name);
      let st;
      try { st = lstatSync(abs); } catch { continue; }
      const rel = relative(projectRoot, abs);
      if (st.isSymbolicLink()) {
        // conservative: a symlink is listed as SECRET (never under-stated); the
        // real access decision (which re-classifies by realpath) still runs on use.
        files.push({ path: rel, category: "Sensitive / Hidden", data_class: "SECRET", access: access("SECRET"), symlink: true });
      } else if (st.isDirectory()) {
        walk(abs);
      } else if (st.isFile()) {
        if (st.nlink > 1) {
          // a hard-linked regular file cannot be safely classified by name (a secret
          // could be hard-linked to a safe name) — list conservatively as SECRET.
          files.push({ path: rel, category: "Sensitive / Hidden", data_class: "SECRET", access: access("SECRET"), hardlink: true });
        } else {
          const c = classifyFile(rel, rules);
          files.push({ path: rel, category: c.category, data_class: c.data_class, access: c.access, symlink: false });
        }
      }
    }
  })(projectRoot);

  files.sort((a, b) => a.path.localeCompare(b.path));
  const categories = {};
  for (const f of files) (categories[f.category] ||= []).push(f);
  return { root: projectRoot, count: files.length, files, categories };
}
