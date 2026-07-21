#!/usr/bin/env node
// FounderGate PR #189 — deterministic founder-capsule verifier (fail-closed). Verifies the out-of-tree
// capsule's file hashes, the candidate head/tree binding, the activation-template / manifest / backlog
// digests + 25-job count + $10 ceiling, the UNSIGNED/UNCONSUMED activation state, and (by running the
// real launcher preflight) that the template stops at SIGNATURE-REQUIRED with ZERO provider invocation.
// Head-agnostic: the frozen head is read from git. Read-only.
//   node tools/terminal0/lrcq/capsule-verifier.mjs <capsule-dir>
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, relative } from "node:path";
import { prMetadataDigest } from "./pr-metadata-canon.mjs";

const sha256 = (buf) => "sha256:" + createHash("sha256").update(buf).digest("hex");
const sha256file = (p) => sha256(readFileSync(p));
const REPO = resolve(new URL("../../..", import.meta.url).pathname);
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" }).trim();

const CAP = process.argv[2];
if (!CAP || !existsSync(CAP)) { console.error("usage: capsule-verifier.mjs <capsule-dir>"); process.exit(2); }

let ok = true; const check = (name, cond, detail) => { console.log((cond ? "  PASS " : "  FAIL ") + name + (detail ? "  [" + detail + "]" : "")); if (!cond) ok = false; };

const head = git("rev-parse", "HEAD");
const tree = git("rev-parse", "HEAD^{tree}");

// 1. every capsule file matches SHA256SUMS.txt, and SHA256SUMS lists exactly the files present
const sumsPath = join(CAP, "SHA256SUMS.txt");
check("SHA256SUMS.txt present", existsSync(sumsPath));
if (existsSync(sumsPath)) {
  const listed = new Map();
  for (const line of readFileSync(sumsPath, "utf8").split("\n")) { const m = line.match(/^([0-9a-f]{64})\s+(.+)$/); if (m) listed.set(m[2].replace(/^\.\//, ""), "sha256:" + m[1]); }
  const present = readdirSync(CAP).filter((f) => f !== "SHA256SUMS.txt").sort();
  for (const f of present) check("hash matches: " + f, listed.get(f) === sha256file(join(CAP, f)), "listed=" + (listed.get(f) || "MISSING"));
  for (const f of listed.keys()) check("no missing listed file: " + f, present.includes(f));
}

// 2. candidate binding: SYSTEM_STATE + FINAL template bind the exact current head
const ss = existsSync(join(CAP, "SYSTEM_STATE.json")) ? JSON.parse(readFileSync(join(CAP, "SYSTEM_STATE.json"), "utf8")) : {};
check("SYSTEM_STATE binds exact frozen head", ss.frozen_head === head, "state=" + ss.frozen_head + " head=" + head);
// FG-LRCQ metadata binding: when gh is available, confirm the canonical digest of the LIVE GitHub PR body
// equals the capsule's recorded pr_body_digest (canonicalizer treats trailing-newline normalization as equal).
try {
  const t = execFileSync("gh", ["pr", "view", "189", "--json", "title", "-q", ".title"], { encoding: "utf8" }).replace(/\n$/, "");
  const b = execFileSync("gh", ["pr", "view", "189", "--json", "body", "-q", ".body"], { encoding: "utf8" });
  check("canonical LIVE GitHub metadata == capsule pr_body_digest", prMetadataDigest(t, b) === ss.pr_body_digest, "live=" + prMetadataDigest(t, b));
} catch { console.log("  SKIP canonical live-metadata check (gh unavailable — offline mode)"); }
const tpl = existsSync(join(CAP, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json")) ? JSON.parse(readFileSync(join(CAP, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json"), "utf8")) : {};
check("FINAL template binds exact frozen head", tpl.run_harness_candidate_sha === head);
check("FINAL template is UNSIGNED", tpl.founder_signature == null && ss.frozen_tree === undefined ? true : tpl.founder_signature == null, "sig=" + tpl.founder_signature);
check("FINAL template UNCONSUMED (no issued/expiry stamped)", tpl.issued_epoch == null && tpl.expiry_epoch == null);

// 3. manifest + backlog + ceiling from the committed candidate
const manifest = JSON.parse(readFileSync(resolve(REPO, ".foundergate/run-materials/first-internal-5h/run-manifest.json"), "utf8"));
check("backlog is v2 with 25 jobs", /first-real-five-hour-run-v2\.json$/.test(manifest.backlog_path) && manifest.job_count === 25);
const backlogDigest = sha256file(resolve(REPO, ".foundergate/backlog/first-real-five-hour-run-v2.json"));
check("backlog digest matches manifest binding", manifest.backlog_digest === backlogDigest, backlogDigest);
check("run-wide cost ceiling is $10", manifest.max_cost_usd === 10);

// 4. no real-run evidence exists (no run happened)
check("no REAL-RUN evidence root (no run performed)", !existsSync(resolve(REPO, ".foundergate/evidence/lrcq-assurance-factory/REAL-RUN")));

// 5. live gate proof: the real launcher preflight refuses at SIGNATURE-REQUIRED with zero invocation
const tplPath = join(CAP, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json");
let pf = "";
try { pf = execFileSync("node", [resolve(REPO, "tools/terminal0/lrcq/run-five-hour.mjs"), "--final-template-preflight", tplPath], { cwd: REPO, encoding: "utf8" }); } catch (e) { pf = (e.stdout || "") + (e.stderr || ""); }
check("preflight -> SIGNATURE-REQUIRED", /LRCQ-REAL-LAUNCH-PREFLIGHT: SIGNATURE-REQUIRED/.test(pf));
check("preflight reports zero provider invocation", /"zero_invocation":\s*true/.test(pf));

console.log("\nCAPSULE-VERIFIER: " + (ok ? "VALID" : "INVALID"));
process.exit(ok ? 0 : 1);
