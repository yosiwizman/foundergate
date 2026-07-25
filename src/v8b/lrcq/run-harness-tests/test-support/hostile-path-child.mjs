// FounderGate LRCQ — TEST-SUPPORT hostile-PATH attack child (FG-CHK-197-02). Structurally test-only.
//
// Runs a chosen authority observation with an ATTACKER-CONTROLLED PATH whose first entry contains hostile
// `git` and `ps` scripts. Each hostile script appends to a call log when invoked, so the parent can assert
// mechanically that the fake executables received ZERO invocations and that the production authority
// measurement still used the fixed absolute binaries.
//
// Modes:
//   consume   — a genuinely signed activation naming an ATTACKER-CHOSEN repository/lifecycle root; the
//               hostile git answers --show-toplevel with that directory. Must be REFUSED.
//   binding   — verifyRepositoryBinding via consumeActivationV4 against the LEGITIMATE signed root. Must
//               still succeed, proving the fixed git is what answered.
//   ps        — observedStartIdentity for this process. Must still return a real lstart identity.
import { readFileSync, existsSync } from "node:fs";
import { consumeActivationV4 } from "../../assurance/lifecycle-authority-v4.mjs";
import { observedStartIdentity } from "../../assurance/activation-v4.mjs";
import { verifyActivation } from "../../assurance/activation-v4.mjs";
import { fixedExecutableReport } from "../../assurance/fixed-executables.mjs";

function main() {
  const ci = process.argv.indexOf("--config");
  const cfg = JSON.parse(readFileSync(process.argv[ci + 1], "utf8"));
  const out = { mode: cfg.mode, path_env: process.env.PATH, fixed: fixedExecutableReport() };
  try {
    if (cfg.mode === "ps") {
      const id = observedStartIdentity(process.pid);
      out.observed_start_identity = id;
      out.ps_identity_looks_real = !!id && /lstart:/.test(id) && !/HOSTILE/.test(id);
    } else {
      const signed = JSON.parse(readFileSync(cfg.activationPath, "utf8"));
      const authorityDoc = JSON.parse(readFileSync(cfg.authorityPath, "utf8"));
      const keyDeps = { repo: "/disposable", exists: () => true, lstat: () => ({ isSymbolicLink: () => false }), readFile: () => JSON.stringify(authorityDoc) };
      const vr = verifyActivation(signed, { authorizationBytes: Buffer.from(cfg.authorizationB64, "base64"), nowEpoch: cfg.now }, { keyDeps });
      out.verify_code = vr.code;
      if (!vr.ok) { out.consume_code = "VERIFY_REFUSED"; }
      else {
        const c = consumeActivationV4(vr.capability, { now: cfg.now });
        out.consume_code = c.code;
        out.consume_ok = c.ok === true;
        out.marker_path = c.marker_path || null;
        if (cfg.evilRoot) out.marker_written_into_evil_root = !!(c.marker_path && c.marker_path.startsWith(cfg.evilRoot));
      }
    }
  } catch (e) { out.threw = String(e && e.message); }
  out.hostile_git_calls = existsSync(cfg.callLog) ? readFileSync(cfg.callLog, "utf8").trim().split("\n").filter(Boolean) : [];
  console.log(JSON.stringify(out));
  process.exit(0);
}
main();
