// FounderGate — SAFE evidence stamp helper (the mandated way to stamp evidence).
//
// The bb1543e corruption came from `open(path,"w").write(open(path).read()...)`:
// opening for write TRUNCATES the file before it is read, zeroing it. This helper
// makes that impossible: it READS the whole file FIRST, applies literal
// replacements, and only THEN writes. All evidence stamping must go through here
// (or an equivalent read-before-write step).
//
//   import { stamp } from "../scripts/stamp.mjs";
//   stamp("docs/assembly-evidence/X.md", [["#A3PR", "#29"], ["A3SHA", "aa8fcc1"]]);

import { readFileSync, writeFileSync } from "node:fs";

export function stamp(path, replacements = []) {
  const original = readFileSync(path, "utf8"); // READ FIRST — never truncate-before-read
  if (original.length === 0) {
    throw new Error(`stamp: refusing to stamp an already-empty file: ${path}`);
  }
  let out = original;
  for (const [from, to] of replacements) {
    // refuse an empty/nullish replacement — an empty $VAR must never be stamped in.
    if (to === undefined || to === null || String(to).length === 0) {
      throw new Error(`stamp: refusing an empty replacement value for "${from}" in ${path}`);
    }
    out = out.split(from).join(to);
  }
  if (out.length === 0) {
    throw new Error(`stamp: replacement would empty the file: ${path}`);
  }
  writeFileSync(path, out, "utf8"); // then write
  return out;
}
