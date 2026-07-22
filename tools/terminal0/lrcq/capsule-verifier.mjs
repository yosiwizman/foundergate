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
import { verifyBinding, BINDING_PATH } from "./real-run-evidence-binding.mjs";

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

  // 4. run-state truth (FG-LRCQ-ACT-027): PATH-INDEPENDENT + source-bound. The old check keyed off the
  // LITERAL gitignored REAL-RUN/ dir, so a clone (where it is absent) would falsely report "no run
  // performed". Now: if a committed REAL_RUN_EVIDENCE_BINDING manifest exists, verify it against current
  // committed source bytes (fails closed on ambiguity/contradiction/digest-mismatch) and render the honest
  // held-run statement. "No run performed" is asserted ONLY when a complete governed inventory proves it —
  // no binding AND no committed authoritative incident AND no consumed-activation record.
  const bindingPath = resolve(repo, BINDING_PATH);
  const incidentPath = resolve(repo, ".foundergate/evidence/lrcq-assurance-factory/real-run-teardown-terminal-incident.json");
  if (existsSync(bindingPath)) {
    const binding = JSON.parse(readFileSync(bindingPath, "utf8"));
    const rv = verifyBinding(repo, binding);
    check("run-state truth: source-bound real-run evidence binding VALID (path-independent)", rv.ok, rv.ok ? binding.authoritative_outcome_status + " / productive=" + binding.productive_jobs_completed : rv.code + " " + (rv.detail || ""));
    check("run-state truth: binding represents the HELD run honestly (0 productive, provider-not-attempted, replay-blocked)", rv.ok && binding.productive_jobs_completed === 0 && binding.provider_attempt_status === "PROVIDER_NOT_ATTEMPTED" && binding.replay_blocked === true && /HELD|TEARDOWN_DEFECT|PROVIDER_FAILURE/.test(binding.authoritative_outcome_status || ""));
  } else if (existsSync(incidentPath)) {
    // authoritative incident present but no binding manifest -> ambiguous, fail closed (do NOT claim no-run)
    check("run-state truth: committed real-run incident requires a REAL_RUN_EVIDENCE_BINDING manifest (not literal-path inference)", false, "incident present without binding");
  } else {
    // genuine no-run: no binding, no incident, no consumed activation anywhere in the governed evidence root
    const evRoot = resolve(repo, ".foundergate/evidence/lrcq-assurance-factory");
    let anyConsumed = false;
    try { const walk = (d) => { for (const e of readdirSync(d)) { const p = resolve(d, e); if (statSync(p).isDirectory()) walk(p); else if (/\.consumed\.json$/.test(e)) anyConsumed = true; } }; if (existsSync(evRoot)) walk(evRoot); } catch { /* */ }
    check("run-state truth: complete governed inventory proves NO run performed (no binding, no incident, no consumed activation)", anyConsumed === false);
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
