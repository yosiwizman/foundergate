// FounderGate V8-B VB2 — Spec Card Engine surface EVIDENCE GENERATOR.
//
// Plain English: this renders the standalone Spec Card surface from a REAL run of the REAL ARE
// blueprint compiler (`src/autonomous-run/blueprint-compiler.mjs`), entirely offline. It:
//   1. feeds a small, self-describing blueprint (a spec-card fixture that describes the very
//      surface being built, plus one deliberately customer-data requirement) through the REAL
//      compiler — so the GATE on each card is the compiler's own ARLC-delegated verdict, not a
//      hand-typed guess; then
//   2. lifts each requirement into a plain-English spec card with the standalone engine
//      (`deriveSpecCard`) — what was asked / what "done" looks like / what it will NOT do / open
//      questions; and
//   3. writes one page per card next to this file.
//
// THE HONEST PICTURE THIS PRODUCES: there is NO approval record on disk for these cards today, so
// every card renders "awaiting founder approval — no lane may spawn". That is the real, on-disk
// truth (N16: the founder approves the card before any lane spawns, and no such approval has been
// given). The routine requirement gets an OPERATIONAL_AUTONOMOUS gate; the customer-data one gets a
// TRUE_FOUNDER_GATE — both straight from the compiler. The self-test proves the surface renders the
// APPROVED + lane-may-spawn path correctly, so the capability is proven even though no committed
// card is approved yet.
//
// It is a build/evidence tool, kept OUT of src/ on purpose so the production surface module stays
// free of any fs/io surface (the VB2 no-act-edge source scan reads src/ only). Deterministic: same
// fixture in → byte-identical pages out. It only READS committed source and WRITES html artifacts;
// it takes no other action, opens no network, and shells nothing.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBlueprint } from "../../../src/autonomous-run/blueprint-compiler.mjs";
import { deriveSpecCard, renderSurfaceHtml, deriveSpecCardView } from "../../../src/v8b2/spec-card-engine.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");

// A minimal-but-real blueprint that describes THIS surface (and one customer-data requirement so the
// evidence shows a founder-gated card next to a routine one). Every field is honest fixture data.
const blueprint = {
  blueprint_id: "BP-SPEC-CARD-ENGINE",
  project_identity: "foundergate",
  blueprint_version: "1.0.0",
  author: "founder",
  source: "roadmap-v7-N16",
  creation_time: "2026-07-18",
  objective: "Produce a plain-English spec card before any major feature so the founder can approve scope before a lane spawns.",
  target_users: "the founder",
  user_journeys: ["Founder reads a spec card and decides whether to approve scope"],
  non_functional_requirements: ["deterministic render", "read-only"],
  private_customer_data_requirements: [],
  integrations: [],
  deployment_target: "local",
  platform_targets: ["node"],
  accessibility_requirements: ["keyboard-independent (static page)"],
  human_perception_requirements: ["founder-readable plain English"],
  founder_decisions_made: [],
  release_expectations: ["internal evidence artifact"],
  non_goals: [
    "This surface does not approve a card",
    "This surface does not spawn a lane",
    "This surface does not fire a scope kill-switch",
  ],
  known_unknowns: ["Where should an approval record be stored on disk?"],
  founder_decisions_required: ["Approve the spec-card format before it becomes the default"],
  legal_security_ip_expert_questions: [],
  data_classes: [],
  secret_classes: [],
  external_actions: [],
  irreversible_actions: [],
  spending_limits: [],
  provider_needs: [],
  rollback_expectations: ["git_revert"],
  evidence_expectations: ["selftest_green", "rendered_page"],
  functional_requirements: [
    { id: "FR-SPEC-1", text: "Render a spec card from a blueprint requirement — plain English, four sections.", title: "Standalone spec card" },
    { id: "FR-SPEC-2", text: "Keep a per-project index of customer feature requests.", title: "Feature-request index", data_classes: ["customer_data"] },
  ],
  acceptance_criteria: [
    { requirement_id: "FR-SPEC-1", text: "The page shows what was asked, what \"done\" looks like, what it will NOT do, and open questions.", test: "spec-card-engine.selftest.mjs" },
    { requirement_id: "FR-SPEC-1", text: "An unapproved card is shown as awaiting approval and spawns no lane.", test: "spec-card-engine.selftest.mjs" },
    { requirement_id: "FR-SPEC-2", text: "Customer data is classified before it is stored.", proof: "classification_evidence" },
  ],
};

// Run the REAL compiler so each card's GATE is the compiler's own ARLC-delegated verdict.
const compiled = compileBlueprint(blueprint, { policyVersion: "evidence", repoRoot: ROOT });
if (!compiled.ok) {
  console.error("compiler did not produce a plan:", compiled.reason);
  process.exit(1);
}
const gateOf = Object.fromEntries(compiled.requirements_registry.map((r) => [r.id, r.gate]));
const cardOf = Object.fromEntries(compiled.spec_cards.map((sc) => [sc.requirement_id, sc]));

const OUT = [
  { req: "FR-SPEC-1", file: "spec-card-routine.html" },
  { req: "FR-SPEC-2", file: "spec-card-founder-gate.html" },
];

for (const { req, file } of OUT) {
  const card = deriveSpecCard(blueprint, req, {
    gate: gateOf[req],
    trace: cardOf[req] && cardOf[req].trace,
    // No approval record exists on disk — omitted on purpose, so the card renders "awaiting".
  });
  const snapshot = { source: "fixture", card };
  const view = deriveSpecCardView(snapshot);
  const html = renderSurfaceHtml(snapshot);
  const out = join(HERE, file);
  writeFileSync(out, html + "\n");
  console.log(
    `wrote ${out} (${html.length} bytes) — req=${req}, gate=${card.gate}, approved=${view.approved}, laneMaySpawn=${view.laneMaySpawn}, done=${view.pipeline.find((p) => p.key === "done").present}`
  );
}
