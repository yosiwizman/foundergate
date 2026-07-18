// FFS-1 completion-invariant selftest: a finished run may NOT be an acceptable witness candidate
// while its Evidence Pack is UNKNOWN/MISSING/CORRUPT. Only a hash-verified pack yields
// COMPLETE_WITH_VERIFIED_EVIDENCE_PACK + acceptable=true. Auto-discovered under src/.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import assert from "node:assert";

const RUNS = mkdtempSync(join(tmpdir(), "fg-ci-"));
process.env.FG_SAFETY_RUNS_DIR = RUNS;
const { readRun } = await import("./service.mjs");

const LEDGER_COMPLETE = [
  { stage: 10, name: "destroying disposable runtime", status: "DONE" },
  { stage: 11, name: "generating Evidence Pack", status: "UNKNOWN" },
  { stage: 12, name: "complete", status: "DONE" },
].map((e) => JSON.stringify(e)).join("\n") + "\n";
const RESULT = JSON.stringify({ run_id: "x", status: "COMPLETE", exact_commit: "a".repeat(40) });

function mkRun(id, { pack = "none", ledger = LEDGER_COMPLETE } = {}) {
  const d = join(RUNS, id); mkdirSync(join(d, "EVIDENCE_PACK"), { recursive: true });
  writeFileSync(join(d, "RUN_LEDGER.jsonl"), ledger);
  writeFileSync(join(d, "RUN_RESULT.json"), RESULT);
  if (pack === "verified" || pack === "corrupt") {
    const html = "<html>pack</html>"; writeFileSync(join(d, "EVIDENCE_PACK", "evidence-pack.html"), html);
    const h = pack === "verified" ? createHash("sha256").update(html).digest("hex") : "0".repeat(64);
    writeFileSync(join(d, "EVIDENCE_PACK", "evidence-pack.sha256"), `${h}  evidence-pack.html\n`);
    writeFileSync(join(d, "EVIDENCE_PACK", "evidence-pack.zip"), "PKzip");
  }
  return d;
}

// 1. finished run, NO pack -> COMPLETE_PACK_FAILED, not acceptable, result withheld
mkRun("sc-nopack");
let r = readRun("sc-nopack");
assert.equal(r.witness_state, "COMPLETE_PACK_FAILED", "no pack => COMPLETE_PACK_FAILED");
assert.equal(r.acceptable, false, "no pack => not acceptable");
assert.equal(r.result, null, "no pack => result withheld");
assert.ok(/cannot be accepted/.test(r.pack_message), "honest pack_message present");
assert.equal(r.evidence_pack_verified, false, "pack not verified");

// 2. finished run, CORRUPT pack (hash mismatch) -> fail closed COMPLETE_PACK_FAILED
mkRun("sc-corrupt", { pack: "corrupt" });
r = readRun("sc-corrupt");
assert.equal(r.witness_state, "COMPLETE_PACK_FAILED", "corrupt pack => COMPLETE_PACK_FAILED (fail closed)");
assert.equal(r.acceptable, false, "corrupt pack => not acceptable");

// 3. finished run, VERIFIED pack -> COMPLETE_WITH_VERIFIED_EVIDENCE_PACK, acceptable, result shown
mkRun("sc-good", { pack: "verified" });
r = readRun("sc-good");
assert.equal(r.witness_state, "COMPLETE_WITH_VERIFIED_EVIDENCE_PACK", "verified pack => acceptable state");
assert.equal(r.acceptable, true, "verified pack => acceptable");
assert.ok(r.result, "verified pack => result revealed");
assert.equal(r.evidence_pack_verified, true, "pack verified");

rmSync(RUNS, { recursive: true, force: true });
console.log("completion-invariant.selftest: OK (UNKNOWN/CORRUPT pack blocks acceptance; only hash-verified pack is a witness candidate)");
