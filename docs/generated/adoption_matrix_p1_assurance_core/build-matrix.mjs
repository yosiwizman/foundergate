// Deterministic generator for the 160-item adoption matrix + roadmap integration map.
// P1 (1-20) = FOUNDER_PROMPT_VERBATIM. P2-P10 (21-160) = FOUNDERGATE_DERIVED / PENDING_FOUNDER_CONFIRMATION.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const DIR = dirname(fileURLToPath(import.meta.url));

// category ids (Lane B)
const C = { GOV: '1 Foundation/Governance', TECH: '2 Technical Proof', PROD: '3 Product/Operator', PROV: '4 Provider/Repo', SEC: '5 Security/Trust', EVAL: '6 Evaluation', OBS: '7 Observability', HUM: '8 Human Governance', MULTI: '9 Multi-Agent Governance', OPS: '10 Operational Intelligence', PLAT: '11 Platform Extensibility', COMM: '12 Commercial Differentiators' };

// status legend: INTEGRATED | PARTIAL | NOT_YET | BLOCKED_BY_FOUNDER_GATE | COMMERCIAL_FUTURE
const I = 'INTEGRATED', PA = 'PARTIAL', NY = 'NOT_YET', BG = 'BLOCKED_BY_FOUNDER_GATE', CF = 'COMMERCIAL_FUTURE';
const V = 'FOUNDER_PROMPT_VERBATIM', DER = 'FOUNDERGATE_DERIVED / PENDING_FOUNDER_CONFIRMATION';

const rows = [];
const add = (name, prio, status, cat, evidence, roadmap, next, touch, src) => rows.push({ n: rows.length + 1, name, prio, status, cat, evidence, roadmap, next, touch, src });

// -------- P1 (20, verbatim) --------
const P1 = [
  ['AI System Configuration Manifest', I], ['Context Provenance Record', I], ['Evaluation Dataset Governance', PA],
  ['Security Finding → Validation → Patch → Acceptance separation', I], ['Function Preservation Verification', I],
  ['Independent Checker Verification', I], ['Mutation / Falsification Testing', I], ['Model & Provider Qualification Process', I],
  ['Tool Capability Classification', I], ['MCP Capability Classification', I], ['Agent Action Trace', I],
  ['Evidence Confidence Model', I], ['Risk Budget Framework', I], ['Scan Completeness States', I], ['Threat Model Versioning', I],
  ['Security Patch Safety Validation', I], ['Exact AI Configuration Fingerprinting', I], ['Provider-Neutral Security Interface', I],
  ['Immutable Context Snapshot', I], ['AI Runtime Manifest', I],
];
for (const [name, st] of P1) add(name, 'P1', st, C.GOV, st === PA ? 'schema only (no real dataset)' : 'src/assurance_core/assurance-core.mjs + selftest 18/18 + falsification 12/12 + UI panel + headed proof', 'Assurance Core', st === PA ? 'define local synthetic eval set; real/customer data stays blocked' : 'wire into every provider run; keep local', 'YES', V);

// -------- helper for derived priorities --------
function block(prio, items) { for (const it of items) add(it.name, prio, it.status, it.cat, it.evidence, it.roadmap, it.next, it.touch || 'NO', DER); }

// -------- P2 (18) Provider/Repo depth + Technical proof --------
block('P2', [
  { name: 'One real provider adapter proof (budget-capped)', status: BG, cat: C.PROV, evidence: 'planning packet only', roadmap: 'Provider/Repo Proof', next: 'founder authorization phrase + $ cap' },
  { name: 'Private-repo read-only evidence proof', status: BG, cat: C.PROV, evidence: 'planning packet only', roadmap: 'Provider/Repo Proof', next: 'founder authorization phrase' },
  { name: 'Provider-agnostic gated flow (simulated)', status: PA, cat: C.PROV, evidence: 'gated-flow 17/17; 5 sim adapters', roadmap: 'Provider/Repo Proof', next: 'add real adapter behind gate' },
  { name: 'Hostile provider refusal', status: I, cat: C.PROV, evidence: 'harness matrix: hostile held/refused', roadmap: 'Provider/Repo Proof', next: 'keep in regression' },
  { name: 'Repo evidence allowlist (local self-owned)', status: I, cat: C.PROV, evidence: 'repo_check 6/6; private → HELD', roadmap: 'Provider/Repo Proof', next: 'extend to authorized private repo' },
  { name: 'Provider claim-vs-verification diffing', status: I, cat: C.TECH, evidence: 'claim_vs_verification in harness', roadmap: 'Provider/Repo Proof', next: 'surface per-field diff in UI' },
  { name: 'Multi-provider qualification ledger', status: NY, cat: C.PROV, evidence: '-', roadmap: 'Provider/Repo Proof', next: 'record qualification runs over time' },
  { name: 'Provider cost accounting (real)', status: BG, cat: C.PROV, evidence: 'Gate-7 bounded proof only', roadmap: 'Provider/Repo Proof', next: 'per-call budget enforcement w/ real spend gate' },
  { name: 'Deterministic local shell builder', status: I, cat: C.TECH, evidence: 'local_shell_deterministic adapter', roadmap: 'Provider/Repo Proof', next: 'keep as no-LLM baseline' },
  { name: 'Request→artifact binding identity', status: I, cat: C.TECH, evidence: 'binding tests 22/22', roadmap: 'Factory', next: 'keep in regression' },
  { name: 'App factory archetype library', status: I, cat: C.TECH, evidence: '10 archetypes; factory 18/18', roadmap: 'Factory', next: 'expand library carefully' },
  { name: 'Factory repeatability across seeds', status: I, cat: C.TECH, evidence: 'Round 2 proof', roadmap: 'Factory Round 2', next: 'keep' },
  { name: 'Crash-injection + recovery gauntlet', status: I, cat: C.TECH, evidence: '12 fixtures held/recovered', roadmap: 'Crash Test', next: 'keep' },
  { name: 'Independent app validator (classifyApp)', status: I, cat: C.TECH, evidence: 'validate-app.mjs; crash 14/14', roadmap: 'Crash Test', next: 'keep' },
  { name: 'Arbitrary (non-archetype) generation', status: NY, cat: C.TECH, evidence: '-', roadmap: 'Factory', next: 'out of scope until safe' },
  { name: 'Real provider app generation at scale', status: BG, cat: C.PROV, evidence: '-', roadmap: 'Provider/Repo Proof', next: 'after single real adapter proof' },
  { name: 'Provider sandbox isolation policy', status: NY, cat: C.PROV, evidence: '-', roadmap: 'Provider/Repo Proof', next: 'define per-provider sandbox contract' },
  { name: 'Provider output schema contract', status: I, cat: C.PROV, evidence: 'provider_contract.mjs', roadmap: 'Provider/Repo Proof', next: 'version the contract' },
]);

// -------- P3 (18) Security / Trust --------
block('P3', [
  { name: 'Security finding lifecycle enforcement', status: I, cat: C.SEC, evidence: 'assurance-core securityFindingLifecycle', roadmap: 'Assurance Core', next: 'wire to real findings' },
  { name: 'Patch safety validation gate', status: I, cat: C.SEC, evidence: 'patchSafetyValidation record', roadmap: 'Assurance Core', next: 'require before any accept' },
  { name: 'Threat model versioning', status: I, cat: C.SEC, evidence: 'threatModelVersion record', roadmap: 'Assurance Core', next: 'bump on scope change' },
  { name: 'Secret / credential scanning in sealer', status: PA, cat: C.SEC, evidence: 'ZIP secret grep in every run', roadmap: 'Evidence sealing', next: 'formalize as a named scanner module' },
  { name: 'Protected-path enforcement', status: I, cat: C.SEC, evidence: 'protected-files demo + guards', roadmap: 'Truth Dashboard', next: 'keep' },
  { name: 'Claim-blocker (no overclaim)', status: I, cat: C.SEC, evidence: 'tools/doctor/claim-blocker.mjs', roadmap: 'Doctor', next: 'keep clean every run' },
  { name: 'SAST/dependency scanning', status: NY, cat: C.SEC, evidence: '-', roadmap: 'Security/Trust', next: 'add local scanner; report completeness state' },
  { name: 'Supply-chain provenance (SLSA-style)', status: NY, cat: C.SEC, evidence: '-', roadmap: 'Security/Trust', next: 'attest build inputs' },
  { name: 'Signed evidence bundles', status: NY, cat: C.SEC, evidence: 'SHA256SUMS only', roadmap: 'Evidence sealing', next: 'add signature (local key) then external' },
  { name: 'Security certification (SOC2/ISO)', status: CF, cat: C.SEC, evidence: '-', roadmap: 'Security/Trust', next: 'commercial; requires org + auditor' },
  { name: 'Compliance mapping (GDPR/HIPAA)', status: CF, cat: C.SEC, evidence: '-', roadmap: 'Security/Trust', next: 'commercial; requires legal' },
  { name: 'Pen-test / red-team program', status: CF, cat: C.SEC, evidence: '-', roadmap: 'Security/Trust', next: 'commercial' },
  { name: 'Data classification & handling policy', status: NY, cat: C.SEC, evidence: '-', roadmap: 'Security/Trust', next: 'define; customer data stays blocked' },
  { name: 'Access-control / RBAC model', status: NY, cat: C.SEC, evidence: '-', roadmap: 'Security/Trust', next: 'design for multi-user' },
  { name: 'Audit-log immutability', status: PA, cat: C.SEC, evidence: 'immutable snapshot + action trace', roadmap: 'Assurance Core', next: 'append-only store' },
  { name: 'Incident response runbook', status: NY, cat: C.SEC, evidence: '-', roadmap: 'Security/Trust', next: 'document' },
  { name: 'Prompt-injection defense evidence', status: NY, cat: C.SEC, evidence: '-', roadmap: 'Security/Trust', next: 'test corpus + falsification' },
  { name: 'Vulnerability disclosure policy', status: NY, cat: C.SEC, evidence: '-', roadmap: 'Security/Trust', next: 'publish policy (planning)' },
]);

// -------- P4 (16) Evaluation --------
block('P4', [
  { name: 'Evaluation dataset schema', status: PA, cat: C.EVAL, evidence: 'evaluationDatasetGovernance stub', roadmap: 'Assurance Core', next: 'local synthetic set' },
  { name: 'Real labeled evaluation dataset', status: BG, cat: C.EVAL, evidence: '-', roadmap: 'Evaluation', next: 'needs real/customer data → blocked' },
  { name: 'Golden-task regression suite', status: PA, cat: C.EVAL, evidence: 'selftests + e2e per wave', roadmap: 'Evaluation', next: 'consolidate as named golden set' },
  { name: 'Falsification/mutation coverage', status: I, cat: C.EVAL, evidence: 'falsification 12/12', roadmap: 'Assurance Core', next: 'grow hostile corpus' },
  { name: 'Evaluator independence (checker≠builder)', status: I, cat: C.EVAL, evidence: 'role separation every run', roadmap: 'Multi-Agent Gov', next: 'keep' },
  { name: 'External human evaluator (Gate 8)', status: BG, cat: C.EVAL, evidence: 'planning packet only', roadmap: 'Gate 8', next: 'founder authorization phrase' },
  { name: 'Benchmark against baselines', status: NY, cat: C.EVAL, evidence: '-', roadmap: 'Evaluation', next: 'define baselines' },
  { name: 'Scoring / confidence calibration', status: PA, cat: C.EVAL, evidence: 'evidenceConfidence model', roadmap: 'Assurance Core', next: 'calibrate thresholds w/ data' },
  { name: 'A/B provider comparison', status: NY, cat: C.EVAL, evidence: '-', roadmap: 'Evaluation', next: 'after real adapters' },
  { name: 'Eval result provenance', status: PA, cat: C.EVAL, evidence: 'context provenance record', roadmap: 'Assurance Core', next: 'bind eval runs to snapshots' },
  { name: 'Regression gating in CI', status: PA, cat: C.EVAL, evidence: 'local exact-SHA CI provider V1', roadmap: 'CI', next: 'expand check coverage' },
  { name: 'Flaky-test detection', status: NY, cat: C.EVAL, evidence: '-', roadmap: 'Evaluation', next: 'add retry/flake tracking' },
  { name: 'Coverage completeness reporting', status: I, cat: C.EVAL, evidence: 'scanCompleteness states', roadmap: 'Assurance Core', next: 'wire to real scans' },
  { name: 'Eval dataset governance approvals', status: NY, cat: C.EVAL, evidence: '-', roadmap: 'Evaluation', next: 'approval workflow' },
  { name: 'Human-in-the-loop eval UI', status: NY, cat: C.EVAL, evidence: '-', roadmap: 'Evaluation', next: 'design reviewer UI' },
  { name: 'Model qualification report', status: I, cat: C.EVAL, evidence: 'providerQualification record', roadmap: 'Assurance Core', next: 'per-model report' },
]);

// -------- P5 (16) Observability --------
block('P5', [
  { name: 'Agent action trace', status: I, cat: C.OBS, evidence: 'agent_action_trace record', roadmap: 'Assurance Core', next: 'persist traces' },
  { name: 'Run history ledger', status: I, cat: C.OBS, evidence: 'Run History panel (local)', roadmap: 'Run History', next: 'keep' },
  { name: 'Decision ledger', status: I, cat: C.OBS, evidence: 'Decisions panel (local)', roadmap: 'Decisions', next: 'keep' },
  { name: 'Evidence viewer / replay', status: I, cat: C.OBS, evidence: 'Evidence Viewer panel', roadmap: 'Evidence Viewer', next: 'keep' },
  { name: 'Structured logging (heartbeat units)', status: PA, cat: C.OBS, evidence: 'PR#183 observability corrections', roadmap: 'Observability', next: 'expand to assurance events' },
  { name: 'Run-id scoping / lifecycle precedence', status: I, cat: C.OBS, evidence: 'PR#183 merged', roadmap: 'Observability', next: 'keep' },
  { name: 'Metrics / dashboards (ops)', status: NY, cat: C.OBS, evidence: '-', roadmap: 'Observability', next: 'define metrics' },
  { name: 'Tracing across agents', status: PA, cat: C.OBS, evidence: 'action trace per role', roadmap: 'Multi-Agent Gov', next: 'correlate multi-agent traces' },
  { name: 'Alerting on fail-closed events', status: NY, cat: C.OBS, evidence: '-', roadmap: 'Observability', next: 'local notifier' },
  { name: 'Evidence confidence over time', status: PA, cat: C.OBS, evidence: 'confidence model', roadmap: 'Assurance Core', next: 'trend view' },
  { name: 'Scan completeness dashboard', status: I, cat: C.OBS, evidence: 'Assurance Core panel', roadmap: 'Assurance Core', next: 'keep' },
  { name: 'Risk budget monitoring', status: I, cat: C.OBS, evidence: 'risk budget in panel', roadmap: 'Assurance Core', next: 'keep' },
  { name: 'Immutable audit trail', status: PA, cat: C.OBS, evidence: 'immutable snapshot', roadmap: 'Assurance Core', next: 'append-only log' },
  { name: 'Real-time gate status', status: PA, cat: C.OBS, evidence: 'Live-Gate Simulator (planning)', roadmap: 'Live-Gate', next: 'wire to real gates (planning)' },
  { name: 'Observability export bundle', status: I, cat: C.OBS, evidence: 'sealed ZIP each run', roadmap: 'Evidence sealing', next: 'keep' },
  { name: 'SLO / error-budget tracking', status: CF, cat: C.OBS, evidence: '-', roadmap: 'Observability', next: 'commercial ops' },
]);

// -------- P6 (14) Human Governance --------
block('P6', [
  { name: 'Founder gate (explicit authorization phrase)', status: I, cat: C.HUM, evidence: 'gate progression; blocked lists', roadmap: 'Governance', next: 'keep' },
  { name: 'Founder Drive Mode (plain-English)', status: I, cat: C.HUM, evidence: 'Drive Mode panel + manual retest pass', roadmap: 'Founder Drive Mode', next: 'keep simplifying' },
  { name: 'Founder-blind manual retest', status: I, cat: C.HUM, evidence: 'two founder-blind retests', roadmap: 'Founder Drive Mode', next: 'repeat per major change' },
  { name: 'Reviewer readiness / showroom', status: I, cat: C.HUM, evidence: 'Reviewer + Showroom subsection', roadmap: 'Reviewer Readiness', next: 'keep' },
  { name: 'Founder acceptance records', status: PA, cat: C.HUM, evidence: 'Gate 1-7 accepted w/ limits', roadmap: 'Governance', next: 'accept Aug-3 arc' },
  { name: 'No-overclaim guarantee to founder', status: I, cat: C.HUM, evidence: 'claim-blocker + limits docs', roadmap: 'Doctor', next: 'keep' },
  { name: 'Founder hand-burden rule', status: I, cat: C.HUM, evidence: 'constitution; visual-only ops', roadmap: 'Governance', next: 'keep' },
  { name: 'Project Knowledge sync (paste-ready)', status: I, cat: C.HUM, evidence: 'PK V3; V4 this run', roadmap: 'Project Knowledge', next: 'founder pastes V4' },
  { name: 'Roadmap visibility', status: I, cat: C.HUM, evidence: 'roadmap sync docs + panel', roadmap: 'Roadmap', next: 'keep updated' },
  { name: 'Consent-before-irreversible-action', status: I, cat: C.HUM, evidence: 'blocked-action lists; gates', roadmap: 'Governance', next: 'keep' },
  { name: 'Founder README per run', status: I, cat: C.HUM, evidence: 'FOUNDER_README per packet', roadmap: 'Governance', next: 'keep' },
  { name: 'Objection / QA handling', status: I, cat: C.HUM, evidence: 'FOUNDER_QA_OBJECTIONS doc', roadmap: 'Reviewer Readiness', next: 'keep' },
  { name: 'Multi-founder / delegation model', status: NY, cat: C.HUM, evidence: '-', roadmap: 'Governance', next: 'design for team' },
  { name: 'Legal / IP governance', status: CF, cat: C.HUM, evidence: '-', roadmap: 'Commercial', next: 'commercial; requires counsel' },
]);

// -------- P7 (14) Multi-Agent Governance --------
block('P7', [
  { name: 'Builder / Checker / Advisor separation', status: I, cat: C.MULTI, evidence: 'role transcripts every run', roadmap: 'Multi-Agent Gov', next: 'keep' },
  { name: 'Independent checker verification record', status: I, cat: C.MULTI, evidence: 'independentCheckerRecord', roadmap: 'Assurance Core', next: 'enforce checker≠builder' },
  { name: 'Terminal advisor decision record', status: I, cat: C.MULTI, evidence: 'advisor reports every run', roadmap: 'Multi-Agent Gov', next: 'keep' },
  { name: 'Provider cannot self-certify', status: I, cat: C.MULTI, evidence: 'provider-neutral interface', roadmap: 'Assurance Core', next: 'keep' },
  { name: 'Role boundary enforcement (no cross-write)', status: PA, cat: C.MULTI, evidence: 'role attestation docs', roadmap: 'Multi-Agent Gov', next: 'mechanize boundary checks' },
  { name: 'Adversarial verification (refute)', status: PA, cat: C.MULTI, evidence: 'falsification harness', roadmap: 'Assurance Core', next: 'multi-voter refute panel' },
  { name: 'Consensus / quorum on findings', status: NY, cat: C.MULTI, evidence: '-', roadmap: 'Multi-Agent Gov', next: 'N-voter quorum' },
  { name: 'Agent qualification / capability gating', status: I, cat: C.MULTI, evidence: 'tool/mcp classification', roadmap: 'Assurance Core', next: 'keep' },
  { name: 'Inter-agent action trace correlation', status: PA, cat: C.MULTI, evidence: 'per-role action trace', roadmap: 'Observability', next: 'correlate by run-id' },
  { name: 'Conflict / disagreement resolution', status: NY, cat: C.MULTI, evidence: '-', roadmap: 'Multi-Agent Gov', next: 'define escalation' },
  { name: 'Orchestrator determinism', status: PA, cat: C.MULTI, evidence: 'deterministic seeds/records', roadmap: 'Multi-Agent Gov', next: 'formalize orchestrator' },
  { name: 'Sub-agent budget accounting', status: PA, cat: C.MULTI, evidence: 'risk budget framework', roadmap: 'Assurance Core', next: 'per-agent budget' },
  { name: 'Agent identity / attestation', status: NY, cat: C.MULTI, evidence: '-', roadmap: 'Multi-Agent Gov', next: 'signed agent identity' },
  { name: 'Multi-agent replay / audit', status: PA, cat: C.MULTI, evidence: 'evidence viewer replay', roadmap: 'Observability', next: 'multi-agent replay' },
]);

// -------- P8 (14) Operational Intelligence --------
block('P8', [
  { name: 'Doctor / readiness self-check', status: I, cat: C.OPS, evidence: 'Doctor panel + claim-blocker', roadmap: 'Doctor', next: 'keep' },
  { name: 'Live-gate simulator (planning)', status: PA, cat: C.OPS, evidence: 'Live-Gate panel (planning)', roadmap: 'Live-Gate', next: 'wire real gates (planning)' },
  { name: 'Rehearsal / dry-run mode', status: I, cat: C.OPS, evidence: 'rehearsal button', roadmap: 'Doctor', next: 'keep' },
  { name: 'Run scheduling / queueing', status: NY, cat: C.OPS, evidence: '-', roadmap: 'Operational Intel', next: 'design scheduler' },
  { name: 'Failure-mode catalog', status: I, cat: C.OPS, evidence: 'crash fixtures catalog', roadmap: 'Crash Test', next: 'grow catalog' },
  { name: 'Auto-recovery where safe', status: I, cat: C.OPS, evidence: 'crash recovery (6 recovered)', roadmap: 'Crash Test', next: 'keep bounded' },
  { name: 'Cost / spend forecasting', status: BG, cat: C.OPS, evidence: 'Gate-7 bounded only', roadmap: 'Operational Intel', next: 'needs real spend gate' },
  { name: 'Capacity / concurrency limits', status: PA, cat: C.OPS, evidence: 'workflow concurrency cap', roadmap: 'Operational Intel', next: 'formalize limits' },
  { name: 'Health monitoring / heartbeat', status: PA, cat: C.OPS, evidence: 'health poll in dashboard', roadmap: 'Observability', next: 'expand' },
  { name: 'Anomaly detection', status: NY, cat: C.OPS, evidence: '-', roadmap: 'Operational Intel', next: 'define signals' },
  { name: 'Runbook automation', status: NY, cat: C.OPS, evidence: '-', roadmap: 'Operational Intel', next: 'encode runbooks' },
  { name: 'Backup / restore of evidence', status: PA, cat: C.OPS, evidence: 'sealed ZIPs + backup dir', roadmap: 'Evidence sealing', next: 'formal restore test' },
  { name: 'Disaster recovery plan', status: NY, cat: C.OPS, evidence: '-', roadmap: 'Operational Intel', next: 'document DR' },
  { name: 'Operational SLAs', status: CF, cat: C.OPS, evidence: '-', roadmap: 'Commercial', next: 'commercial' },
]);

// -------- P9 (14) Platform Extensibility --------
block('P9', [
  { name: 'Provider adapter plugin contract', status: I, cat: C.PLAT, evidence: 'provider_contract.mjs', roadmap: 'Provider/Repo Proof', next: 'version + docs' },
  { name: 'Archetype plugin library', status: I, cat: C.PLAT, evidence: 'archetypes.mjs (10)', roadmap: 'Factory', next: 'plugin API' },
  { name: 'MCP capability registry', status: I, cat: C.PLAT, evidence: 'classifyMcp', roadmap: 'Assurance Core', next: 'dynamic registry' },
  { name: 'Tool capability registry', status: I, cat: C.PLAT, evidence: 'classifyTool', roadmap: 'Assurance Core', next: 'dynamic registry' },
  { name: 'Template registry (idea builder)', status: I, cat: C.PLAT, evidence: 'template-registry.mjs', roadmap: 'Idea Builder', next: 'more safe templates' },
  { name: 'Evidence packet renderer', status: PA, cat: C.PLAT, evidence: 'report renderer + packets', roadmap: 'Evidence sealing', next: 'generalize renderer' },
  { name: 'Pluggable evaluators', status: NY, cat: C.PLAT, evidence: '-', roadmap: 'Evaluation', next: 'evaluator interface' },
  { name: 'Pluggable scanners', status: NY, cat: C.PLAT, evidence: '-', roadmap: 'Security/Trust', next: 'scanner interface' },
  { name: 'Public API surface', status: NY, cat: C.PLAT, evidence: '-', roadmap: 'Platform', next: 'design API' },
  { name: 'SDK / CLI for adopters', status: NY, cat: C.PLAT, evidence: '-', roadmap: 'Platform', next: 'design SDK' },
  { name: 'Config-driven runtime manifest', status: I, cat: C.PLAT, evidence: 'makeRuntimeManifest', roadmap: 'Assurance Core', next: 'external config source' },
  { name: 'Theming / white-label UI', status: NY, cat: C.PLAT, evidence: '-', roadmap: 'Product', next: 'later' },
  { name: 'Internationalization', status: NY, cat: C.PLAT, evidence: '-', roadmap: 'Product', next: 'later' },
  { name: 'Marketplace of adapters', status: CF, cat: C.PLAT, evidence: '-', roadmap: 'Commercial', next: 'commercial' },
]);

// -------- P10 (16) Commercial Differentiators --------
block('P10', [
  { name: 'Customer proof / case studies', status: CF, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'requires real customers' },
  { name: 'Paid pilot / revenue proof', status: CF, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'requires billing (blocked)' },
  { name: 'SaaS multi-tenant platform', status: CF, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'requires deploy (blocked)' },
  { name: 'Production deployment', status: BG, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'founder gate; blocked' },
  { name: 'Billing / payments integration', status: BG, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'founder gate; blocked' },
  { name: 'Marketing site / outreach', status: BG, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'founder gate; blocked' },
  { name: 'Pricing / packaging', status: CF, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'commercial strategy' },
  { name: 'Investor showroom one-pager', status: I, cat: C.COMM, evidence: 'INVESTOR_SHOWROOM_ONE_PAGER', roadmap: 'Reviewer Readiness', next: 'keep honest' },
  { name: 'Competitive differentiation narrative', status: PA, cat: C.COMM, evidence: '"gate over any worker" thesis', roadmap: 'Roadmap', next: 'sharpen' },
  { name: 'Compliance certifications (commercial)', status: CF, cat: C.COMM, evidence: '-', roadmap: 'Security/Trust', next: 'commercial' },
  { name: 'Enterprise SSO / provisioning', status: CF, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'commercial' },
  { name: 'Support / SLA offering', status: CF, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'commercial' },
  { name: 'Partner / reseller program', status: CF, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'commercial' },
  { name: 'Usage analytics (customer)', status: BG, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'customer data blocked' },
  { name: 'Onboarding / self-serve signup', status: CF, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'commercial' },
  { name: 'Brand / trust seal program', status: CF, cat: C.COMM, evidence: '-', roadmap: 'Commercial', next: 'commercial' },
]);

// ---- integrity: exactly 160 ----
if (rows.length !== 160) { console.error('FATAL: expected 160 rows, got ' + rows.length); process.exit(1); }

// ---- counts ----
const counts = {}; for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
const byPrio = {}; for (const r of rows) { byPrio[r.prio] = byPrio[r.prio] || {}; byPrio[r.prio][r.status] = (byPrio[r.prio][r.status] || 0) + 1; }

// ---- FULL_ADOPTION_MATRIX_160.md ----
let md = `# FULL Adoption Matrix — 160 items (P1–P10)\n\n`;
md += `> **Provenance limit (honest):** Items **1–20 (P1)** are quoted **verbatim** from this run's operator prompt (SOURCE=${V}).\n`;
md += `> Items **21–160 (P2–P10)** were **not embedded** in the prompt text; FounderGate **derived** them from the 12 roadmap\n`;
md += `> categories and the AI-assurance domain to account for all 160 slots (SOURCE=${DER}). Every derived row is marked so.\n`;
md += `> None are hidden or invented as "founder-supplied." Names/status for P2–P10 are FounderGate's best-effort backlog, **pending founder confirmation.**\n\n`;
md += `## Status totals\n\n| Status | Count |\n| --- | ---: |\n`;
for (const s of [I, PA, NY, BG, CF]) md += `| ${s} | ${counts[s] || 0} |\n`;
md += `| **TOTAL** | **${rows.length}** |\n\n`;
md += `## Per-priority totals\n\n| Priority | INTEGRATED | PARTIAL | NOT_YET | BLOCKED_BY_FOUNDER_GATE | COMMERCIAL_FUTURE | Total |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
for (const p of ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10']) { const b = byPrio[p]||{}; const t = Object.values(b).reduce((a,c)=>a+c,0); md += `| ${p} | ${b[I]||0} | ${b[PA]||0} | ${b[NY]||0} | ${b[BG]||0} | ${b[CF]||0} | ${t} |\n`; }
md += `\n## Full item table\n\n| # | Item | Prio | Status | Category | Evidence basis | Roadmap location | Required next proof | This run touches | Source |\n| ---: | --- | --- | --- | --- | --- | --- | --- | :---: | --- |\n`;
for (const r of rows) md += `| ${r.n} | ${r.name} | ${r.prio} | ${r.status} | ${r.cat} | ${r.evidence} | ${r.roadmap} | ${r.next} | ${r.touch} | ${r.src === V ? 'verbatim' : 'derived*'} |\n`;
md += `\n\\* derived = FounderGate-proposed backlog item, pending founder confirmation of the exact name/priority.\n`;
writeFileSync(join(DIR, 'FULL_ADOPTION_MATRIX_160.md'), md);

// ---- ROADMAP_INTEGRATION_MAP.md ----
const cats = Object.values(C);
let rm = `# Roadmap Integration Map — 160 adoption items → 12 roadmap categories\n\nEach of the 160 items maps to exactly one of the 12 categories. Counts below are auto-derived (total = 160).\n\n`;
const byCat = {}; for (const r of rows) { (byCat[r.cat] = byCat[r.cat] || []).push(r); }
rm += `## Category totals\n\n| # | Category | Items | INTEGRATED | PARTIAL | NOT_YET | BLOCKED | COMMERCIAL |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
let grand = 0;
for (const cat of cats) { const list = byCat[cat] || []; grand += list.length; const c = {}; for (const r of list) c[r.status]=(c[r.status]||0)+1; rm += `| ${cat.split(' ')[0]} | ${cat.replace(/^\d+ /,'')} | ${list.length} | ${c[I]||0} | ${c[PA]||0} | ${c[NY]||0} | ${c[BG]||0} | ${c[CF]||0} |\n`; }
rm += `| | **TOTAL** | **${grand}** | | | | | |\n\n`;
for (const cat of cats) { const list = byCat[cat] || []; rm += `## ${cat} (${list.length})\n\n`; for (const r of list) rm += `- **#${r.n} ${r.name}** — ${r.prio} · ${r.status} · next: ${r.next}\n`; rm += `\n`; }
writeFileSync(join(DIR, 'ROADMAP_INTEGRATION_MAP.md'), rm);

console.log(`MATRIX_OK rows=${rows.length} ` + [I,PA,NY,BG,CF].map(s=>`${s}=${counts[s]||0}`).join(' '));
