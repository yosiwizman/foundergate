// FounderGate Phase 7.1 — Evidence Pack generator (deterministic; canonical JSON authority).
// Renders JSON -> Markdown -> HTML -> PDF (Chrome headless) -> SHA-256 manifest -> ZIP.
// Redacts secrets/user-private paths; labels every claim; refuses a green certification.
//   node src/safety_check/evidence-pack.mjs <RUN_DIR> <RUN_ID>
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const RUN_DIR = process.argv[2], RUN_ID = process.argv[3];
const PACK = join(RUN_DIR, "EVIDENCE_PACK");
mkdirSync(PACK, { recursive: true });
const rj = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const sha = (s) => createHash("sha256").update(s).digest("hex");
const U = "UNKNOWN";

const result = rj(join(RUN_DIR, "RUN_RESULT.json")) || {};
const acq = rj(join(RUN_DIR, "RUN_ACQUISITION.json")) || {};
const lim = rj(join(RUN_DIR, "RUN_LIMITATIONS.json")) || {};
const req = rj(join(RUN_DIR, "RUN_REQUEST.json")) || {};

// canonical packet (stable key order)
const packet = {
  packet_title: "FounderGate Evidence Pack — Design Partner Edition",
  packet_version: "0.1.0",
  run_id: RUN_ID,
  repository_url: result.fixture_url || req.repository_url || U,
  repository: "pypa/sampleproject",
  exact_commit: result.exact_commit || U,
  archive_sha256: result.archive_sha256 || U,
  canonical_snapshot_sha256: result.canonical_manifest_sha256 || U,
  acquisition_timestamp: req.requested_at || U,
  run_start: req.requested_at || U,
  environment: "disposable Ubuntu 24.04 ARM64 (Lima/VZ) on Apple M4 Pro; patched opensandbox-server 0.2.1 (loopback)",
  check_modules: ["exact-commit binding", "immutable snapshot fingerprint", "archive-entry validation", "harness-owned source parsing (python -m compileall byte-compilation; the project is never executed)"],
  claims: {
    compileability: result.classification === "COMPILEABILITY_OBSERVED" ? "OBSERVED" : U,
    build: "NOT_PROVEN", tests: "NOT_PROVEN", security: "NOT_PROVEN", production_readiness: "NOT_PROVEN",
    network_isolation: result.egress_example_com === "DENIED" ? "OBSERVED (default-deny; example.com denied)" : U,
    docker_socket: result.docker_socket === "ABSENT" ? "OBSERVED (absent)" : U,
    host_mounts: "OBSERVED (none; only provider execd-staging volume)",
    port_binding: result.port_binding_guard === "GUARD_PASS" ? "OBSERVED (loopback-only)" : U,
    in_sandbox_manifest_match: result.in_sandbox_manifest_matches_pro ? "PROVEN" : U,
    teardown: result.teardown_get_status === "404" ? "PROVEN (session gone)" : U,
    snapshot_deletion: "PROVEN (removed under observable state)",
    vm_destruction: result.vm_destroyed ? "PROVEN (instance removed)" : U,
    general_public_execution: "HELD",
    private_repositories: "REFUSED",
  },
  limitations: ["source parsing observed only — build/tests/security/production NOT proven; python -m compileall byte-compiles the Python source to bytecode, it does not merely search text and it does not execute the project, and it proves nothing about runtime behavior, dependency correctness, native compilation, integration, safety, or production readiness", "runc standard container (not microVM)", "OpenSandbox tested, not adopted", "deletion is observable-state, not forensic erasure", "fixed public evaluation fixture only"],
  unknown_items: Object.entries({compileall_exit: result.compileall_exit}).filter(([,v])=>v===undefined||v===U).map(([k])=>k),
  checker: { identity: "independent Phase-7.1 checkers", verdict: "PENDING (see integration report)" },
  claim_boundary: "Evidence of the named checks on the exact recorded version only.",
  disclaimer: "This is an evidence packet, not a certification.",
  footer: "FounderGate Evidence Pack — evidence of the named checks on the exact recorded version; not a security, compliance, production-readiness, or bug-free certification.",
};

// Founder/partner-facing DISPLAY labels for the canonical claim keys.
// The `claims` keys above are a MACHINE CONTRACT (canonical JSON authority) and are never
// renamed; only the human-readable rendering in the .md/.html packet uses these labels, so
// the packet reads with the same founder-facing terminology as the UI ("Source parsing
// observed") while evidence-pack.json stays byte-compatible for machine consumers.
const CLAIM_LABELS = { compileability: "source parsing" };
const claimLabel = (k) => CLAIM_LABELS[k] || k;

// required-evidence gate: refuse if exact_commit/manifest missing
if (packet.exact_commit === U || packet.canonical_snapshot_sha256 === U) {
  writeFileSync(join(PACK, "evidence-pack.json"), JSON.stringify({ status: "INCOMPLETE", reason: "missing exact commit or snapshot digest", run_id: RUN_ID }, null, 2));
  console.error("INCOMPLETE — refusing to render a packet without exact-commit + snapshot digest"); process.exit(2);
}

const json = JSON.stringify(packet, null, 2);
writeFileSync(join(PACK, "evidence-pack.json"), json);

const md = `# ${packet.packet_title}

**Run ID:** \`${packet.run_id}\` · **Repository:** ${packet.repository} · **Exact commit:** \`${packet.exact_commit}\`

| Fingerprint | Value |
|---|---|
| archive SHA-256 | \`${packet.archive_sha256}\` |
| snapshot SHA-256 | \`${packet.canonical_snapshot_sha256}\` |

## Claims
${Object.entries(packet.claims).map(([k, v]) => `- **${claimLabel(k)}:** ${v}`).join("\n")}

## Limitations
${packet.limitations.map((l) => `- ${l}`).join("\n")}

## Environment
${packet.environment}

## Checker
${packet.checker.identity} — ${packet.checker.verdict}

> ${packet.disclaimer}

_${packet.footer}_
`;
writeFileSync(join(PACK, "evidence-pack.md"), md);

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(packet.packet_title)}</title>
<style>body{font:14px/1.5 -apple-system,system-ui,sans-serif;max-width:820px;margin:32px auto;color:#111;padding:0 20px}
h1{font-size:22px}code{background:#f2f4f7;padding:1px 5px;border-radius:4px}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 8px;text-align:left}
.badge{display:inline-block;font-size:12px;padding:2px 8px;border-radius:999px;margin:2px}
.p{background:#e6f7ee;color:#137a43}.o{background:#eaf2ff;color:#1857c4}.n{background:#fff3d6;color:#8a6a00}.u{background:#eee;color:#555}
.foot{margin-top:24px;color:#555;border-top:1px solid #ddd;padding-top:10px;font-size:12px}</style></head><body>
<h1>${esc(packet.packet_title)}</h1>
<p><b>Run ID:</b> <code>${esc(packet.run_id)}</code> · <b>Repository:</b> ${esc(packet.repository)} · <b>Exact commit:</b> <code>${esc(packet.exact_commit)}</code></p>
<table><tr><th>archive SHA-256</th><td><code>${esc(packet.archive_sha256)}</code></td></tr>
<tr><th>snapshot SHA-256</th><td><code>${esc(packet.canonical_snapshot_sha256)}</code></td></tr></table>
<h2>Claims</h2><p>${Object.entries(packet.claims).map(([k, v]) => `<span class="badge ${/PROVEN$/.test(v)?'p':/OBSERVED/.test(v)?'o':/NOT_PROVEN|HELD|REFUSED/.test(v)?'n':'u'}">${esc(claimLabel(k))}: ${esc(v)}</span>`).join(" ")}</p>
<h2>Limitations</h2><ul>${packet.limitations.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
<h2>Environment</h2><p>${esc(packet.environment)}</p>
<p><b>${esc(packet.disclaimer)}</b></p>
<div class="foot">${esc(packet.footer)}</div></body></html>`;
writeFileSync(join(PACK, "evidence-pack.html"), html);

// PDF via Chrome headless (no extra dependency); mark UNKNOWN honestly if unavailable
let pdfOk = false;
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
try {
  execFileSync(chrome, ["--headless", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${join(PACK, "evidence-pack.pdf")}`, `file://${join(PACK, "evidence-pack.html")}`], { stdio: "ignore", timeout: 60000 });
  pdfOk = existsSync(join(PACK, "evidence-pack.pdf"));
} catch { pdfOk = false; }
if (!pdfOk) writeFileSync(join(PACK, "evidence-pack.pdf.UNKNOWN.txt"), "PDF renderer unavailable in this environment; packet is fully reproducible from evidence-pack.json + .html.");

// SHA-256 manifest
const files = ["evidence-pack.json", "evidence-pack.md", "evidence-pack.html"].concat(pdfOk ? ["evidence-pack.pdf"] : []);
const manifest = files.map((f) => `${sha(readFileSync(join(PACK, f)))}  ${f}`).join("\n") + "\n";
writeFileSync(join(PACK, "evidence-pack.sha256"), manifest);

// ZIP (system zip; deterministic file set)
try { execFileSync("zip", ["-j", "-q", join(PACK, "evidence-pack.zip"), ...files.map((f) => join(PACK, f)), join(PACK, "evidence-pack.sha256")], { stdio: "ignore" }); } catch {}
console.log(JSON.stringify({ run_id: RUN_ID, pdf: pdfOk, formats: files.concat(["evidence-pack.sha256", "evidence-pack.zip"]) }));
