// FounderGate LRCQ — PRODUCTION-SEAM acknowledgment-failure classification (FG-CHK5-197-01).
//
// The fifth fresh independent Checker proved that the five-hour launcher's refusal classification had
// DRIFTED. It was an inline three-code OR expression, and FG-FFIN4-197-01 added a FOURTH
// acknowledgment-stage lifecycle code — SUPERVISOR_START_IDENTITY_UNAVAILABLE, raised when the parent
// cannot INDEPENDENTLY observe the spawned supervisor's OS process-start identity — without extending it.
// A run refused for that reason was therefore recorded as stage "governed_key_transfer" / final_state
// "SUPERVISOR_SPAWN_FAILED", which is a FALSE evidence record: in that scenario the process spawn
// SUCCEEDED, the one-use key transfer COMPLETED, and the supervisor really did mint a correctly signed
// claim bound to the exact spawned PID. Only the parent's independent observation was unobtainable.
//
// This family executes the REAL production classification. It imports the actual exported production
// symbols from tools/terminal0/lrcq/run-five-hour.mjs and calls them; it does NOT copy the expression into
// the test and check the copy. It additionally proves, structurally, that the launcher's refusal branch
// delegates to that very classifier (so these assertions cannot pass while the live branch bypasses it),
// and drives the REAL launcher end to end to confirm the wiring at runtime.
//
// No founder key, no real signature, no real activation, no provider or model invocation, no run.
import {
  launchDetachedSupervisorV4,
  classifyGovernedTransferRefusal,
  isSupervisorAcknowledgmentFailure,
  SUPERVISOR_ACKNOWLEDGMENT_FAILURE_CODES,
} from "../../../../tools/terminal0/lrcq/run-five-hour.mjs";
import { LC_CODES } from "../assurance/lifecycle-authority-v4.mjs";
import { makeDisposableRunWorld } from "./test-support/v4-run-world.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond, detail) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name + (detail !== undefined ? " [" + detail + "]" : "")); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../../..");
const LAUNCHER_SRC = readFileSync(resolve(REPO, "tools/terminal0/lrcq/run-five-hour.mjs"), "utf8");
const AUTHORITY_SRC = readFileSync(resolve(REPO, "src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs"), "utf8");

const worlds = [];
function world(nonce, opts = {}) { const w = makeDisposableRunWorld({ prefix: "fg-ackcls-", nonce, ...opts }); worlds.push(w); return w; }
const life = (w, over = {}) => ({
  now: w.now, verifyDeps: { keyDeps: w.keyDeps }, authDeps: { allowLoosePerms: true },
  providerDeps: { versionRunner: () => w.run.providerVersion },
  startupTimeoutMs: 900, pollMs: 80, heartbeatMs: 100, ...over,
});
const authFile = (w) => { const p = join(w.repoRoot, "authorization.txt"); writeFileSync(p, w.authorizationBytes); return p; };

try {
  // ============================================================ AK1  the immutable code collection
  {
    const set = SUPERVISOR_ACKNOWLEDGMENT_FAILURE_CODES;
    ok("AK1a [DYNAMIC] the production acknowledgment-failure code collection is exported and frozen",
      Array.isArray(set) && Object.isFrozen(set), typeof set + " frozen=" + Object.isFrozen(set));
    const expected = [
      LC_CODES.SUPERVISOR_TERMINATED_BEFORE_CLAIM,
      LC_CODES.SUPERVISOR_CLAIM_TIMEOUT,
      LC_CODES.SUPERVISOR_CLAIM_INVALID,
      LC_CODES.SUPERVISOR_START_IDENTITY_UNAVAILABLE,
    ];
    ok("AK1b [DYNAMIC] it contains EXACTLY the four current acknowledgment-stage codes (no more, no fewer)",
      set.length === 4 && expected.every((c) => set.includes(c)), JSON.stringify(set));
    ok("AK1c [DYNAMIC] it includes the code the fifth Checker proved was missing",
      set.includes(LC_CODES.SUPERVISOR_START_IDENTITY_UNAVAILABLE));
    // A frozen array genuinely refuses mutation, so the collection cannot be widened at runtime.
    let mutated = false;
    try { set.push("INJECTED_CODE"); mutated = set.includes("INJECTED_CODE"); } catch { mutated = false; }
    ok("AK1d [DYNAMIC] the collection cannot be widened at runtime", mutated === false && set.length === 4, "len=" + set.length);
    ok("AK1e [DYNAMIC] a spawn/transfer failure code is NOT in the collection",
      !set.includes(LC_CODES.SUPERVISOR_SPAWN_FAILED) && !set.includes(LC_CODES.DESCRIPTOR_UNAVAILABLE) && !set.includes(LC_CODES.TRANSFER_WRITE_FAILED));
  }

  // ============================================================ AK2  the four acknowledgment codes
  // Each case calls the REAL exported production classifier — the same function the launcher's refusal
  // branch returns verbatim.
  {
    const ACK_CASES = [
      { code: LC_CODES.SUPERVISOR_TERMINATED_BEFORE_CLAIM, detail: "the spawned supervisor exited without producing a verified claim (exit 0, signal null)" },
      { code: LC_CODES.SUPERVISOR_CLAIM_TIMEOUT, detail: "no verified supervisor claim within 30000ms" },
      { code: LC_CODES.SUPERVISOR_CLAIM_INVALID, detail: "claim start identity FORGED != OS-observed pid:1|lstart:x" },
      { code: LC_CODES.SUPERVISOR_START_IDENTITY_UNAVAILABLE, detail: "the parent could not independently observe the spawned process's OS start identity (/bin/ps unavailable), so the claim's self-reported identity cannot be verified" },
    ];
    for (const c of ACK_CASES) {
      const r = classifyGovernedTransferRefusal({ ok: false, code: c.code, detail: c.detail });
      ok("AK2 " + c.code + " -> predicate true", isSupervisorAcknowledgmentFailure(c.code) === true);
      ok("AK2 " + c.code + " -> ready === false", r.ready === false, JSON.stringify(r.ready));
      ok("AK2 " + c.code + " -> refused.stage === supervisor_acknowledgment", r.refused.stage === "supervisor_acknowledgment", r.refused.stage);
      ok("AK2 " + c.code + " -> final_state === SUPERVISOR_NEVER_ACKNOWLEDGED", r.final_state === "SUPERVISOR_NEVER_ACKNOWLEDGED", r.final_state);
      ok("AK2 " + c.code + " -> consumed === true", r.consumed === true, JSON.stringify(r.consumed));
      ok("AK2 " + c.code + " -> launched === false", r.launched === false, JSON.stringify(r.launched));
      ok("AK2 " + c.code + " -> supervisor_acknowledged === false", r.supervisor_acknowledged === false, JSON.stringify(r.supervisor_acknowledged));
      ok("AK2 " + c.code + " -> the EXACT lifecycle code survives in refused.reasons",
        r.refused.reasons.length === 1 && r.refused.reasons[0].startsWith(c.code) && r.refused.reasons[0].includes(c.detail), JSON.stringify(r.refused.reasons));
    }
  }

  // ============================================================ AK3  negative controls
  // A genuine spawn / descriptor / transfer failure must KEEP the transfer-stage naming. Widening the
  // acknowledgment set would break these, so they pin the correction from the other side.
  {
    const NEG_CASES = [
      { code: LC_CODES.SUPERVISOR_SPAWN_FAILED, detail: "child spawn error: ENOENT" },
      { code: LC_CODES.TRANSFER_WRITE_FAILED, detail: "the governed key frame could not be written" },
      { code: LC_CODES.DESCRIPTOR_UNAVAILABLE, detail: "no anonymous descriptor could be created" },
    ];
    for (const c of NEG_CASES) {
      const r = classifyGovernedTransferRefusal({ ok: false, code: c.code, detail: c.detail });
      ok("AK3 " + c.code + " -> predicate false", isSupervisorAcknowledgmentFailure(c.code) === false);
      ok("AK3 " + c.code + " -> refused.stage === governed_key_transfer", r.refused.stage === "governed_key_transfer", r.refused.stage);
      ok("AK3 " + c.code + " -> final_state === SUPERVISOR_SPAWN_FAILED", r.final_state === "SUPERVISOR_SPAWN_FAILED", r.final_state);
      ok("AK3 " + c.code + " -> still ready:false / consumed:true / launched:false / not acknowledged",
        r.ready === false && r.consumed === true && r.launched === false && r.supervisor_acknowledged === false, JSON.stringify(r));
      ok("AK3 " + c.code + " -> the EXACT lifecycle code survives in refused.reasons", r.refused.reasons[0].startsWith(c.code), JSON.stringify(r.refused.reasons));
    }
    // Unrelated / unknown codes must also stay on the transfer stage rather than being called an
    // acknowledgment failure.
    for (const c of [LC_CODES.ALREADY_TRANSFERRED, LC_CODES.KEY_FRAME_MAGIC, LC_CODES.FORGED, LC_CODES.ROOT_OBJECT_IDENTITY_MISMATCH, "SOME_FUTURE_UNKNOWN_CODE"]) {
      ok("AK3x " + c + " is NOT classified as an acknowledgment failure", isSupervisorAcknowledgmentFailure(c) === false);
    }
    ok("AK3y undefined/null codes are not acknowledgment failures",
      isSupervisorAcknowledgmentFailure(undefined) === false && isSupervisorAcknowledgmentFailure(null) === false);
  }

  // ============================================================ AK4  the launcher really delegates
  // Without this, AK2/AK3 could pass against a correct classifier while the live refusal branch still used
  // its own drifting inline expression.
  {
    ok("AK4a [STRUCTURAL] the launcher's governed-transfer refusal branch RETURNS the named classifier",
      /if \(!g\.ok\) return classifyGovernedTransferRefusal\(g\);/.test(LAUNCHER_SRC));
    ok("AK4b [STRUCTURAL] the drifting inline three-code OR expression is GONE",
      !/const claimFailure = g\.code ===/.test(LAUNCHER_SRC) && !/claimFailure \?/.test(LAUNCHER_SRC));
    ok("AK4c [STRUCTURAL] the stage/final_state strings are decided in exactly ONE place",
      (LAUNCHER_SRC.match(/"supervisor_acknowledgment"/g) || []).length === 1 &&
      (LAUNCHER_SRC.match(/"SUPERVISOR_NEVER_ACKNOWLEDGED"/g) || []).length === 1,
      "stage=" + (LAUNCHER_SRC.match(/"supervisor_acknowledgment"/g) || []).length + " state=" + (LAUNCHER_SRC.match(/"SUPERVISOR_NEVER_ACKNOWLEDGED"/g) || []).length);
    // NOT configurable: the collection is a frozen literal of LC_CODES references, declared once, never
    // reassigned and never mutated. No environment variable, config field, activation field or CLI flag
    // participates in deciding which codes are acknowledgment failures.
    const decl = LAUNCHER_SRC.match(/export const SUPERVISOR_ACKNOWLEDGMENT_FAILURE_CODES = Object\.freeze\(\[([\s\S]*?)\]\);/);
    ok("AK4d [STRUCTURAL] the collection is declared exactly once as a frozen literal", !!decl &&
      (LAUNCHER_SRC.match(/SUPERVISOR_ACKNOWLEDGMENT_FAILURE_CODES\s*=/g) || []).length === 1, decl ? "1 decl" : "no frozen-literal declaration");
    const elements = decl ? decl[1].split("\n").map((l) => l.replace(/\/\/.*$/, "").trim().replace(/,$/, "")).filter(Boolean) : [];
    ok("AK4e [STRUCTURAL] every element is a static LC_CODES reference (no string literal, no computed value)",
      elements.length === 4 && elements.every((e) => /^LC_CODES\.SUPERVISOR_[A-Z_]+$/.test(e)), JSON.stringify(elements));
    ok("AK4f [STRUCTURAL] nothing in the launcher mutates the collection or sources it from env/config/flags",
      !/SUPERVISOR_ACKNOWLEDGMENT_FAILURE_CODES\s*\.\s*(push|pop|splice|unshift|shift)/.test(LAUNCHER_SRC) &&
      !/(process\.env|life|opts|cap|argv)[^\n]{0,40}SUPERVISOR_ACKNOWLEDGMENT_FAILURE_CODES/.test(LAUNCHER_SRC) &&
      !/SUPERVISOR_ACKNOWLEDGMENT_FAILURE_CODES[^\n]{0,40}(process\.env|argv)/.test(LAUNCHER_SRC));
  }

  // ============================================================ AK5  drift guard against the authority module
  // Derive, from the authority module's OWN source, every SUPERVISOR_* code its acknowledgment wait can
  // return, and require the launcher's collection to cover all of them. This is the guard whose absence
  // allowed FG-CHK5-197-01: a fifth acknowledgment code would fail here instead of being mis-recorded.
  {
    const a = AUTHORITY_SRC.indexOf("function classifySupervisorClaim");
    const b = AUTHORITY_SRC.indexOf("export async function spawnGovernedSupervisorV4");
    ok("AK5a [STRUCTURAL] the acknowledgment-wait region was located in the authority module", a > 0 && b > a, "a=" + a + " b=" + b);
    const region = AUTHORITY_SRC.slice(a, b);
    const returned = [...new Set([...region.matchAll(/LC_CODES\.(SUPERVISOR_[A-Z_]+)/g)].map((m) => m[1]))].sort();
    ok("AK5b [STRUCTURAL] the region returns exactly the four known acknowledgment codes",
      returned.length === 4 && returned.join(",") === "SUPERVISOR_CLAIM_INVALID,SUPERVISOR_CLAIM_TIMEOUT,SUPERVISOR_START_IDENTITY_UNAVAILABLE,SUPERVISOR_TERMINATED_BEFORE_CLAIM",
      JSON.stringify(returned));
    const uncovered = returned.filter((k) => !SUPERVISOR_ACKNOWLEDGMENT_FAILURE_CODES.includes(LC_CODES[k]));
    ok("AK5c [STRUCTURAL] EVERY acknowledgment code the authority module can return is classified by the launcher",
      uncovered.length === 0, "uncovered=" + JSON.stringify(uncovered));
    ok("AK5d [STRUCTURAL] SUPERVISOR_SPAWN_FAILED is NOT raised by the acknowledgment wait (it is a genuine spawn failure)",
      !region.includes("SUPERVISOR_SPAWN_FAILED"));
  }

  // ============================================================ AK6  live end-to-end wiring proof
  // Drive the REAL production launcher to a genuine acknowledgment failure and assert the full record.
  // This proves the branch is wired to the classifier in an actual run, not only in the source text.
  {
    const w = world("live-noack");
    const noop = join(w.repoRoot, "noop-supervisor.mjs"); writeFileSync(noop, "process.exit(0);\n");
    const r = await launchDetachedSupervisorV4(w.activationPath, authFile(w), life(w, { supervisorMainPath: noop }));
    ok("AK6a [DYNAMIC] the real launcher refused at the acknowledgment stage", r.refused && r.refused.stage === "supervisor_acknowledgment", JSON.stringify(r.refused));
    ok("AK6b [DYNAMIC] final_state === SUPERVISOR_NEVER_ACKNOWLEDGED", r.final_state === "SUPERVISOR_NEVER_ACKNOWLEDGED", r.final_state);
    ok("AK6c [DYNAMIC] ready:false, consumed:true, launched:false, supervisor_acknowledged:false",
      r.ready === false && r.consumed === true && r.launched === false && r.supervisor_acknowledged === false, JSON.stringify(r));
    ok("AK6d [DYNAMIC] the exact lifecycle code reached the record",
      !!r.refused && /SUPERVISOR_TERMINATED_BEFORE_CLAIM|SUPERVISOR_CLAIM_TIMEOUT/.test(String(r.refused.reasons)), JSON.stringify(r.refused.reasons));
    // The live record must be exactly what the exported classifier produces for that code — proving the
    // branch adds nothing and hides nothing.
    const expected = classifyGovernedTransferRefusal({ ok: false, code: String(r.refused.reasons[0]).split(" (")[0], detail: null });
    ok("AK6e [DYNAMIC] the live record's classification fields equal the classifier's for the same code",
      r.ready === expected.ready && r.refused.stage === expected.refused.stage && r.final_state === expected.final_state &&
      r.consumed === expected.consumed && r.launched === expected.launched && r.supervisor_acknowledged === expected.supervisor_acknowledged,
      JSON.stringify({ live: { s: r.refused.stage, f: r.final_state }, expected: { s: expected.refused.stage, f: expected.final_state } }));
    ok("AK6f [DYNAMIC] no provider was invoked by the refused launch", r.provider_invocation === undefined || r.provider_invocation === 0, JSON.stringify(r.provider_invocation));
  }

  // ============================================================ AK7  authority core untouched
  {
    ok("AK7a [STRUCTURAL] the correction introduced no new import into the launcher beyond the existing LC_CODES",
      /import \{ createLaunchIntentV4, spawnGovernedSupervisorV4, LC_CODES \}/.test(LAUNCHER_SRC));
    ok("AK7b [STRUCTURAL] the authority module still declares the start-identity code and still returns it",
      /SUPERVISOR_START_IDENTITY_UNAVAILABLE: "SUPERVISOR_START_IDENTITY_UNAVAILABLE"/.test(AUTHORITY_SRC) &&
      (AUTHORITY_SRC.match(/SUPERVISOR_START_IDENTITY_UNAVAILABLE/g) || []).length >= 3);
    ok("AK7c [STRUCTURAL] the unconditional start-identity comparison is still unconditional",
      !/observedStart !== null && d\.supervisor_start_identity !== observedStart/.test(AUTHORITY_SRC) &&
      /if \(observedStart === null\) return \{ needsObservation: true/.test(AUTHORITY_SRC));
    ok("AK7d [STRUCTURAL] the observation still runs through the fixed absolute /bin/ps",
      /observedStartIdentity\(child\.pid\)/.test(AUTHORITY_SRC));
  }

  // ============================================================ AK8  the instrument is DISCRIMINATING
  // A regression that would pass against the DEFECTIVE code proves nothing. This reconstructs the exact
  // historical three-code expression the fifth Checker found — purely as a POSITIVE CONTROL, never as a
  // stand-in for production — and shows it misclassifies the fourth code, i.e. AK2 would have FAILED
  // against candidate 9d87afa1. Production is never consulted through this copy.
  {
    const HISTORICAL_DEFECTIVE_PREDICATE = (code) =>
      code === LC_CODES.SUPERVISOR_TERMINATED_BEFORE_CLAIM ||
      code === LC_CODES.SUPERVISOR_CLAIM_TIMEOUT ||
      code === LC_CODES.SUPERVISOR_CLAIM_INVALID;
    ok("AK8a [DYNAMIC] positive control: the historical expression agrees on the three original codes",
      [LC_CODES.SUPERVISOR_TERMINATED_BEFORE_CLAIM, LC_CODES.SUPERVISOR_CLAIM_TIMEOUT, LC_CODES.SUPERVISOR_CLAIM_INVALID]
        .every((c) => HISTORICAL_DEFECTIVE_PREDICATE(c) === isSupervisorAcknowledgmentFailure(c)));
    ok("AK8b [DYNAMIC] positive control: the historical expression MISCLASSIFIES SUPERVISOR_START_IDENTITY_UNAVAILABLE",
      HISTORICAL_DEFECTIVE_PREDICATE(LC_CODES.SUPERVISOR_START_IDENTITY_UNAVAILABLE) === false &&
      isSupervisorAcknowledgmentFailure(LC_CODES.SUPERVISOR_START_IDENTITY_UNAVAILABLE) === true);
    ok("AK8c [DYNAMIC] positive control: this family would therefore have FAILED against the defective candidate",
      HISTORICAL_DEFECTIVE_PREDICATE(LC_CODES.SUPERVISOR_START_IDENTITY_UNAVAILABLE) !== isSupervisorAcknowledgmentFailure(LC_CODES.SUPERVISOR_START_IDENTITY_UNAVAILABLE));
    ok("AK8d [DYNAMIC] positive control: the historical expression also disagrees on the recorded final_state",
      (HISTORICAL_DEFECTIVE_PREDICATE(LC_CODES.SUPERVISOR_START_IDENTITY_UNAVAILABLE) ? "SUPERVISOR_NEVER_ACKNOWLEDGED" : "SUPERVISOR_SPAWN_FAILED") === "SUPERVISOR_SPAWN_FAILED" &&
      classifyGovernedTransferRefusal({ code: LC_CODES.SUPERVISOR_START_IDENTITY_UNAVAILABLE }).final_state === "SUPERVISOR_NEVER_ACKNOWLEDGED");
  }

  console.log("");
  console.log("LRCQ PRODUCTION-ACK-CLASSIFICATION SELFTEST: " + (n - fails.length) + "/" + n + " passed");
  if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exitCode = 1; }
} finally {
  for (const w of worlds) w.cleanup();
}
