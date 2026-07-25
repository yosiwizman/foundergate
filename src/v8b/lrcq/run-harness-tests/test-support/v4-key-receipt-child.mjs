// FounderGate LRCQ — TEST-SUPPORT key-receipt child (FG-CHK-197-01 regression). Structurally test-only.
// Reads the inherited anonymous descriptor to EOF and writes a RECEIPT describing what it received: its pid,
// the byte length, and the sha256 of the frame. A sha256 digest is one-way, so the receipt proves whether two
// processes received the IDENTICAL frame without ever recording recoverable key material. The key here is a
// disposable per-activation ephemeral key inside an auto-removed temp world.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ri = process.argv.indexOf("--receipt");
const out = ri >= 0 ? process.argv[ri + 1] : null;
const fi = process.argv.indexOf("--fd");
const fd = fi >= 0 ? Number(process.argv[fi + 1]) : 3;
let buf = Buffer.alloc(0), err = null;
try { buf = readFileSync(fd); } catch (e) { err = String(e && e.message); }
const receipt = {
  pid: process.pid,
  frame_bytes: buf.length,
  frame_sha256: buf.length ? createHash("sha256").update(buf).digest("hex") : null,
  read_error: err,
};
try { buf.fill(0); } catch { /* */ }
if (out) writeFileSync(out, JSON.stringify(receipt) + "\n");
console.log(JSON.stringify(receipt));
process.exit(0);
