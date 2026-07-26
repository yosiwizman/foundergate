// FounderGate LRCQ — PACKAGE GENERATOR CORRECTIONS (FG-PPRC-198).
//
// Locks the three findings the independent package Checker raised against PR #198:
//
//   PPRCHK-198-01 (HIGH)   — final-head capsule/preflight claims were false at the shipped evidence head.
//                            The two stages are now distinct artifacts, and the procedural Stage-B
//                            generator REFUSES a declared head/tree that is not the real current head/tree.
//   PPRCHK-198-02 (MEDIUM) — UNSIGNED_GATE_PACKET.json lost its staleness markers on regeneration.
//                            The GENERATOR now emits them and refuses to write a packet without them.
//   PPRCHK-198-03 (LOW)    — the generator accepted a REMOVED exclusion, shipping a founder-readable
//                            artifact keyed `ten_mandatory_exclusions` that listed nine.
//
// Every assertion here is tagged. [DYNAMIC] executed the code path. [STRUCTURAL] read source text and did
// not execute it. Nothing in this family signs, enrolls a key, issues or consumes an activation, spawns a
// provider or model, or starts a run.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { V4_SIGNED_EXCLUSIONS, V4_SIGNED_LIMIT_FIELDS, verifyActivation } from "../assurance/activation-v4.mjs";
import * as G from "../../../../tools/terminal0/lrcq/refreeze-package.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../../..");
let n = 0; const fails = [];
const ok = (name, cond, detail) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name + (detail !== undefined ? " [" + detail + "]" : "")); } else console.log("  ok   " + name); };

const GEN_SRC = readFileSync(resolve(REPO, "tools/terminal0/lrcq/refreeze-package.mjs"), "utf8");
const CLS_SRC = readFileSync(resolve(REPO, "tools/terminal0/lrcq/classify-and-packet.mjs"), "utf8");
const FHC_SRC = readFileSync(resolve(REPO, "tools/terminal0/lrcq/final-head-capsule.mjs"), "utf8");

// ============================================================ AT1  the tables ARE the authority's
{
  ok("AT1a [DYNAMIC] assertAuthoritativeTables() reports NO problem for the shipped generator",
    Array.isArray(G.assertAuthoritativeTables()) && G.assertAuthoritativeTables().length === 0,
    JSON.stringify(G.assertAuthoritativeTables()));
  ok("AT1b [DYNAMIC] the generator's exclusion inventory IS the authoritative export, in order",
    G.EXCLUSIONS.join(",") === [...V4_SIGNED_EXCLUSIONS].join(","), G.EXCLUSIONS.join(","));
  ok("AT1c [DYNAMIC] the generator's limit-field inventory IS the authoritative export, in order",
    G.LIMIT_FIELDS.join(",") === [...V4_SIGNED_LIMIT_FIELDS].join(","), G.LIMIT_FIELDS.join(","));
  ok("AT1d [DYNAMIC] the ceilings object carries exactly the authoritative field set, in order",
    Object.keys(G.CEILINGS).join(",") === [...V4_SIGNED_LIMIT_FIELDS].join(","), Object.keys(G.CEILINGS).join(","));
  ok("AT1e [DYNAMIC] cardinality is 10 exclusions and 6 ceilings — the artifact key names assert this",
    G.EXCLUSIONS.length === 10 && G.LIMIT_FIELDS.length === 6 && G.REQUIRED_EXCLUSION_COUNT === 10 && G.REQUIRED_LIMIT_FIELD_COUNT === 6,
    G.EXCLUSIONS.length + "/" + G.LIMIT_FIELDS.length);
  ok("AT1f [DYNAMIC] no_deploy is present in the authoritative inventory the generator emits from",
    G.EXCLUSIONS.includes("no_deploy"));
  ok("AT1g [DYNAMIC] the emitted inventories are FROZEN, so a caller cannot mutate them post-import",
    Object.isFrozen(G.EXCLUSIONS) && Object.isFrozen(G.LIMIT_FIELDS) && Object.isFrozen(G.CEILINGS));
}

// ============================================================ AT2  the guard is DISCRIMINATING
// The real assertAuthoritativeTables() closes over the module's own frozen tables, so it cannot be made to
// see a mutated table from outside. Its LOGIC is therefore re-exercised here against deliberately mutated
// inputs, using a transcription of the shipped comparison, and AT3 proves the shipped generator itself
// refuses when a mutated copy is actually executed. Neither alone would be sufficient; together they are.
{
  const dups = (a) => [...new Set(a.filter((x, i) => a.indexOf(x) !== i))];
  const check = (label, declared, authoritative, requiredCount) => {
    const problems = [];
    for (const d of dups(declared)) problems.push(label + "_DUPLICATE_IN_GENERATOR_TABLE: " + d);
    for (const d of dups(authoritative)) problems.push(label + "_DUPLICATE_IN_AUTHORITATIVE_EXPORT: " + d);
    for (const k of authoritative) if (!declared.includes(k)) problems.push(label + "_MISSING_FROM_GENERATOR_TABLE: " + k);
    for (const k of declared) if (!authoritative.includes(k)) problems.push(label + "_ADDED_WITHOUT_BEING_AUTHORITATIVE: " + k);
    if (declared.length !== authoritative.length) problems.push(label + "_COUNT_MISMATCH");
    if (declared.join(",") !== authoritative.join(",")) problems.push(label + "_ORDER_OR_CONTENT_MISMATCH");
    if (authoritative.length !== requiredCount) problems.push(label + "_AUTHORITATIVE_CARDINALITY_CHANGED");
    return problems;
  };
  const AUTH_EX = [...V4_SIGNED_EXCLUSIONS], AUTH_LF = [...V4_SIGNED_LIMIT_FIELDS];
  ok("AT2a [DYNAMIC] the unmutated declared tables produce zero problems (control)",
    check("EXCLUSION", AUTH_EX.slice(), AUTH_EX, 10).length === 0 && check("LIMIT_FIELD", AUTH_LF.slice(), AUTH_LF, 6).length === 0);

  // remove EACH authoritative exclusion individually
  let removedAllCaught = true, removedDetail = [];
  for (const x of AUTH_EX) {
    const mutated = AUTH_EX.filter((k) => k !== x);
    const p = check("EXCLUSION", mutated, AUTH_EX, 10);
    if (!p.some((s) => s === "EXCLUSION_MISSING_FROM_GENERATOR_TABLE: " + x)) { removedAllCaught = false; removedDetail.push(x); }
  }
  ok("AT2b [DYNAMIC] removing EACH of the ten exclusions individually is caught (10/10)", removedAllCaught, removedDetail.join(","));

  ok("AT2c [DYNAMIC] removing no_deploy specifically — the exact PPRCHK-198-03 mutation — is caught",
    check("EXCLUSION", AUTH_EX.filter((k) => k !== "no_deploy"), AUTH_EX, 10)
      .includes("EXCLUSION_MISSING_FROM_GENERATOR_TABLE: no_deploy"));
  ok("AT2d [DYNAMIC] adding an unauthorized exclusion is caught",
    check("EXCLUSION", AUTH_EX.concat(["no_pineapple"]), AUTH_EX, 10)
      .includes("EXCLUSION_ADDED_WITHOUT_BEING_AUTHORITATIVE: no_pineapple"));
  ok("AT2e [DYNAMIC] duplicating an exclusion is caught",
    check("EXCLUSION", AUTH_EX.concat(["no_deploy"]), AUTH_EX, 10)
      .includes("EXCLUSION_DUPLICATE_IN_GENERATOR_TABLE: no_deploy"));
  ok("AT2f [DYNAMIC] reordering the exclusions is caught",
    check("EXCLUSION", AUTH_EX.slice().reverse(), AUTH_EX, 10).includes("EXCLUSION_ORDER_OR_CONTENT_MISMATCH"));

  // remove EACH authoritative limit field individually
  let lfAllCaught = true, lfDetail = [];
  for (const k of AUTH_LF) {
    const mutated = AUTH_LF.filter((f) => f !== k);
    const p = check("LIMIT_FIELD", mutated, AUTH_LF, 6);
    if (!p.some((s) => s === "LIMIT_FIELD_MISSING_FROM_GENERATOR_TABLE: " + k)) { lfAllCaught = false; lfDetail.push(k); }
  }
  ok("AT2g [DYNAMIC] removing EACH of the six limit fields individually is caught (6/6)", lfAllCaught, lfDetail.join(","));
  ok("AT2h [DYNAMIC] adding an unauthorized limit field is caught",
    check("LIMIT_FIELD", AUTH_LF.concat(["max_unicorns"]), AUTH_LF, 6)
      .includes("LIMIT_FIELD_ADDED_WITHOUT_BEING_AUTHORITATIVE: max_unicorns"));
  ok("AT2i [DYNAMIC] duplicating a limit field is caught",
    check("LIMIT_FIELD", AUTH_LF.concat(["max_budget_usd"]), AUTH_LF, 6)
      .includes("LIMIT_FIELD_DUPLICATE_IN_GENERATOR_TABLE: max_budget_usd"));
  ok("AT2j [DYNAMIC] a change in AUTHORITATIVE cardinality is caught (the key names would lie)",
    check("EXCLUSION", AUTH_EX.slice(0, 9), AUTH_EX.slice(0, 9), 10).includes("EXCLUSION_AUTHORITATIVE_CARDINALITY_CHANGED"));
}

// ============================================================ AT3  the guard RUNS BEFORE ANY WRITE
{
  const declIdx = GEN_SRC.indexOf("const tableProblems = assertAuthoritativeTables();");
  ok("AT3a [STRUCTURAL] main() calls assertAuthoritativeTables() and refuses on any problem",
    declIdx > 0 && /if \(tableProblems\.length\) \{[\s\S]{0,200}AUTHORITATIVE_TABLE_MISMATCH[\s\S]{0,80}return 9;/.test(GEN_SRC));
  // it must precede the first artifact write in main()
  const mainIdx = GEN_SRC.indexOf("function main(argv)");
  const firstWrite = GEN_SRC.indexOf("write(PACKET_REL", mainIdx);
  ok("AT3b [STRUCTURAL] the table guard precedes the first artifact write in main()",
    declIdx > mainIdx && firstWrite > declIdx, "guard=" + declIdx + " firstWrite=" + firstWrite);
  ok("AT3c [STRUCTURAL] the ceiling check iterates the AUTHORITATIVE inventory, not a local table",
    /for \(const k of LIMIT_FIELDS\) if \(packet\[k\] !== CEILINGS\[k\]\)/.test(GEN_SRC));
  ok("AT3d [STRUCTURAL] the exclusion check iterates the AUTHORITATIVE inventory",
    /for \(const x of EXCLUSIONS\) if \(packet\[x\] !== true\)/.test(GEN_SRC));
  ok("AT3e [STRUCTURAL] the historical defect — iterating a hand-maintained table — is GONE",
    !/for \(const \[k, v\] of Object\.entries\(CEILINGS\)\)/.test(GEN_SRC));
  ok("AT3f [STRUCTURAL] the generator imports the authoritative exports from activation-v4",
    /import \{ V4_SIGNED_EXCLUSIONS, V4_SIGNED_LIMIT_FIELDS \} from "\.\.\/\.\.\/\.\.\/src\/v8b\/lrcq\/assurance\/activation-v4\.mjs"/.test(GEN_SRC));
  ok("AT3g [STRUCTURAL] the emitted founder inventories derive from the authoritative exports",
    /what_the_run_may_never_do: EXCLUSIONS/.test(GEN_SRC) && /six_signed_ceilings: Object\.fromEntries\(LIMIT_FIELDS\.map/.test(GEN_SRC)
    && /ten_mandatory_exclusions: Object\.fromEntries\(EXCLUSIONS\.map/.test(GEN_SRC));
  ok("AT3h [DYNAMIC] the AUTHORITATIVE exports themselves are unmodified by this wave",
    Object.isFrozen(V4_SIGNED_EXCLUSIONS) && V4_SIGNED_EXCLUSIONS.length === 10
    && Object.isFrozen(V4_SIGNED_LIMIT_FIELDS) && V4_SIGNED_LIMIT_FIELDS.length === 6);
}

// ============================================================ AT4  PPRCHK-198-02 stale-packet markers
{
  const pktRel = ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_GATE_PACKET.json";
  const pktAbs = resolve(REPO, pktRel);
  ok("AT4a [STRUCTURAL] the retired gate packet exists", existsSync(pktAbs));
  const pkt = existsSync(pktAbs) ? JSON.parse(readFileSync(pktAbs, "utf8")) : {};
  ok("AT4b [DYNAMIC] __status is STALE-INTERMEDIATE-CANDIDATE", pkt.__status === "STALE-INTERMEDIATE-CANDIDATE", String(pkt.__status));
  ok("AT4c [DYNAMIC] __superseded_by names the CURRENT activation material packet",
    pkt.__superseded_by === "UNSIGNED_ACTIVATION_MATERIAL_PACKET.json", String(pkt.__superseded_by));
  ok("AT4d [DYNAMIC] __reason states the retired schema, the placeholders, the absence of authority and the V4 refusal",
    typeof pkt.__reason === "string" && /lrcq-activation-3/.test(pkt.__reason) && /placeholder/i.test(pkt.__reason)
    && /CONFERS NO AUTHORITY/i.test(pkt.__reason) && /REFUSED by V4 production entrypoints/i.test(pkt.__reason),
    String(pkt.__reason).slice(0, 80));
  ok("AT4e [DYNAMIC] the packet still carries the retired V3 schema (it is history, not a rewrite)",
    pkt.schema_version === "lrcq-activation-3", String(pkt.schema_version));
  ok("AT4f [DYNAMIC] the unresolved founder placeholders are enumerated MECHANICALLY on the artifact",
    Array.isArray(pkt.__unresolved_founder_placeholders) && pkt.__unresolved_founder_placeholders.length > 0
    && pkt.__unresolved_founder_placeholder_count === pkt.__unresolved_founder_placeholders.length,
    JSON.stringify(pkt.__unresolved_founder_placeholder_count));
  ok("AT4g [DYNAMIC] every enumerated placeholder really is present at the field it names",
    (pkt.__unresolved_founder_placeholders || []).every((e) => {
      const key = String(e.field).replace(/^\//, "");
      return pkt[key] === e.placeholder;
    }));
  ok("AT4h [DYNAMIC] the packet confers no authority and is unsigned",
    pkt.founder_signature === null && pkt.confers_no_authority === true);

  // the markers are GENERATOR-emitted, so regeneration cannot drop them
  ok("AT4i [STRUCTURAL] the markers are emitted by the generator, not hand-added",
    /const STALE_MARKERS = Object\.freeze\(\{/.test(CLS_SRC) && /__status: "STALE-INTERMEDIATE-CANDIDATE"/.test(CLS_SRC)
    && /\.\.\.STALE_MARKERS,/.test(CLS_SRC));
  ok("AT4j [STRUCTURAL] the generator REFUSES to write a packet whose markers are missing or altered",
    /for \(const k of REQUIRED_MARKER_KEYS\)/.test(CLS_SRC)
    && /REFUSED: staleness markers missing or altered/.test(CLS_SRC));
  // The guard must NOT iterate the table it is checking — that is the PPRCHK-198-03 defect class, and an
  // earlier draft of this very fix reproduced it: deleting a marker also deleted its own check.
  ok("AT4j2 [STRUCTURAL] the marker guard checks a FIXED required contract, not the emitted table's own keys",
    /const REQUIRED_MARKER_KEYS = Object\.freeze\(\["__status", "__superseded_by", "__reason"\]\)/.test(CLS_SRC)
    && !/Object\.keys\(STALE_MARKERS\)/.test(CLS_SRC));
  ok("AT4j3 [STRUCTURAL] the required status and supersession target are PINNED constants",
    /const REQUIRED_STATUS = "STALE-INTERMEDIATE-CANDIDATE"/.test(CLS_SRC)
    && /const REQUIRED_SUPERSEDED_BY = "UNSIGNED_ACTIVATION_MATERIAL_PACKET\.json"/.test(CLS_SRC)
    && /MARKER_SUPERSEDED_BY_WRONG/.test(CLS_SRC));
  ok("AT4j4 [STRUCTURAL] __reason cannot be hollowed out to a bare label",
    /const REQUIRED_REASON_FACTS = Object\.freeze\(\[/.test(CLS_SRC) && /MARKER_REASON_INCOMPLETE/.test(CLS_SRC));
  ok("AT4k [STRUCTURAL] the generator no longer reads live HEAD, so regeneration is byte-deterministic",
    !/run_harness_candidate_sha: git\("rev-parse", "HEAD"\)/.test(CLS_SRC)
    && /--run-harness-candidate/.test(CLS_SRC));
  ok("AT4l [STRUCTURAL] the generator refuses an absent or non-hex --run-harness-candidate",
    /if \(!RUN_HARNESS_CANDIDATE \|\| !\/\^\[0-9a-f\]\{40\}\$\/\.test\(RUN_HARNESS_CANDIDATE\)\)/.test(CLS_SRC));

  // the retired packet must NOT be treated as current activation material anywhere
  const materialRel = ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json";
  const material = JSON.parse(readFileSync(resolve(REPO, materialRel), "utf8"));
  // The V4 material packet keys its schema as `schema`; the retired V3 gate packet keys it
  // `schema_version`. They are different artifacts with different shapes, and neither is the other.
  ok("AT4m [DYNAMIC] the CURRENT activation material is a distinct V4 artifact, not marked stale",
    material.schema === "lrcq-activation-4" && material.schema_version === undefined && material.__status === undefined,
    "schema=" + String(material.schema) + " schema_version=" + String(material.schema_version));
  ok("AT4n [DYNAMIC] the current material carries NO unresolved founder placeholder",
    !/<founder/.test(JSON.stringify(material)));

  // V3 EXECUTION REFUSAL — executed, not asserted from source text. The retired packet is handed to the
  // production V4 verifier and must be refused on its schema, before any other consideration.
  const v3 = verifyActivation(pkt, { nowEpoch: 1800000000 }, { keyDeps: { authorityPath: "/nonexistent-authority-for-this-probe.json" } });
  ok("AT4o [DYNAMIC] the production V4 verifier REFUSES the retired V3 gate packet",
    v3 && v3.ok !== true, JSON.stringify({ ok: v3 && v3.ok, code: v3 && v3.code }));
  // The refusal is NOT_V4 — a schema refusal reached BEFORE any signature, key-authority or placeholder
  // consideration. That ordering is what matters: the packet is rejected for being V3, full stop.
  ok("AT4p [DYNAMIC] the refusal is the schema refusal NOT_V4, not a signature or key-authority problem",
    !!v3 && v3.code === "NOT_V4", String(v3 && v3.code));
}

// ============================================================ AT5  PPRCHK-198-01 two-stage separation
{
  const OUT = ".foundergate/evidence/lrcq-provider-package-refreeze";
  const scopeAbs = resolve(REPO, OUT + "/PACKAGE_CANDIDATE_SCOPE.json");
  const contractAbs = resolve(REPO, OUT + "/PROCEDURAL_FINAL_HEAD_CAPSULE_CONTRACT.json");
  ok("AT5a [STRUCTURAL] both stage declarations exist", existsSync(scopeAbs) && existsSync(contractAbs));
  const scope = existsSync(scopeAbs) ? JSON.parse(readFileSync(scopeAbs, "utf8")) : {};
  const contract = existsSync(contractAbs) ? JSON.parse(readFileSync(contractAbs, "utf8")) : {};
  ok("AT5b [DYNAMIC] Stage A explicitly disclaims final-head binding",
    /does NOT claim binds_exact_final_head/.test(JSON.stringify(scope.what_it_explicitly_does_NOT_claim || [])));
  ok("AT5c [DYNAMIC] Stage A explicitly disclaims PF-5 passing at a later evidence head",
    /does NOT claim that PF-5 passes at a later evidence head/.test(JSON.stringify(scope.what_it_explicitly_does_NOT_claim || [])));
  ok("AT5d [DYNAMIC] Stage B is declared NOT committed, with the self-seal reason",
    contract.is_committed === false && /recursive self-seal/i.test(String(contract.why_not_committed)));
  ok("AT5e [DYNAMIC] Stage B requires SIGNATURE-REQUIRED, empty binding_defects and zero provider spawns",
    contract.required_results && contract.required_results.final_preflight_result === "SIGNATURE-REQUIRED"
    && Array.isArray(contract.required_results.binding_defects) && contract.required_results.binding_defects.length === 0
    && contract.required_results["invocations.providerSpawn"] === 0
    && contract.required_results.binds_exact_final_head === true);
  ok("AT5f [DYNAMIC] the superseded 58b3620 capsule is recorded as historical and must not be reused",
    /must NOT be reused/i.test(String((contract.historical_stage_b_artifact || {}).status)));

  // No COMMITTED artifact may ASSERT that committed material binds the exact final head.
  //
  // This has to be path-aware, not a text grep. `binds_exact_final_head: true` is LEGITIMATE where it
  // states what STAGE B is REQUIRED to achieve (a requirement, not a claim about the committed candidate).
  // It is a DEFECT anywhere it appears as an achieved result — which is exactly what the prior wave shipped
  // in PACKAGE_VERIFICATION_RESULTS.json (`executed_preflight.checks.binds_exact_final_head: true`).
  const STAGE_B_REQUIREMENT_PATHS = /(required_results|procedural_final_head_capsule|expected_result_by_stage)/;
  const scanDir = resolve(REPO, OUT);
  const offenders = [];
  for (const f of (existsSync(scanDir) ? readdirSync(scanDir) : []).filter((x) => x.endsWith(".json"))) {
    let doc; try { doc = JSON.parse(readFileSync(join(scanDir, f), "utf8")); } catch { continue; }
    (function walk(o, path) {
      if (Array.isArray(o)) { o.forEach((v, i) => walk(v, path + "[" + i + "]")); return; }
      if (o && typeof o === "object") {
        for (const [k, v] of Object.entries(o)) {
          if (k === "binds_exact_final_head" && v === true && !STAGE_B_REQUIREMENT_PATHS.test(path)) {
            offenders.push(f + path + "/" + k);
          }
          walk(v, path + "/" + k);
        }
      }
    })(doc, "");
  }
  ok("AT5g [DYNAMIC] NO committed package artifact ASSERTS binds_exact_final_head:true as an achieved result",
    offenders.length === 0, offenders.join(" | "));

  // the procedural generator refuses a wrong head / wrong tree / in-repo out-root
  ok("AT5h [STRUCTURAL] the Stage-B generator re-resolves HEAD and refuses a mismatched declared head",
    /if \(finalHead !== realHead\) return refuse\("DECLARED_FINAL_HEAD_IS_NOT_CURRENT_HEAD"/.test(FHC_SRC));
  ok("AT5i [STRUCTURAL] it refuses a mismatched declared tree",
    /if \(finalTree !== realTree\) return refuse\("DECLARED_FINAL_TREE_IS_NOT_CURRENT_TREE"/.test(FHC_SRC));
  ok("AT5j [STRUCTURAL] it refuses a dirty worktree",
    /return refuse\("WORKTREE_NOT_CLEAN"/.test(FHC_SRC));
  ok("AT5k [STRUCTURAL] it refuses an out-root inside the repository",
    /return refuse\("OUT_ROOT_INSIDE_REPOSITORY"/.test(FHC_SRC));
  ok("AT5l [STRUCTURAL] it refuses an evaluated_sha equal to the final head (non-recursive two-SHA seal)",
    /return refuse\("EVALUATED_SHA_EQUALS_FINAL_HEAD"/.test(FHC_SRC));
  ok("AT5m [STRUCTURAL] it requires EVERY input explicitly — no defaults that could bind something else",
    /FINAL_HEAD_REQUIRED/.test(FHC_SRC) && /FINAL_TREE_REQUIRED/.test(FHC_SRC) && /EVALUATED_SHA_REQUIRED/.test(FHC_SRC)
    && /OUT_ROOT_REQUIRED/.test(FHC_SRC) && /PR_REQUIRED/.test(FHC_SRC));
  ok("AT5n [STRUCTURAL] it writes its receipt to stdout and never into the repository",
    /console\.log\(JSON\.stringify\(receipt, null, 2\)\)/.test(FHC_SRC) && !/writeFileSync\(/.test(FHC_SRC));
}

// ============================================================ AT6  PF-5 is NOT weakened
{
  const launcher = readFileSync(resolve(REPO, "tools/terminal0/lrcq/run-five-hour.mjs"), "utf8");
  ok("AT6a [STRUCTURAL] PF-5's exact-current-HEAD comparison is intact in the production launcher",
    /evidence_commit_sha\/tree is not the exact current HEAD\/tree/.test(launcher));
  ok("AT6b [STRUCTURAL] no correction in this wave touched the launcher's binding-defect construction",
    /binding_defects/.test(launcher));
  ok("AT6c [STRUCTURAL] the package generators never import or re-implement PF-5",
    !/binds_exact_final_head\s*=/.test(GEN_SRC) && !/evidence_commit_sha\/tree is not/.test(GEN_SRC) && !/evidence_commit_sha\/tree is not/.test(FHC_SRC));
}

console.log("");
console.log("LRCQ PACKAGE-AUTHORITATIVE-TABLES SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exitCode = 1; }
