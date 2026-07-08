// FounderGate V8-A2 — Bug Collector / Founder Evidence Capture (wide-safe).
//
// Report Problem → capture screenshot + context → (mark/note/voice) → data
// classification applied automatically (C3) → store a data-classified evidence
// packet under the project's .foundergate/bugs. V8-A2 CAPTURES ONLY; it never
// triages, launches a fix, or takes any live/provider/send/payment action.
//
// Fail-closed: no secret-shaped value is ever written into a stored packet.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { validate as v8a1Validate } from "../../v8a1/validate.mjs";
import { redactString, assertNoSecret, scan } from "../../proof-packages/redact.mjs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
export const BUG_SCHEMA = JSON.parse(readFileSync(join(HERE, "bug.schema.json"), "utf8"));

export function validateBug(pkt) {
  return v8a1Validate(pkt, BUG_SCHEMA);
}

function projectDefaultClass(projectRoot) {
  const p = join(projectRoot, ".foundergate", "data_classification.json");
  if (!existsSync(p)) return "UNKNOWN";
  try { return JSON.parse(readFileSync(p, "utf8")).default_class || "UNKNOWN"; } catch { return "UNKNOWN"; }
}

function previewEnvLabel(projectRoot) {
  const p = join(projectRoot, ".foundergate", "preview.json");
  if (!existsSync(p)) return "unknown";
  try { return JSON.parse(readFileSync(p, "utf8")).environment || "unknown"; } catch { return "unknown"; }
}

// Capture one bug evidence packet. Returns the stored packet (redacted).
export function captureBug(projectRoot, payload = {}, opts = {}) {
  const view = (payload.view && String(payload.view)) || "unknown";
  const rawNote = payload.note ? String(payload.note) : "";
  const rawArea = payload.area ? String(payload.area) : "";

  // C3 — automatic data classification. If the founder's note carries a secret or
  // PII shape, classify SECRET and hide the secret values; otherwise inherit the
  // project's default class.
  let cls = projectDefaultClass(projectRoot);
  let note = rawNote;
  let area = rawArea;
  const rep = scan({ note: rawNote, area: rawArea });
  if (!rep.clean) {
    cls = "SECRET";
    note = rep.piiHits.length ? "[redacted: personal data removed]" : redactString(rawNote);
    area = rep.piiHits.length ? "[redacted]" : redactString(rawArea);
  }

  // stable id from content (dedupe-friendly); disambiguate if it already exists.
  const bugsDir = join(projectRoot, ".foundergate", "bugs");
  const base = "bug-" + createHash("sha256").update(`${view}|${rawNote}|${rawArea}`).digest("hex").slice(0, 10);
  let id = base;
  if (existsSync(bugsDir)) {
    let i = 2;
    while (existsSync(join(bugsDir, `${id}.json`))) { id = `${base}-${i++}`; }
  }

  const packet = {
    schema_version: "1.0.0",
    id,
    view,
    note,
    area,
    voice_note: payload.voice_note === true,
    screenshot_captured: payload.screenshot_captured === true,
    screenshot_ref: payload.screenshot_ref ? String(payload.screenshot_ref) : `bugs/${id}.png`,
    data_classification: cls,
    environment_label: previewEnvLabel(projectRoot),
    captured_marker: opts.marker || "captured",
    mock: cls === "MOCK_ONLY" || undefined,
  };
  if (packet.mock === undefined) delete packet.mock;

  // fail-closed: never persist a secret-shaped value.
  assertNoSecret(packet);
  const { valid, errors } = validateBug(packet);
  if (!valid) throw new Error(`refusing to store invalid bug packet: ${errors.join("; ")}`);

  mkdirSync(bugsDir, { recursive: true });
  writeFileSync(join(bugsDir, `${id}.json`), JSON.stringify(packet, null, 2) + "\n", "utf8");
  return packet;
}

// List stored bug packets for a project (read-only).
export function listBugs(projectRoot) {
  const dir = join(projectRoot, ".foundergate", "bugs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}
