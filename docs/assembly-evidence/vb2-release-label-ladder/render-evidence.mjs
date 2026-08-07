// FounderGate V8-B VB2 — Release Label Ladder surface EVIDENCE GENERATOR.
//
// Plain English: this renders the dedicated Release Label Ladder surface from REAL committed data,
// entirely offline:
//   - the CURRENT label is the committed release label the V8-A1 dashboard already reads
//     (src/v8a1/fixture/mock-project/.foundergate/release_label.json); and
//   - the LADDER rungs are the release-label schema enum
//     (src/v8a1/schemas/release_label.schema.json), the one authority for the rung order.
// It writes the page to `release-label-ladder.html` next to this file: the "label + transition
// history surface" the V8-B completion matrix asked for.
//
// THE HONEST PICTURE THIS PRODUCES: FounderGate's committed release label is `dev` with
// `mock: true`, and there is NO transition-history log on disk today (the release_label schema
// records only the current label, not a history of moves). So the generator feeds in the real
// current label and an EMPTY history, and the surface renders honestly:
//   - the current label `dev` placed on rung 1 of 4, carried with its MOCK truth-label; and
//   - "No transition history recorded" — the surface does NOT manufacture a dev→…→current path
//     the project never logged.
// That is the real, on-disk truth today, said out loud. The self-test proves the surface renders
// exact rung placement, honest jump / step-down / off-ladder classification, and the
// history-vs-current mismatch check correctly WHEN a history is present, so the capability is
// proven even though the committed history is currently empty.
//
// It is a build/evidence tool, kept OUT of src/ on purpose so the production surface module stays
// free of any fs/io surface (the VB2 no-act-edge source scan reads src/ only). Deterministic:
// same fixtures in → byte-identical page out. It only READS the two committed files and WRITES
// one html artifact; it takes no other action, opens no network, and shells nothing.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSurfaceHtml } from "../../../src/v8b2/release-label-ladder.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");

// The REAL current release label — the same file the V8-A1 dashboard displays (`dev`, mock:true).
const release = JSON.parse(
  readFileSync(join(ROOT, "src", "v8a1", "fixture", "mock-project", ".foundergate", "release_label.json"), "utf8")
);

// The snapshot: the real current label and an EMPTY transition history (there is no history log on
// disk — the schema records only the current label). The surface renders that as
// "No transition history recorded", never a manufactured path.
const snapshot = {
  source: "fixture",
  release,
  history: [], // no transition history is recorded on disk today — not invented
};

const html = renderSurfaceHtml(snapshot);
const out = join(HERE, "release-label-ladder.html");
writeFileSync(out, html + "\n");
console.log(
  `wrote ${out} (${html.length} bytes) — source=${snapshot.source}, label=${release.label}, mock=${release.mock}, historyRows=${snapshot.history.length}`
);
