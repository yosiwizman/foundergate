// FounderGate LRCQ — preflight false-green regression (FG-LRCQ-ACT-004). Spawns the real launcher
// (deterministic; NO Claude) and asserts SIGNATURE-REQUIRED only when signature/time are the sole
// blockers, and BINDING-DEFECT when any candidate/binding mismatch coexists.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
function dirname(p) { return p.replace(/\/[^/]*$/, ""); }
const LAUNCHER = join(REPO, "tools/terminal0/lrcq/run-five-hour.mjs");
const PACKET = join(REPO, ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" }).trim();
const run = (args) => { try { return execFileSync("node", [LAUNCHER, ...args], { encoding: "utf8" }); } catch (e) { return (e.stdout || "") + (e.stderr || ""); } };
const tmp = mkdtempSync(join(tmpdir(), "lrcq-pf-"));

const HEAD = git("rev-parse", "HEAD"), HTREE = git("rev-parse", "HEAD^{tree}");
const packet = JSON.parse(readFileSync(PACKET, "utf8"));

// 1. material packet binds the PARENT code commit, not HEAD -> BINDING-DEFECT (proves 004)
{ const out = run(["--preflight-unsigned", PACKET]);
  ok("01 committed material packet (parent-bound) -> BINDING-DEFECT", /LRCQ-REAL-LAUNCH-PREFLIGHT: BINDING-DEFECT/.test(out) && !/SIGNATURE-REQUIRED/.test(out)); }

// 2. final template bound to the EXACT current HEAD -> SIGNATURE-REQUIRED
{ const t = { ...packet, run_harness_candidate_sha: HEAD, run_harness_candidate_tree: HTREE };
  const f = join(tmp, "final-head.json"); writeFileSync(f, JSON.stringify(t));
  const out = run(["--final-template-preflight", f]);
  ok("02 final template bound to exact HEAD -> SIGNATURE-REQUIRED", /LRCQ-REAL-LAUNCH-PREFLIGHT: SIGNATURE-REQUIRED/.test(out));
  ok("02b final-template preflight reports zero invocation", /"zero_invocation": true/.test(out)); }

// 3. wrong candidate SHA -> BINDING-DEFECT (signature does NOT mask it)
{ const t = { ...packet, run_harness_candidate_sha: "0".repeat(40), run_harness_candidate_tree: HTREE };
  const f = join(tmp, "wrong-cand.json"); writeFileSync(f, JSON.stringify(t));
  const out = run(["--final-template-preflight", f]);
  ok("03 wrong candidate SHA -> BINDING-DEFECT", /BINDING-DEFECT/.test(out) && !/SIGNATURE-REQUIRED/.test(out)); }

// 4. wrong provider identity -> BINDING-DEFECT
{ const t = { ...packet, run_harness_candidate_sha: HEAD, run_harness_candidate_tree: HTREE, provider_executable_identity: "sha256:" + "e".repeat(64) };
  const f = join(tmp, "wrong-prov.json"); writeFileSync(f, JSON.stringify(t));
  const out = run(["--final-template-preflight", f]);
  ok("04 wrong provider identity -> BINDING-DEFECT (not masked by signature)", /BINDING-DEFECT/.test(out)); }

// 5. resolve-only dispatches nothing
ok("05 --resolve-only dispatches nothing", /single_launcher/.test(run(["--resolve-only"])) && !/PREFLIGHT/.test(run(["--resolve-only"])));

console.log("\nLRCQ PREFLIGHT SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
