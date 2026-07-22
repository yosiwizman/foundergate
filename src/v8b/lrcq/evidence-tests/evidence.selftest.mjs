// FounderGate LRCQ — evidence subsystem selftest: B13 spec, A04 anchor, B14 verifier.
import { EVIDENCE_SPEC_VERSION, canonicalize, packageDigest, validateEvidencePackage, buildEvidencePackage } from "../evidence/evidence-spec.mjs";
import { AnchorLedger, signFixture, verifyFixtureSig, verifyExportedChain, ANCHOR_LIMITATIONS } from "../evidence/evidence-anchor.mjs";
import { verifyEvidence } from "../evidence/evidence-verifier.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const facts = () => ({ candidate_sha: "SHA", candidate_tree: "TREE", source_identity: "src", policy_version: "lrcq-policy-v1", provider_identity: "sha256:prov", model_identifier: "m", tool_versions: { git: "2" }, actions: [{ a: 1 }], refusals: [], tests: [{ class: "unit" }, { class: "refusal" }], machine_verifier: { pass: true, identity: "mv-1" }, checker: { result: "CLEAN", identity: "chk-1" }, findings: [], limitations: [], gate_state: "HELD", signatures: [], classification: "private", claims: [], issued_epoch: 1000, expiry_epoch: 9_999_999 });

// ---- B13 spec ----
ok("01 canonicalize is key-order independent", canonicalize({ b: 1, a: 2 }) === canonicalize({ a: 2, b: 1 }));
ok("02 packageDigest stable + sha256", packageDigest({ x: 1 }) === packageDigest({ x: 1 }) && packageDigest({ x: 1 }).startsWith("sha256:"));
ok("03 valid package validates", validateEvidencePackage(buildEvidencePackage(facts()), { now_epoch: 2000 }).valid === true);
ok("04 missing field refused", validateEvidencePackage({ ...buildEvidencePackage(facts()), candidate_sha: null }).valid === false);
{ const p = buildEvidencePackage(facts()); p.claims = [{ id: "c1", statement: "x", evidence: [] }]; ok("05 unsupported claim refused", validateEvidencePackage(p, { now_epoch: 2000 }).refusals.some((r) => /unsupported claim/.test(r))); }
ok("06 expired evidence refused", validateEvidencePackage(buildEvidencePackage(facts()), { now_epoch: 9_999_999 }).valid === false);
{ const p = buildEvidencePackage(facts()); p.classification = "public"; ok("07 invalid classification refused", validateEvidencePackage(p, { now_epoch: 2000 }).refusals.some((r) => /classification/.test(r))); }
{ const p = buildEvidencePackage(facts()); p.checker = { result: "MAYBE" }; ok("08 invalid checker result refused", validateEvidencePackage(p, { now_epoch: 2000 }).refusals.some((r) => /checker result/.test(r))); }
ok("09 no-tests refused", validateEvidencePackage({ ...buildEvidencePackage(facts()), tests: [] }, { now_epoch: 2000 }).valid === false);

// ---- A04 anchor ----
{ const l = new AnchorLedger(); l.append({ e: "a" }); l.append({ e: "b" }); l.append({ e: "c" });
  ok("10 chain verifies intact", l.verify().ok === true && l.verify().length === 3);
  ok("11 external witness slot HELD (null) per record", l.records.every((r) => r.external_witness_signature === null));
  ok("12 signing fixture round-trips", verifyFixtureSig("d", signFixture("d")) === true && verifyFixtureSig("d", signFixture("d") + "x") === false);
  const tampered = new AnchorLedger(); tampered.append({ e: "a" }); tampered.append({ e: "b" }); tampered.records[0].record = { e: "EVIL" };
  ok("13 tamper detected", tampered.verify().ok === false && /tampered/.test(tampered.verify().reason));
  const inserted = new AnchorLedger(); inserted.append({ e: "a" }); inserted.append({ e: "b" });
  inserted.records.splice(1, 0, { seq: 1, prev: inserted.records[0].chain_digest, record: { e: "X" }, chain_digest: "sha256:fake", signature: signFixture("sha256:fake"), external_witness_signature: null });
  ok("14 insertion detected", inserted.verify().ok === false);
  const cp = l.checkpointManifest({ candidate_sha: "SHA", candidate_tree: "TREE" });
  ok("15 checkpoint manifest binds candidate + HELD witness + limitations", cp.candidate_sha === "SHA" && cp.external_witness_signature === null && cp.limitations.length === ANCHOR_LIMITATIONS.length);
  const exp = l.exportOnce(); ok("16 export-once succeeds", exp.ok === true);
  ok("17 second export refused (write-once)", l.exportOnce().ok === false);
  ok("18 append after seal refused", (() => { try { l.append({ e: "z" }); return false; } catch { return true; } })());
  ok("19 exported chain verifies independently of the runtime", verifyExportedChain(exp).ok === true); }

// ---- B14 verifier ----
{ const trust = { builders: ["mv-1"], checkers: ["chk-1"], policies: ["lrcq-policy-v1"], providers: ["sha256:prov"], required_test_classes: ["unit", "refusal"], candidate_sha: "SHA", candidate_tree: "TREE", now_epoch: 2000, signing_key: "k" };
  const p = buildEvidencePackage(facts());
  ok("20 valid package verifies against trust roots", verifyEvidence(p, trust).verified === true);
  ok("21 wrong candidate_sha refused", verifyEvidence({ ...p, candidate_sha: "OTHER" }, trust).refusals.some((r) => /candidate_sha/.test(r)));
  ok("22 missing required test class refused", verifyEvidence({ ...p, tests: [{ class: "unit" }] }, trust).refusals.some((r) => /required test class/.test(r)));
  ok("23 unapproved policy refused", verifyEvidence({ ...p, policy_version: "evil" }, trust).refusals.some((r) => /policy/.test(r)));
  ok("24 unapproved provider refused", verifyEvidence({ ...p, provider_identity: "sha256:evil" }, trust).refusals.some((r) => /provider/.test(r)));
  ok("25 untrusted checker identity refused", verifyEvidence({ ...p, checker: { result: "CLEAN", identity: "evil" } }, trust).refusals.some((r) => /checker identity/.test(r)));
  ok("26 stale evidence refused (now>=expiry)", verifyEvidence(p, { ...trust, now_epoch: 9_999_999 }).verified === false);
  const signed = { ...p }; const body = { ...signed }; delete body.__digest; signed.__digest = packageDigest(body);
  ok("27 digest match verifies (tamper-free)", verifyEvidence(signed, trust).verified === true);
  ok("28 tampered digest refused", verifyEvidence({ ...signed, gate_state: "MUTATED" }, trust).refusals.some((r) => /tampered/.test(r)));
  const sp = buildEvidencePackage({ ...facts(), signatures: [{ identity: "mv-1", digest: "D", signature: signFixture("D", "k") }] });
  ok("29 good signature verifies", verifyEvidence(sp, trust).verified === true);
  ok("30 bad signature refused", verifyEvidence({ ...sp, signatures: [{ identity: "mv-1", digest: "D", signature: "hmac-sha256:bad" }] }, trust).refusals.some((r) => /signature/.test(r))); }

console.log("\nLRCQ EVIDENCE SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
