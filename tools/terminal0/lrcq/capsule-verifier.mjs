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
import { readFileSync, existsSync, readdirSync, statSync, lstatSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prMetadataDigest } from "./pr-metadata-canon.mjs";
import { verifyBinding, BINDING_PATH } from "./real-run-evidence-binding.mjs";

const SELF = fileURLToPath(import.meta.url);
const sha256 = (buf) => "sha256:" + createHash("sha256").update(buf).digest("hex");
const sha256file = (p) => sha256(readFileSync(p));

// Complete governed run-indicator inventory. Fails CLOSED: ANY read/readdir/stat/lstat/realpath/symlink/
// parse/traversal error -> INVENTORY_INCOMPLETE_ERROR (never "no run performed"). Only a fully successful
// scan that finds ZERO recognized run indicator returns INVENTORY_COMPLETE_NO_RUN_INDICATORS. Recognized
// indicators: the binding manifest, the committed run incident, a consumed-activation marker, an activation
// ledger/transaction record, a recovery-state record, a supervisor event/receipt/terminal-state record, an
// evidence index, a raw-run evidence manifest, a provider-attempt record, a run/cost ledger record.
export function inventoryRunIndicators(repo) {
  const evRoot = resolve(repo, ".foundergate/evidence/lrcq-assurance-factory");
  const INDICATOR = [
    { id: "evidence_binding", re: /REAL_RUN_EVIDENCE_BINDING\.json$/ },
    { id: "run_incident", re: /real-run-teardown-terminal-incident\.json$/ },
    { id: "consumed_activation", re: /\.consumed\.json$/ },
    { id: "activation_ledger", re: /(activation-lifecycle|ledger)\.jsonl$/ },
    { id: "transactions", re: /transactions\.jsonl$/ },
    { id: "recovery_state", re: /recovery-state\.json$|RECOVERY_STATE/i },
    { id: "supervisor", re: /supervisor(-events)?\.(jsonl|state\.json|out|err)$|\.state\.json$/ },
    { id: "evidence_index", re: /evidence-index\.jsonl$/ },
    { id: "raw_run_manifest", re: /REAL_RUN_RAW_EVIDENCE_MANIFEST\.json$/ },
    { id: "provider_attempt", re: /process\.json$|provider.*attempt/i },
    { id: "run_lock", re: /run\.lock$|next-safe-action\.txt$/ },
  ];
  const found = new Set();
  try {
    if (!existsSync(evRoot)) return { status: "INVENTORY_COMPLETE_NO_RUN_INDICATORS", indicators: [] };
    const stack = [evRoot];
    while (stack.length) {
      const d = stack.pop();
      let entries;
      try { entries = readdirSync(d); } catch (e) { return { status: "INVENTORY_INCOMPLETE_ERROR", error: "readdir " + d + ": " + (e.message || e) }; }
      for (const e of entries) {
        const p = resolve(d, e);
        let st;
        try { st = lstatSync(p); } catch (err) { return { status: "INVENTORY_INCOMPLETE_ERROR", error: "lstat " + p + ": " + (err.message || err) }; }
        if (st.isSymbolicLink()) { try { realpathSync(p); } catch (err) { return { status: "INVENTORY_INCOMPLETE_ERROR", error: "broken symlink " + p + ": " + (err.message || err) }; } }
        let stt;
        try { stt = statSync(p); } catch (err) { return { status: "INVENTORY_INCOMPLETE_ERROR", error: "stat " + p + ": " + (err.message || err) }; }
        if (stt.isDirectory()) { stack.push(p); continue; }
        if (!stt.isFile()) return { status: "INVENTORY_INCOMPLETE_ERROR", error: "unexpected filesystem type: " + p };
        for (const ind of INDICATOR) if (ind.re.test(e)) found.add(ind.id);
      }
    }
  } catch (e) { return { status: "INVENTORY_INCOMPLETE_ERROR", error: String(e.message || e) }; }
  return found.size > 0
    ? { status: "INVENTORY_COMPLETE_RUN_INDICATORS_PRESENT", indicators: [...found].sort() }
    : { status: "INVENTORY_COMPLETE_NO_RUN_INDICATORS", indicators: [] };
}

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
  if (existsSync(bindingPath)) {
    const binding = JSON.parse(readFileSync(bindingPath, "utf8"));
    const rv = verifyBinding(repo, binding);
    check("run-state truth: source-bound real-run evidence binding VALID (path-independent)", rv.ok, rv.ok ? binding.authoritative_outcome_status + " / productive=" + binding.productive_jobs_completed : rv.code + " " + (rv.detail || ""));
    // Use the STRUCTURALLY-DERIVED canonical statement (verifyBinding returns it), not stored prose.
    check("run-state truth: binding represents the HELD run honestly (0 productive, provider-not-attempted, replay-blocked)", rv.ok && binding.productive_jobs_completed === 0 && binding.provider_attempt_status === "PROVIDER_NOT_ATTEMPTED" && binding.replay_blocked === true && /HELD|TEARDOWN_DEFECT|PROVIDER_FAILURE/.test(binding.authoritative_outcome_status || ""), rv.ok ? rv.statement : undefined);
  } else {
    // No binding present. Run a COMPLETE governed inventory that fails CLOSED on ANY error — "no run
    // performed" is accepted ONLY when the inventory completes without error AND finds no run indicator.
    const inv = inventoryRunIndicators(repo);
    if (inv.status === "INVENTORY_INCOMPLETE_ERROR") {
      check("run-state truth: governed inventory COMPLETE (no read/stat/symlink/parse error)", false, "REAL_RUN_INVENTORY_INCOMPLETE: " + inv.error);
    } else if (inv.status === "INVENTORY_COMPLETE_RUN_INDICATORS_PRESENT") {
      // run indicators exist but no binding -> ambiguous, fail closed (never claim no-run)
      check("run-state truth: run indicators present require a REAL_RUN_EVIDENCE_BINDING manifest (not literal-path/no-run inference)", false, "indicators: " + inv.indicators.join(","));
    } else { // INVENTORY_COMPLETE_NO_RUN_INDICATORS
      check("run-state truth: complete governed inventory proves NO run performed (zero run indicators)", true);
    }
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
