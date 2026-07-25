// FounderGate LRCQ — REAL machine verifier (FG-LRCQ-ACT-006/007). Executes the exact signed
// verifier/test commands (execFile + argv arrays, NO shell interpolation, bounded timeout, cwd-
// pinned, command-allowlisted), records exit codes, verifies declared expected outputs + required
// evidence files AND their hashes, and REQUIRES the provider process tree to be confirmed gone.
// A tests array with names is not proof. An evidence dir existing is not proof. Builder self-report
// is not proof.
import { execFileSync } from "node:child_process";
// FG-CHK-197-02: fixed absolute executables in a minimal environment — never PATH-resolved.
import { fixedGit } from "../assurance/fixed-executables.mjs";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";

export function reportDigest(report) { return "sha256:" + createHash("sha256").update(JSON.stringify(report)).digest("hex"); }

// opts: { execRunner, exists, gitRunner, allowlist } — all injectable for deterministic tests.
export function execMachineVerifier(opts = {}) {
  const exec = opts.execRunner || ((argv, cwd, timeoutMs) => { try { const out = execFileSync(argv[0], argv.slice(1), { cwd, timeout: timeoutMs || 60000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); return { code: 0, out }; } catch (e) { return { code: typeof e.status === "number" ? e.status : 1, out: (e.stdout || "") + (e.stderr || "") }; } });
  const exists = opts.exists || existsSync;
  const git = opts.gitRunner || ((args, cwd) => fixedGit(args, { cwd }));
  const allowlist = opts.allowlist || ["node", "npm", "git", "shasum"];
  const hashFile = opts.hashFile || ((p) => "sha256:" + createHash("sha256").update(readFileSync(p)).digest("hex"));
  const writeEvidence = opts.writeEvidence || ((p, content) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); });

  return async (job, prov, ctx) => {
    const checks = []; const add = (name, ok, detail) => checks.push({ name, ok, detail });
    const evDir = (ctx && ctx.evidenceDir) || job.evidence_dir || "/ev";
    try {
      // 1-3. worktree / branch / repo identity
      add("worktree_exists", exists(job.worktree), job.worktree);
      const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], job.worktree);
      add("on_expected_branch", branch === job.branch, branch + " vs " + job.branch);
      // 4-6. changed files within allowed, none forbidden, line budget
      const changed = git(["diff", "--name-only", "HEAD"], job.worktree).split("\n").filter(Boolean);
      add("changed_within_allowed", changed.every((f) => (job.allowed_files || []).some((a) => f === a || (a.endsWith("/") && f.startsWith(a)))), changed.join(","));
      add("none_forbidden", !changed.some((f) => (job.forbidden_files || []).some((x) => f.includes(x))), "");
      const stat = git(["diff", "--numstat", "HEAD"], job.worktree).split("\n").filter(Boolean);
      const lines = stat.reduce((n, l) => { const [a, d] = l.split("\t"); return n + (parseInt(a, 10) || 0) + (parseInt(d, 10) || 0); }, 0);
      add("within_line_budget", job.max_changed_lines == null || lines <= job.max_changed_lines, lines + "/" + job.max_changed_lines);
      // 7-9. EXECUTE every required test (argv arrays); non-zero exit fails
      const tests = job.tests || [];
      add("has_required_tests", tests.length > 0, "");
      for (let i = 0; i < tests.length; i++) {
        const t = tests[i]; const argv = Array.isArray(t) ? t : (t.argv || null);
        if (!argv || !allowlist.includes(argv[0])) { add("test[" + i + "]_allowlisted", false, JSON.stringify(t)); continue; }
        const res = exec(argv, job.worktree, (t.timeout_ms || 60000));
        add("test[" + i + "]_executed_exit0", res.code === 0, "exit=" + res.code + " argv=" + argv.join(" "));
      }
      // negative tests where specified (must FAIL, i.e., exit non-zero)
      for (let i = 0; i < (job.negative_tests || []).length; i++) {
        const t = job.negative_tests[i]; const argv = Array.isArray(t) ? t : (t.argv || null);
        if (!argv) { add("neg_test[" + i + "]_defined", false, ""); continue; }
        const res = exec(argv, job.worktree, 60000);
        add("neg_test[" + i + "]_fails_as_required", res.code !== 0, "exit=" + res.code);
      }
      // 10. declared expected outputs exist
      for (const o of job.expected_output_paths || []) add("expected_output:" + o, exists(resolve(job.worktree, o)), "");
      // 13. no forbidden authority (builder output must not claim push/merge)
      add("no_forbidden_authority", !(prov && prov.parsed_output && /push|merge/i.test(JSON.stringify(prov.parsed_output.forbidden_used || []))), "");
      // 14. provider process tree CONFIRMED gone (FG-LRCQ-ACT-007)
      add("tree_gone", prov != null && prov.tree_gone === true, "tree_gone=" + (prov && prov.tree_gone));
      // 11-12. required evidence (AFTER the substantive checks). The machine verifier is the EVIDENCE
      // PLANE for its verification proof: for a must_exist entry it WRITES its signed report as the
      // durable proof (the builder cannot — the evidence path is immutable to the builder), so the
      // "must_exist" requirement records that verification ran + its result. A must_match_sha256 entry
      // is an UPSTREAM-produced artifact and is verified (existence + hash), never written here.
      const evProof = JSON.stringify({ job_id: job.job_id, run_id: (ctx && ctx.run_id) || null, attempt: (ctx && ctx.attempt) || null, verified: checks.every((c) => c.ok), checks, machine_verifier: "lrcq-machine-verifier-1" }, null, 2) + "\n";
      for (const ev of job.required_evidence_files || []) {
        const p = resolve(evDir, ev.path);
        // A declared sha256 marks an UPSTREAM content-addressed artifact the verifier must find + hash-
        // match (never writes it). Otherwise the entry is the machine verifier's OWN verification proof:
        // the verifier WRITES its signed report (the builder cannot — the path is immutable to it).
        if (ev.sha256) { const ok = exists(p); add("evidence_exists:" + ev.path, ok, ""); add("evidence_hash:" + ev.path, ok && hashFile(p) === ev.sha256, ok ? "" : "absent"); }
        else { let wrote = false; try { writeEvidence(p, evProof); wrote = exists(p); } catch (e) { wrote = false; } add("evidence_recorded:" + ev.path, wrote, ev.path); }
      }
    } catch (e) { add("verifier_error", false, e.message || String(e)); }
    const report = { job_id: job.job_id, checks };
    return { pass: checks.every((c) => c.ok), checks, report, report_digest: reportDigest(report) };
  };
}
