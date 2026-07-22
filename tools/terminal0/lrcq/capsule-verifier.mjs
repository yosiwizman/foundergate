#!/usr/bin/env node
// FounderGate PR #189 — deterministic founder-capsule verifier (fail-closed). Verifies the out-of-tree
// capsule's file hashes, the candidate head/tree binding, the activation-template / manifest / backlog
// digests + 25-job count + $10 ceiling, the UNSIGNED/UNCONSUMED activation state, and (by running the
// real launcher preflight) that the template stops at SIGNATURE-REQUIRED with ZERO provider invocation.
// Head-agnostic: the frozen head is read from git. Read-only.
//   node tools/terminal0/lrcq/capsule-verifier.mjs <capsule-dir>
//
// FG-LRCQ-ACT-026: the verification logic is an EXPORTED PURE-ISH FUNCTION (verifyCapsule) so a disposable
// fixture can be verified with the SAME governing checks. The production CLI calls it with the real repo,
// PR #189, and a live-GitHub metadata provider. Fixture injection (repo/capsuleDir/prNumber/githubMetadata
// Provider) is a FUNCTION PARAMETER only — NOT reachable through CLI args, env, or capsule contents.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prMetadataDigest } from "./pr-metadata-canon.mjs";

const SELF = fileURLToPath(import.meta.url);
const sha256 = (buf) => "sha256:" + createHash("sha256").update(buf).digest("hex");
const sha256file = (p) => sha256(readFileSync(p));

// verifyCapsule — every production check; returns { valid, problems[], checks[] }. `githubMetadataProvider`
// (prNumber) -> { title, body } | null. null => the live-metadata check is SKIPPED as a NON-ACCEPTING
// informational result (recorded, never counted as PASS).
export function verifyCapsule({ repo, capsuleDir: CAP, prNumber = 189, githubMetadataProvider = null, requireMetadata = true }) {
  const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" }).trim();
  const checks = []; const problems = [];
  const check = (name, cond, detail) => { checks.push({ name, status: cond ? "PASS" : "FAIL", detail }); if (!cond) problems.push(name); };
  const skip = (name, detail) => { checks.push({ name, status: "SKIP", detail }); };
  if (!CAP || !existsSync(CAP)) { problems.push("capsule dir missing: " + CAP); return { valid: false, problems, checks }; }
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");

  // 1. SHA256SUMS bijection (flat capsule, no subdirs) + correct hashes
  const sumsPath = join(CAP, "SHA256SUMS.txt");
  check("SHA256SUMS.txt present", existsSync(sumsPath));
  if (existsSync(sumsPath)) {
    const listed = new Map();
    for (const line of readFileSync(sumsPath, "utf8").split("\n")) { const m = line.match(/^([0-9a-f]{64})\s+(.+)$/); if (m) listed.set(m[2].replace(/^\.\//, ""), "sha256:" + m[1]); }
    const entries = readdirSync(CAP).filter((f) => f !== "SHA256SUMS.txt").sort();
    check("no subdirectories in capsule", entries.every((f) => statSync(join(CAP, f)).isFile()));
    for (const f of entries.filter((f) => statSync(join(CAP, f)).isFile())) check("hash matches: " + f, listed.get(f) === sha256file(join(CAP, f)), "listed=" + (listed.get(f) || "MISSING"));
    for (const f of listed.keys()) check("no missing listed file: " + f, entries.includes(f));
  }

  // 2. candidate binding: SYSTEM_STATE + FINAL template bind the exact current head
  const ss = existsSync(join(CAP, "SYSTEM_STATE.json")) ? JSON.parse(readFileSync(join(CAP, "SYSTEM_STATE.json"), "utf8")) : {};
  check("SYSTEM_STATE binds exact frozen head", ss.frozen_head === head, "state=" + ss.frozen_head + " head=" + head);
  // canonical live-metadata binding via the injected provider (production: live gh; fixture: deterministic).
  const md = githubMetadataProvider ? githubMetadataProvider(prNumber) : null;
  if (md && typeof md.title === "string" && typeof md.body === "string") {
    check("canonical LIVE metadata == capsule pr_body_digest", prMetadataDigest(md.title, md.body) === ss.pr_body_digest, "live=" + prMetadataDigest(md.title, md.body));
  } else {
    // SKIP is a NON-ACCEPTING informational result — it must NEVER yield VALID. When metadata cannot be
    // verified (provider unavailable/offline), acceptance is withheld: a problem is recorded so valid=false.
    skip("canonical live-metadata check (metadata provider unavailable)");
    if (requireMetadata) problems.push("live-metadata binding could not be verified (metadata provider unavailable) — SKIP is NOT acceptance");
  }
  const tpl = existsSync(join(CAP, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json")) ? JSON.parse(readFileSync(join(CAP, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json"), "utf8")) : {};
  check("FINAL template binds exact frozen head", tpl.run_harness_candidate_sha === head);
  check("FINAL template is UNSIGNED", tpl.founder_signature == null, "sig=" + tpl.founder_signature);
  check("FINAL template UNCONSUMED (no issued/expiry stamped)", tpl.issued_epoch == null && tpl.expiry_epoch == null);

  // 3. manifest + backlog + ceiling from the committed candidate
  const manifest = JSON.parse(readFileSync(resolve(repo, ".foundergate/run-materials/first-internal-5h/run-manifest.json"), "utf8"));
  check("backlog is v2 with 25 jobs", /first-real-five-hour-run-v2\.json$/.test(manifest.backlog_path) && manifest.job_count === 25);
  const backlogDigest = sha256file(resolve(repo, ".foundergate/backlog/first-real-five-hour-run-v2.json"));
  check("backlog digest matches manifest binding", manifest.backlog_digest === backlogDigest, backlogDigest);
  check("run-wide cost ceiling is $10", manifest.max_cost_usd === 10);

  // 4. run-state truth: no REAL-RUN evidence, OR a run honestly recorded a HELD/terminal outcome
  const rrRoot = resolve(repo, ".foundergate/evidence/lrcq-assurance-factory/REAL-RUN");
  if (!existsSync(rrRoot)) { check("run-state truth: no REAL-RUN evidence (no run performed)", true); }
  else {
    let rec = null; try { rec = JSON.parse(readFileSync(resolve(rrRoot, "recovery-state.json"), "utf8")); } catch { /* */ }
    const held = !!rec && (/HELD|STOPPED_(TEARDOWN_DEFECT|PROVIDER_FAILURE|DEADLINE|BUDGET)/.test(rec.outcome_status || "") || /HELD|TEARDOWN_DEFECT|PROVIDER_FAILURE/.test(rec.final_state || ""));
    const noFalseCompletion = !!rec && typeof rec.productive_jobs_completed === "number";
    check("run-state truth: a REAL run honestly recorded a HELD/terminal outcome (no falsely-claimed clean success)", held && noFalseCompletion, rec && (rec.outcome_status + " / productive=" + rec.productive_jobs_completed));
  }

  // 5. live gate proof: the real launcher preflight refuses at SIGNATURE-REQUIRED with zero invocation
  const rfh = realpathSync(resolve(repo, "tools/terminal0/lrcq/run-five-hour.mjs"));
  const tplPath = realpathSync(join(CAP, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json"));
  let pf = "";
  try { const r = execFileSync(process.execPath, [rfh, "--final-template-preflight", tplPath], { cwd: realpathSync(repo), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); pf = r; } catch (e) { pf = (e.stdout || "") + (e.stderr || ""); }
  check("preflight -> SIGNATURE-REQUIRED", /LRCQ-REAL-LAUNCH-PREFLIGHT: SIGNATURE-REQUIRED/.test(pf));
  check("preflight reports zero provider invocation", /"zero_invocation":\s*true/.test(pf));

  return { valid: problems.length === 0, problems, checks };
}

// ---- production CLI (thin wrapper): real repo, PR #189, live gh metadata. No fixture injection reachable. ----
if (SELF === resolve(process.argv[1] || "")) {
  const REPO = resolve(new URL("../../..", import.meta.url).pathname);
  const CAP = process.argv[2];
  if (!CAP || !existsSync(CAP)) { console.error("usage: capsule-verifier.mjs <capsule-dir>"); process.exit(2); }
  const liveGh = (prNumber) => { try { const t = execFileSync("gh", ["pr", "view", String(prNumber), "--json", "title", "-q", ".title"], { encoding: "utf8" }).replace(/\n$/, ""); const b = execFileSync("gh", ["pr", "view", String(prNumber), "--json", "body", "-q", ".body"], { encoding: "utf8" }); return { title: t, body: b }; } catch { return null; } };
  const r = verifyCapsule({ repo: REPO, capsuleDir: CAP, prNumber: 189, githubMetadataProvider: liveGh });
  for (const c of r.checks) console.log((c.status === "PASS" ? "  PASS " : c.status === "SKIP" ? "  SKIP " : "  FAIL ") + c.name + (c.detail ? "  [" + c.detail + "]" : ""));
  console.log("\nCAPSULE-VERIFIER: " + (r.valid ? "VALID" : "INVALID"));
  process.exit(r.valid ? 0 : 1);
}
