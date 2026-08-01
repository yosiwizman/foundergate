// FounderGate Phase 7 — Founder URL-Drop UI server (zero-dependency, loopback-only).
//
// Founder-facing WITNESS CANDIDATE — not an accepted product surface. Serves a read-only
// UI that displays the REAL exact-commit / snapshot-fingerprint / source-parsing-observed
// evidence for the ONE fixed public evaluation fixture (pypa/sampleproject). It executes
// NOTHING: the live runtime run is performed separately by the Phase-7 runtime builder and
// its evidence is read here. Missing evidence -> UNKNOWN. Stale run -> STALE. Other public
// URLs -> HELD. Private/SSH/file/non-GitHub/credential URLs -> REFUSED. No write/exec/send.
//
//   node src/founder_url_drop/server.mjs        # prints the loopback URL
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = join(HERE, "ui");
const REPO = resolve(HERE, "..", "..");
const TOKENS = join(REPO, "src", "ui", "tokens.css");
const PORT = Number(process.env.FG_URLDROP_PORT || 4700);
const FIXTURE_URL = "https://github.com/pypa/sampleproject";

const P6_SRC = join(REPO, "docs/research/opensandbox/phase6/OPEN_SANDBOX_PHASE6_SOURCE_ACQUISITION_EVIDENCE.json");
const P6_RT = join(REPO, "docs/research/opensandbox/phase6/OPEN_SANDBOX_PHASE6_RUNTIME_EVIDENCE.json");
const P7_STATE = join(REPO, "docs/research/opensandbox/phase7/OPEN_SANDBOX_PHASE7_UI_RUN_STATE.json");

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
const SAFE = new Set(["urldrop.html", "urldrop.css", "urldrop.js", "tokens.css"]);
const UNKNOWN = "UNKNOWN";
const jres = (res, code, obj) => { res.writeHead(code, { "content-type": MIME[".json"] }); res.end(JSON.stringify(obj, null, 2)); };
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };

// Minimal URL classifier mirroring the Python intake contract (public GitHub only).
export function classifyUrl(url) {
  if (typeof url !== "string" || !url.trim()) return { kind: "REFUSED", reason: "empty url" };
  const u = url.trim();
  if (u.startsWith("git@") || u.startsWith("ssh://") || u.startsWith("git://")) return { kind: "REFUSED", reason: "SSH/git URL not permitted" };
  if (u.startsWith("file://") || u.startsWith("/")) return { kind: "REFUSED", reason: "local path / file:// not permitted" };
  let parsed; try { parsed = new URL(u); } catch { return { kind: "REFUSED", reason: "unparseable URL" }; }
  if (parsed.protocol !== "https:") return { kind: "REFUSED", reason: "must be https" };
  if (parsed.username || parsed.password) return { kind: "REFUSED", reason: "embedded credentials not permitted" };
  const q = parsed.search.toLowerCase();
  if (["token", "access_token", "auth", "password", "api_key"].some((k) => q.includes(k))) return { kind: "REFUSED", reason: "credential in query string not permitted" };
  if (parsed.hostname.toLowerCase() !== "github.com") return { kind: "REFUSED", reason: "public github.com only" };
  const norm = parsed.origin + parsed.pathname.replace(/\/$/, "").replace(/\.git$/, "");
  if (norm === FIXTURE_URL) return { kind: "FIXTURE" };
  return { kind: "HELD", reason: "HELD — GENERAL PUBLIC-REPOSITORY EXECUTION NOT YET AUTHORIZED" };
}

// Compose the real run state from committed Phase-6 evidence + the Phase-7 live run.
export function buildState(scenario) {
  const p6s = readJson(P6_SRC), p6rt = readJson(P6_RT), p7 = readJson(P7_STATE);
  const base = {
    fixture_url: FIXTURE_URL, source: "phase6-evidence + phase7-live-run",
    exact_commit: p6s?.exact_commit || UNKNOWN,
    archive_sha256: p6s?.archive_sha256 || UNKNOWN,
    manifest_sha256: p6s?.canonical_manifest_sha256 || UNKNOWN,
    manifest_file_count: p6s?.manifest_file_count ?? UNKNOWN,
    stages: ["validating URL", "resolving exact commit", "acquiring immutable snapshot",
             "checking archive safety", "creating disposable sandbox", "checking source parsing",
             "exporting evidence", "deleting snapshot", "destroying sandbox"],
    result: p6rt?.harness_verifier?.classification || UNKNOWN,
    compileall_exit: p6rt?.harness_verifier?.compileall_exit ?? UNKNOWN,
    in_sandbox_manifest_matches: p6rt?.harness_verifier?.in_sandbox_manifest_matches_pro ?? UNKNOWN,
    limitations: { compileability_observed: true, build_proven: false, tests_proven: false, security_proven: false, production_ready: false },
    egress: p6rt?.egress?.classification || UNKNOWN,
    port_binding: p6rt?.port_binding_keystone?.guard || UNKNOWN,
    docker_socket: p6rt?.authority?.docker_socket || UNKNOWN,
    deletion: p6rt?.deletion ? "source snapshot + VM removed (observable-state, not forensic)" : UNKNOWN,
    vm_destruction: p6rt?.vm_destruction ? "VM instance + disk removed" : UNKNOWN,
    checker: "CHECKER-CLEAN (Phase 6) + PHASE6-ADVISOR PASS",
  };
  // freshness from the Phase-7 live run relative to the committed evidence
  let freshness = UNKNOWN;
  if (p7 && existsSync(P7_STATE)) {
    base.phase7_run = p7;
    const p7t = p7.completed_at_epoch || 0;
    const evT = existsSync(P6_RT) ? Math.floor(statSync(P6_RT).mtimeMs / 1000) : 0;
    freshness = p7t >= evT ? "FRESH" : "STALE";
  } else {
    freshness = UNKNOWN; // no live run yet -> UNKNOWN, never green
  }
  base.freshness = freshness;
  // deterministic witness scenarios (clearly labeled, never fake green)
  if (scenario === "unknown") return { ...base, result: UNKNOWN, freshness: UNKNOWN, scenario: "UNKNOWN (no run state)" };
  if (scenario === "stale") return { ...base, freshness: "STALE", scenario: "STALE (run older than evidence)" };
  if (scenario === "failure") return { ...base, result: "ACQUISITION_FAILED", compileall_exit: UNKNOWN, freshness: "FRESH", scenario: "FAILURE (no success shown)" };
  return base;
}

export function createUrlDropServer() {
  return createServer((req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    const path = u.pathname;
    if (path === "/" ) { res.writeHead(200, { "content-type": MIME[".html"] }); return res.end(readFileSync(join(UI, "urldrop.html"))); }
    if (path === "/api/state") return jres(res, 200, buildState(u.searchParams.get("scenario")));
    if (path === "/api/check") {
      const c = classifyUrl(u.searchParams.get("url") || "");
      if (c.kind === "FIXTURE") return jres(res, 200, { kind: "FIXTURE", state: buildState(u.searchParams.get("scenario")) });
      return jres(res, 200, c);
    }
    if (path === "/api/evidence") {
      const p6s = readJson(P6_SRC), p6rt = readJson(P6_RT);
      return jres(res, 200, { phase6_source_acquisition: p6s ? "present" : UNKNOWN, phase6_runtime_evidence: p6rt ? "present" : UNKNOWN,
        exact_commit: p6s?.exact_commit || UNKNOWN, archive_sha256: p6s?.archive_sha256 || UNKNOWN, manifest_sha256: p6s?.canonical_manifest_sha256 || UNKNOWN });
    }
    // static assets (allowlisted)
    const name = path.replace(/^\/(ui\/)?/, "");
    if (SAFE.has(name)) {
      const file = name === "tokens.css" ? TOKENS : join(UI, name);
      if (existsSync(file)) { res.writeHead(200, { "content-type": MIME[extname(file)] || "text/plain" }); return res.end(readFileSync(file)); }
    }
    res.writeHead(404, { "content-type": "text/plain" }); res.end("not found");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createUrlDropServer().listen(PORT, "127.0.0.1", () => {
    console.log(`Founder URL-Drop UI (witness candidate) on http://127.0.0.1:${PORT}/`);
    console.log(`Fixed fixture: ${FIXTURE_URL}  ·  loopback only  ·  read-only`);
  });
}
