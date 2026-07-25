// FounderGate LRCQ — TEST-SUPPORT body: the FG-FCHK-197-B / FG-FCHK-197-C provider-boundary matrix,
// executed under a GENUINE SUPERVISOR_EXECUTION capability inside the governed execution child.
//
// It reruns the fresh independent Checker's own 26 invalid routes against the REAL boundary, with a
// RECORDING provider stub at the signed provider target, and counts ACTUAL provider spawns from that stub's
// log — never inferred from receipts or refusal strings. It also proves the deep immutability of the
// SUPERVISOR_EXECUTION stage (which can only be observed from inside a real supervisor) and that one
// legitimately NARROWED projection still reaches exactly one deterministic stub process.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { runJob } from "../../../provider/real-provider.mjs";
import { projectLegacyActivationV4, projectionMatchesCapability } from "../../../run-harness/v4-legacy-projection.mjs";
import { V4_SIGNED_LIMITS, V4_SIGNED_EXCLUSIONS } from "../../../assurance/activation-v4.mjs";
import { mutableAuthorityPaths } from "../../../assurance/deep-freeze-authority.mjs";
import { isSupervisorExecutionCapabilityV4 } from "../../../assurance/lifecycle-authority-v4.mjs";
import { enforceSignedAuthorityBoundary } from "../../../provider/authority-boundary.mjs";

export default async function body(cap, args) {
  const checks = [];
  const ok = (name, cond, detail) => checks.push({ name, ok: !!cond, detail: cond ? undefined : detail });
  const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

  // ---- disposable git scaffolding inside the signed repository root ----
  const BASE = join(args.base, "ff"); mkdirSync(BASE, { recursive: true });
  const REPO = join(BASE, "repo"); mkdirSync(REPO, { recursive: true });
  git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
  writeFileSync(join(REPO, "seed.txt"), "seed\n"); git(["add", "-A"], REPO); git(["commit", "-q", "-m", "seed"], REPO);
  const WTROOT = join(BASE, "wt"); mkdirSync(WTROOT, { recursive: true });
  const EVROOT = join(BASE, "evidence"); mkdirSync(EVROOT, { recursive: true });
  const FOREIGN = join(BASE, "foreign"); mkdirSync(FOREIGN, { recursive: true });
  git(["init", "-q", "-b", "main"], FOREIGN); git(["config", "user.email", "f@f"], FOREIGN); git(["config", "user.name", "f"], FOREIGN);
  writeFileSync(join(FOREIGN, "s"), "s"); git(["add", "-A"], FOREIGN); git(["commit", "-q", "-m", "s"], FOREIGN);

  // The RECORDING stub is the signed provider target for this world, so every ACTUAL provider execution
  // appends one line here. Zero-spawn is COUNTED, never inferred.
  const SPAWN_LOG = args.spawnLog;
  const spawnCount = () => { try { return existsSync(SPAWN_LOG) ? readFileSync(SPAWN_LOG, "utf8").trim().split("\n").filter(Boolean).length : 0; } catch { return -1; } };
  const spawnLines = () => { try { return existsSync(SPAWN_LOG) ? readFileSync(SPAWN_LOG, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; } catch { return []; } };

  const mkWt = (id, branch, mode) => { const p = join(WTROOT, id); git(["worktree", "add", "-q", "-b", branch, p, "HEAD"], REPO); writeFileSync(join(p, "stub-mode"), mode || "success"); return p; };
  const MAN = (o = {}) => ({
    repository_root: REPO, branch_prefix: "lane/", permitted_worktree_root: WTROOT, evidence_root: EVROOT,
    per_job_timeout_s: 5, termination_grace_s: 0.2, output_cap_bytes: 1048576, max_parallel_width: 2, max_cost_usd: 5, ...o,
  });
  const LOADED = { allowed_tools_manifest_path: { builder: ["Read", "Edit"], checker: ["Read", "Grep"] } };
  const ACT = (manOver = {}) => projectLegacyActivationV4(cap, MAN(manOver), LOADED, "builder", { evidenceRoot: EVROOT });
  const BIND = (o = {}) => ({
    lrcq_base_sha: cap.lrcq_base_sha, lrcq_base_tree: cap.lrcq_base_tree,
    provider_candidate_sha: cap.provider_candidate_sha, provider_candidate_tree: cap.provider_candidate_tree,
    backlog_digest: cap.backlog_digest, provider_path: cap.provider_executable_path,
    provider_version: cap.provider_version, provider_identity: cap.provider_identity,
    run_harness_candidate_sha: cap.evaluated_candidate,
    now_epoch: cap.issued_epoch + 100, active_run: false, recovery_resolved: true, ...o,
  });
  let jobSeq = 0;
  const JOB = (id, o = {}) => ({ job_id: id, risk_class: o.risk || "WIDE_SAFE", effect_class: o.eff || "LOCAL_FS", gate_trigger: o.gate || "NONE", worktree: o.worktree !== undefined ? o.worktree : mkWt(id, o.branch || ("lane/" + id), o.mode), branch: o.branch || "lane/" + id, allowed_files: ["src/x/" + id + ".mjs"], forbidden_files: ["src/founder_url_drop/"], tests: ["t"], required_evidence: ["e"] });
  const run = (act, job, bind, capOverride) => runJob(act, job, bind, {
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
    executionCapability: capOverride === undefined ? cap : capOverride,
  });

  // =============================================================== C: DEEP IMMUTABILITY (SUPERVISOR_EXECUTION)
  // This stage can only be observed from inside a genuine supervisor, which is why it lives in this body.
  ok("F-C1 the SUPERVISOR_EXECUTION capability is deeply frozen (zero mutable nested objects)",
    mutableAuthorityPaths(cap).length === 0, JSON.stringify(mutableAuthorityPaths(cap)));
  ok("F-C2 cap.limits and cap.exclusions are both frozen on SUPERVISOR_EXECUTION",
    Object.isFrozen(cap.limits) && Object.isFrozen(cap.exclusions));
  {
    // Mutate EVERY nested signed numerical limit and EVERY signed exclusion, then require the authority
    // value AND the resulting projection to be unchanged.
    const before = { limits: { ...cap.limits }, exclusions: { ...cap.exclusions } };
    const beforeProjection = ACT();
    const attempted = [];
    for (const spec of V4_SIGNED_LIMITS) { try { cap.limits[spec.field] = 777777; } catch { /* strict-mode throw is also a pass */ } attempted.push(spec.field); }
    for (const f of V4_SIGNED_EXCLUSIONS) { try { cap.exclusions[f] = false; } catch { /* strict-mode throw is also a pass */ } attempted.push(f); }
    const limitsUnchanged = V4_SIGNED_LIMITS.every((s) => cap.limits[s.field] === before.limits[s.field]);
    const exclusionsUnchanged = V4_SIGNED_EXCLUSIONS.every((f) => cap.exclusions[f] === before.exclusions[f] && cap.exclusions[f] === true);
    ok("F-C3 every nested signed limit on SUPERVISOR_EXECUTION is unchanged after a direct write (" + V4_SIGNED_LIMITS.length + " limits)", limitsUnchanged, JSON.stringify(cap.limits));
    ok("F-C4 every signed exclusion on SUPERVISOR_EXECUTION is unchanged and still true (" + V4_SIGNED_EXCLUSIONS.length + " exclusions)", exclusionsUnchanged, JSON.stringify(cap.exclusions));
    const afterProjection = ACT();
    ok("F-C5 the projection derived AFTER the mutation attempt is byte-identical (projections read immutable authority)",
      JSON.stringify(beforeProjection) === JSON.stringify(afterProjection), JSON.stringify(afterProjection.max_budget_usd));
    ok("F-C6 the Checker's exact route — writing cap.limits.max_budget_usd = 777777 — no longer changes the projected budget",
      afterProjection.max_budget_usd === before.limits.max_budget_usd, "projected=" + afterProjection.max_budget_usd);
    ok("F-C7 a genuine projection is still bound to its capability after the failed mutation", projectionMatchesCapability(afterProjection, cap));
    ok("F-C8 attempts covered every nested numerical limit and every exclusion", attempted.length === V4_SIGNED_LIMITS.length + V4_SIGNED_EXCLUSIONS.length);
  }

  // =============================================================== B: THE 26-ROUTE INVALID MATRIX
  const honest = ACT();
  const copy = (o) => ({ ...honest, ...o });
  const spawnsBefore = spawnCount();
  const routes = [];
  const R = (name, act, capOv, job, bind) => routes.push({ name, act, capOv, job, bind });

  // --- capability-shaped attacks (7) ---
  R("no_capability", honest, null, JOB("r01"));
  R("null_capability", honest, null, JOB("r02"));
  R("VERIFIED_capability_only", honest, args.verifiedLike || {}, JOB("r03"));
  R("CONSUMED_capability_only", honest, { _stage: "CONSUMED", activation_identity: cap.activation_identity }, JOB("r04"));
  R("forged_SUPERVISOR_EXECUTION_shaped_object", honest, { ...JSON.parse(JSON.stringify({ ...cap })) }, JOB("r05"));
  R("structured_clone_of_the_real_capability", honest, structuredClone({ ...cap }), JOB("r06"));
  R("spread_copy_of_the_real_capability", honest, { ...cap }, JOB("r07"));
  // --- projection-binding attacks (4) ---
  R("copied_projection_wrong_claim_digest", copy({ v4_supervisor_claim_digest: "sha256:" + "9".repeat(64) }), undefined, JOB("r08"));
  R("copied_projection_wrong_activation_identity", copy({ v4_activation_identity: "sha256:" + "8".repeat(64) }), undefined, JOB("r09"));
  R("projection_claiming_authoritative_true", copy({ authoritative: true }), undefined, JOB("r10"));
  R("hand_written_v2_record_with_a_real_signature_shape", copy({ projection_schema: undefined, authoritative: undefined, founder_signature: "FOUNDER-SIGNED" }), undefined, JOB("r11"));
  // --- binding attacks (3) ---
  R("wrong_provider_identity", copy({ provider_executable_identity: "sha256:" + "7".repeat(64) }), undefined, JOB("r12"));
  R("wrong_candidate", honest, undefined, JOB("r13"), BIND({ run_harness_candidate_sha: "deadbeef" }));
  R("wrong_backlog_digest", copy({ backlog_digest: "sha256:" + "6".repeat(64) }), undefined, JOB("r14"));
  // --- job attacks (5) ---
  R("job_not_WIDE_SAFE", honest, undefined, JOB("r15", { risk: "NARROW" }));
  R("job_gated", honest, undefined, JOB("r16", { gate: "FOUNDER" }));
  R("job_LIVE_ACTION_or_NETWORK", honest, undefined, JOB("r17", { eff: "LIVE_ACTION" }));
  R("worktree_outside_the_allowed_root", honest, undefined, { ...JOB("r18"), worktree: FOREIGN });
  R("branch_outside_the_allowed_prefix", honest, undefined, JOB("r19", { branch: "rogue/r19" }));
  // --- the SIX routes the fresh Checker proved DID spawn the productive provider ---
  R("wrong_budget", copy({ max_budget_usd: 1000 }), undefined, JOB("r20"));
  R("wrong_timeout", copy({ per_job_timeout_s: 999999 }), undefined, JOB("r21"));
  R("wrong_width", copy({ max_parallel_width: 64 }), undefined, JOB("r22"));
  R("wrong_output_limit", copy({ max_output_bytes: 1e12 }), undefined, JOB("r23"));
  R("wrong_exclusion_no_deploy", copy({ no_deploy: false }), undefined, JOB("r24"));
  R("wrong_exclusion_no_push_unless_authorized", copy({ no_push_unless_authorized: false }), undefined, JOB("r25"));
  // --- permission bypass (1) ---
  R("permission_bypass_token_in_allowed_tools", copy({ allowed_tools: ["Read", "--dangerously-skip-permissions"] }), undefined, JOB("r26"));

  const results = [];
  for (const rt of routes) {
    const r = await run(rt.act, rt.job, rt.bind || BIND(), rt.capOv);
    results.push({ name: rt.name, outcome: r.outcome, invocation: r.provider_invocation, refusals: (r.refusals || []).slice(0, 2) });
  }
  const refused = results.filter((r) => r.outcome === "ACTIVATION_REFUSED");
  const spawnsAfter = spawnCount();
  ok("F-B1 the matrix drove exactly 26 invalid routes", routes.length === 26, "routes=" + routes.length);
  ok("F-B2 26/26 invalid routes were REFUSED", refused.length === 26, JSON.stringify(results.filter((r) => r.outcome !== "ACTIVATION_REFUSED")));
  ok("F-B3 ZERO provider processes were spawned across all 26 invalid routes (counted from the recording stub's own log)",
    spawnsAfter === spawnsBefore, "before=" + spawnsBefore + " after=" + spawnsAfter);
  ok("F-B4 no invalid route even ATTEMPTED a provider spawn (provider_invocation stayed PROVIDER_NOT_ATTEMPTED)",
    results.every((r) => r.invocation === "PROVIDER_NOT_ATTEMPTED"), JSON.stringify(results.filter((r) => r.invocation !== "PROVIDER_NOT_ATTEMPTED")));
  // The six routes the fresh Checker proved DID spawn the provider are now refused. Each is additionally
  // put through the boundary validator ON ITS OWN, to show the ceiling/exclusion enforcement is INDEPENDENT
  // authority — not a side effect of the projection-to-capability binding predicate that refuses first.
  const widenedCases = [
    ["wrong_budget", { max_budget_usd: 1000 }, "max_budget_usd"],
    ["wrong_timeout", { per_job_timeout_s: 999999 }, "per_job_timeout_s"],
    ["wrong_width", { max_parallel_width: 64 }, "max_parallel_width"],
    ["wrong_output_limit", { max_output_bytes: 1e12 }, "max_output_bytes"],
  ];
  for (const [name, over, field] of widenedCases) {
    const r = results.find((x) => x.name === name);
    ok("F-B5 " + name + " reached ACTIVATION_REFUSED with zero spawn", r && r.outcome === "ACTIVATION_REFUSED" && r.invocation === "PROVIDER_NOT_ATTEMPTED", JSON.stringify(r));
    const direct = enforceSignedAuthorityBoundary(cap, copy(over), JOB("d_" + field), BIND());
    ok("F-B5b the boundary validator INDEPENDENTLY refuses " + name + " as a widened signed ceiling",
      direct.ok === false && direct.refusals.join(" ").includes("V4_PROJECTED_LIMIT_WIDENS_SIGNED_CEILING") && direct.refusals.join(" ").includes(field), JSON.stringify(direct.refusals));
  }
  for (const excl of ["no_deploy", "no_push_unless_authorized"]) {
    const r = results.find((x) => x.name === "wrong_exclusion_" + excl);
    ok("F-B6 wrong_exclusion_" + excl + " reached ACTIVATION_REFUSED with zero spawn", r && r.outcome === "ACTIVATION_REFUSED" && r.invocation === "PROVIDER_NOT_ATTEMPTED", JSON.stringify(r));
    const direct = enforceSignedAuthorityBoundary(cap, copy({ [excl]: false }), JOB("de_" + excl), BIND());
    ok("F-B6b the boundary validator INDEPENDENTLY refuses " + excl + " = false as a dropped signed exclusion",
      direct.ok === false && direct.refusals.join(" ").includes("V4_PROJECTED_EXCLUSION_NOT_PRESERVED") && direct.refusals.join(" ").includes(excl), JSON.stringify(direct.refusals));
  }
  // Deadline widening, a copied projection and an unknown authority field are likewise refused independently.
  {
    const d1 = enforceSignedAuthorityBoundary(cap, copy({ hard_deadline_epoch: cap.hard_deadline_epoch + 100000 }), JOB("dl"), BIND());
    ok("F-B6c the boundary validator INDEPENDENTLY refuses a widened run deadline", d1.ok === false && d1.refusals.join(" ").includes("V4_PROJECTED_DEADLINE_WIDENS_SIGNED_AUTHORITY"), JSON.stringify(d1.refusals));
    const d2 = enforceSignedAuthorityBoundary(cap, copy({ v4_forged_authority: "yes" }), JOB("uf"), BIND());
    ok("F-B6d the boundary validator INDEPENDENTLY refuses an unknown authority-bearing field", d2.ok === false && d2.refusals.join(" ").includes("V4_UNKNOWN_AUTHORITY_FIELD"), JSON.stringify(d2.refusals));
    const d3 = enforceSignedAuthorityBoundary(cap, honest, JOB("okc"), BIND());
    ok("F-B6e the boundary validator ACCEPTS the honest projection (it is a ceiling, not a blanket refusal)", d3.ok === true, JSON.stringify(d3.refusals));
  }

  // --- EVERY signed exclusion individually flipped to false, and individually removed ---
  {
    let flipRefused = 0, dropRefused = 0;
    const before = spawnCount();
    for (const f of V4_SIGNED_EXCLUSIONS) {
      const flipped = await run(copy({ [f]: false }), JOB("x_" + f), BIND());
      if (flipped.outcome === "ACTIVATION_REFUSED") flipRefused++;
      const dropped = { ...honest }; delete dropped[f];
      const missing = await run(dropped, JOB("m_" + f), BIND());
      if (missing.outcome === "ACTIVATION_REFUSED") dropRefused++;
    }
    ok("F-B7 ALL " + V4_SIGNED_EXCLUSIONS.length + " signed exclusions individually set to false are refused", flipRefused === V4_SIGNED_EXCLUSIONS.length, "refused=" + flipRefused);
    ok("F-B8 ALL " + V4_SIGNED_EXCLUSIONS.length + " signed exclusions individually REMOVED are refused", dropRefused === V4_SIGNED_EXCLUSIONS.length, "refused=" + dropRefused);
    ok("F-B9 zero provider spawn across the per-exclusion sweep", spawnCount() === before, "delta=" + (spawnCount() - before));
  }

  // --- every signed numerical limit: zero / negative / NaN / Infinity / missing all fail ---
  {
    let bad = 0, total = 0;
    const before = spawnCount();
    for (const spec of V4_SIGNED_LIMITS) {
      if (spec.field === "run_duration_s") continue;               // run-wide, absent from the V2 projection
      for (const v of [0, -1, NaN, Infinity, undefined, "10"]) {
        total++;
        const rec = { ...honest }; if (v === undefined) delete rec[spec.field]; else rec[spec.field] = v;
        const r = await run(rec, JOB("l_" + spec.field + "_" + String(v)), BIND());
        if (r.outcome === "ACTIVATION_REFUSED") bad++;
      }
    }
    ok("F-B10 zero/negative/NaN/Infinity/missing/wrong-typed signed limits are ALL refused (" + total + " cases)", bad === total, "refused=" + bad + "/" + total);
    ok("F-B11 zero provider spawn across the invalid-limit sweep", spawnCount() === before, "delta=" + (spawnCount() - before));
  }

  // =============================================================== THE POSITIVE NARROWED ROUTE
  {
    const before = spawnCount();
    // A LEGITIMATELY NARROWED projection: the manifest narrows the budget, timeout, width and output cap.
    const narrowed = ACT({ output_cap_bytes: 4096, per_job_timeout_s: 4, max_parallel_width: 1 });
    ok("F-P1 the narrowed projection really is narrower than the signed ceiling",
      narrowed.max_output_bytes < cap.limits.max_output_bytes && narrowed.per_job_timeout_s < cap.limits.per_job_timeout_s && narrowed.max_parallel_width < cap.limits.max_parallel_width,
      JSON.stringify({ o: narrowed.max_output_bytes, t: narrowed.per_job_timeout_s, w: narrowed.max_parallel_width }));
    const r = await run(narrowed, JOB("positive", { mode: "success" }), BIND());
    ok("F-P2 one legitimate NARROWED projection still reaches the provider and SUCCEEDS", r.outcome === "SUCCESS", r.outcome + " " + JSON.stringify(r.refusals || []));
    ok("F-P3 the positive route spawned EXACTLY ONE deterministic stub process", spawnCount() === before + 1, "delta=" + (spawnCount() - before));
    const lines = spawnLines();
    const last = lines[lines.length - 1];
    ok("F-P4 the ONE spawned process received the NARROWED budget, never a widened one", last && Number(last.max_budget_usd) === narrowed.max_budget_usd && Number(last.max_budget_usd) <= cap.limits.max_budget_usd, JSON.stringify(last));
    ok("F-P5 no widened value ever reached argv across the whole matrix", lines.every((l) => Number(l.max_budget_usd) <= cap.limits.max_budget_usd), JSON.stringify(lines.map((l) => l.max_budget_usd)));
    ok("F-P6 the provider that ran is the SIGNED immutable resolved target (the recording stub), not the real Claude", narrowed.provider_resolved_target === cap.resolved_provider_target && cap.resolved_provider_target === args.recordingStub, cap.resolved_provider_target);
    ok("F-P7 the capability brand still holds after the whole matrix", isSupervisorExecutionCapabilityV4(cap));
  }

  return { checks, spawn_total: spawnCount(), routes: results };
}
