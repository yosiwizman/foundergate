// Deterministic generator for FULL_ADOPTION_MATRIX_MERGED.md.
// Part 1: the NEW P0/P1/P2/P3 governance-primitive list (verbatim from this run's prompt), fully enumerated.
// Part 2: the prior 160-item P1–P10 matrix, carried forward by reference with reproduced per-priority totals.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const DIR = dirname(fileURLToPath(import.meta.url));

const I='INTEGRATED', PA='PARTIAL', NY='NOT_YET', BG='BLOCKED_BY_FOUNDER_GATE', CF='COMMERCIAL_FUTURE';
const rows = [];
let seq = 0;
const CORE = 'src/core_ip/core-ip-primitives.mjs';
const add = (name, prio, status, file, test, evidence, next) => rows.push({ id: 'G' + String(++seq).padStart(3, '0'), name, prio, status, file: file || '-', test: test || '-', evidence: evidence || '-', next: next || '-', run: status === I || status === PA ? 'YES' : 'NO' });

// ---- P0_CORE_IP : header (9) + detailed (Lane B groups) ----
add('Independent evidence collection','P0_CORE_IP',I,CORE,'tests/core_ip/core-ip-primitives.selftest.mjs','independentEvidenceRecord; selftest 1','wire into every run');
add('Deterministic verification','P0_CORE_IP',I,CORE,'core-ip selftest 5,6','baseline/candidate + discriminating tests','keep');
add('Failure intelligence','P0_CORE_IP',I,CORE,'core-ip selftest 9-12','fingerprint + retry budget + churn','keep');
add('Durable planning','P0_CORE_IP',I,CORE,'core-ip selftest 13,14','plan ledger + stable IDs + selective invalidation','persist ledger');
add('Admission control','P0_CORE_IP',I,CORE,'core-ip selftest 15-17','admission gate + budget + deadline','keep');
add('Scope governance','P0_CORE_IP',I,CORE,'core-ip selftest 18,19','scope declaration/verification/diff','keep');
add('Runtime governance','P0_CORE_IP',I,CORE,'core-ip selftest 20,21','checkpoint/cancellation/cleanup','keep');
add('Deterministic outer controller','P0_CORE_IP',PA,CORE,'core-ip bonus','innerOuterLoop + evidenceDrivenController records','wire as always-on driver');
add('Assumption verification engine','P0_CORE_IP',I,'src/assumption_verification/assumption-engine.mjs','tests/assumption_verification/assumption-engine.selftest.mjs','10 assumptions verified; package','keep');
// Evidence & Verification (7)
[['Evidence over self-report','independentEvidenceRecord'],['Exact-state evidence binding','exactStateBinding'],['Evidence staleness detection','detectEvidenceStaleness'],['Independent artifact verification','verifyArtifactIndependently'],['Producer/Verifier disagreement recording','recordProducerVerifierDisagreement'],['Verification bound to immutable state','bindVerificationToImmutableState']].forEach(([n,f])=>add(n,'P0_CORE_IP',I,CORE,'core-ip selftest',f,'keep'));
// Deterministic Verification (rest)
[['Baseline vs candidate verification','baselineVsCandidateVerification'],['Discriminating tests','discriminatingTestRecord'],['Tests that fail against previous version','discriminatingTestRecord'],['Acceptance predicates','acceptancePredicate'],['Verification before acceptance','verifyBeforeAcceptance'],['Verification after mutation','verifyAfterMutation']].forEach(([n,f])=>add(n,'P0_CORE_IP',I,CORE,'core-ip selftest',f,'keep'));
// Failure Intelligence
[['Failure fingerprinting','failureFingerprint'],['Retry budget per fingerprint','retryBudgetForFingerprint'],['Retry only after material state change','requireMaterialStateChangeBeforeRetry'],['Failed hypothesis detection','detectFailedHypothesis'],['Unknown as first-class state','classifyFailure'],['Failure classification engine','classifyFailure'],['No-progress detection','detectNoProgress'],['Churn detection','detectChurn']].forEach(([n,f])=>add(n,'P0_CORE_IP',I,CORE,'core-ip selftest',f,'keep'));
// Planning
[['Durable plan ledger','durablePlanLedgerEntry'],['Stable step IDs','stableStepId'],['Step dependencies','stepDependencyRecord'],['Required evidence per step','requiredEvidencePerStep'],['Selective plan invalidation','selectivePlanInvalidation'],['Resume from checkpoint','resumeCheckpointRecord'],['One bounded action per iteration','boundedActionIteration']].forEach(([n,f])=>add(n,'P0_CORE_IP',I,CORE,'core-ip selftest',f,'persist'));
// Admission Control
[['Admission Gate','admissionGateDecision'],['Active run detection','activeRunDetectionRecord'],['Duplicate detection','duplicateDetectionRecord'],['Budget reservation','budgetReservation'],['Cross-run budgets','crossRunBudgetRecord'],['Wall-clock deadline','wallClockDeadlineRecord'],['External supervisor ownership','externalSupervisorOwnership']].forEach(([n,f])=>add(n,'P0_CORE_IP',I,CORE,'core-ip selftest',f,'keep'));
// Scope Governance
[['Scope declaration','scopeDeclaration'],['Scope authorization','scopeAuthorizationRecord'],['Scope verification','scopeVerification'],['Actual diff verification','actualDiffVerificationRecord'],['Pre-acceptance scope validation','preAcceptanceScopeValidation'],['Post-execution scope validation','postExecutionScopeValidation']].forEach(([n,f])=>add(n,'P0_CORE_IP',I,CORE,'core-ip selftest',f,'keep'));
// Runtime Governance
[['Checkpoint persistence','checkpointPersistenceRecord'],['Outcome-aware retention','outcomeAwareRetentionDecision'],['Cancellation persistence','cancellationPersistenceRecord'],['Cancellation as supervisor action','supervisorCancellationRecord'],['Side-effect-aware cleanup','sideEffectAwareCleanupRecord']].forEach(([n,f])=>add(n,'P0_CORE_IP',I,CORE,'core-ip selftest',f,'keep'));
// Architecture
add('Inner AI Loop','P0_CORE_IP',I,CORE,'core-ip bonus','innerOuterLoopRecord','keep');
add('Outer Deterministic Loop','P0_CORE_IP',I,CORE,'core-ip bonus','innerOuterLoopRecord (authority=outer)','wire as driver');
add('Evidence-driven outer controller','P0_CORE_IP',PA,CORE,'core-ip bonus','evidenceDrivenControllerDecision','always-on');
add('Human authority outside the AI loop','P0_CORE_IP',I,CORE,'core-ip bonus','humanAuthorityOutsideAiLoopRecord','keep');

// ---- P1_ASSURANCE : environment/execution/AI assurance ----
add('Environment integrity verification','P1_ASSURANCE',I,'src/environment_integrity/environment-integrity.mjs','tests/environment_integrity/environment-integrity.selftest.mjs','8 checks + seal (local; NOT real isolation)','real isolation harness (gated)');
add('Execution integrity verification','P1_ASSURANCE',I,'src/execution_integrity/execution-integrity.mjs','tests/execution_integrity/execution-integrity.selftest.mjs','10 checks; fails closed (local; NOT real sandbox)','real sandbox proof (gated)');
add('Continuous boundary monitoring','P1_ASSURANCE',I,'src/boundary_monitoring/boundary-monitor.mjs','tests/boundary_monitoring/boundary-monitor.selftest.mjs','8 dimensions; drift→PAUSE/STOP/QUARANTINE','live monitor (gated)');
add('Automatic containment','P1_ASSURANCE',I,'src/containment/containment-decision.mjs','tests/containment/containment-decision.selftest.mjs','decision + evidence-before-shutdown','live enforcement (gated)');
add('Trust verification / Evidence confidence','P1_ASSURANCE',I,'src/assurance_core/evidence-confidence.mjs','tests/assurance_core/evidence-confidence.selftest.mjs','evidence-only (NOT AI confidence)','cross-run scoring');
add('Context provenance','P1_ASSURANCE',I,'src/assurance_core/ai-assurance-records.mjs','evidence-confidence selftest 30','contextProvenanceRecord','bind to real retrieval');
add('AI configuration manifest','P1_ASSURANCE',I,'src/assurance_core/ai-assurance-records.mjs','evidence-confidence selftest 30','aiConfigurationManifest (real provider disabled)','version on change');
add('Threat model governance','P1_ASSURANCE',I,'src/assurance_core/ai-assurance-records.mjs','falsification 18','threatModelGovernance (stale→STALE)','approval workflow');
add('Evaluation governance','P1_ASSURANCE',PA,'src/assurance_core/ai-assurance-records.mjs','falsification 19','evaluationGovernance = PLANNED_WITH_SCHEMA (no real dataset)','local synthetic eval set');
add('Model qualification','P1_ASSURANCE',PA,'src/assurance_core/ai-assurance-records.mjs','falsification 20','modelQualification = PLANNED_WITH_SCHEMA; real→HOLD','after real adapter proof (gated)');

// ---- P2_COMMERCIAL_DIFFERENTIATOR ----
add('Continuous witness','P2_COMMERCIAL_DIFFERENTIATOR',PA,'assumption+boundary records','-','witness records exist locally','always-on witnessing');
add('Environment evidence package','P2_COMMERCIAL_DIFFERENTIATOR',PA,'src/environment_integrity/environment-integrity.mjs','-','environment_evidence_package + seal (local)','real isolation evidence (gated)');
add('Execution evidence','P2_COMMERCIAL_DIFFERENTIATOR',PA,'src/execution_integrity/execution-integrity.mjs','-','execution_integrity record (local)','real sandbox evidence (gated)');
add('AI assurance certificate','P2_COMMERCIAL_DIFFERENTIATOR',NY,'-','-','assurance records exist; certificate format not built','signed certificate + external attestation');
add('Continuous compliance','P2_COMMERCIAL_DIFFERENTIATOR',NY,'-','-','claim-blocker + limits docs','compliance mapping (commercial)');
add('Customer evidence ledger','P2_COMMERCIAL_DIFFERENTIATOR',BG,'-','-','-','requires real customer data (blocked)');
add('Runtime audit recorder','P2_COMMERCIAL_DIFFERENTIATOR',PA,'action trace + evidence viewer','-','local replay exists','real runtime capture (gated)');
add('Execution replay','P2_COMMERCIAL_DIFFERENTIATOR',PA,'evidence viewer replay','-','local replay exists','real-run replay (gated)');

// ---- P3_LONG_TERM_IP ----
add('Environment integrity engine','P3_LONG_TERM_IP',PA,'src/environment_integrity/environment-integrity.mjs','-','records + seal','continuous real isolation (gated)');
add('Trust engine','P3_LONG_TERM_IP',PA,'src/assurance_core/evidence-confidence.mjs','-','evidence-only confidence','cross-run trust scoring');
add('Runtime reality verification','P3_LONG_TERM_IP',PA,'src/execution_integrity/execution-integrity.mjs','-','local records','real runtime capture (gated)');
add('Autonomous boundary enforcement','P3_LONG_TERM_IP',PA,'src/boundary_monitoring + src/containment','-','records + decisions','live enforce (gated)');
add('Evidence-based AI governance','P3_LONG_TERM_IP',I,CORE,'core-ip + assurance tests','primitives + records proven local','wire as always-on');
add('Supervisor kernel','P3_LONG_TERM_IP',PA,'admissionGate + externalSupervisorOwnership + supervisorCancellation','-','ownership + cancellation records','standalone kernel outside AI loop (gated)');

// ---- counts ----
const counts={}; for(const r of rows) counts[r.status]=(counts[r.status]||0)+1;
const byPrio={}; for(const r of rows){byPrio[r.prio]=byPrio[r.prio]||{};byPrio[r.prio][r.status]=(byPrio[r.prio][r.status]||0)+1;}

let md = `# FULL Adoption Matrix — MERGED (new P0/P1/P2/P3 governance primitives + prior 160-item P1–P10)\n\n`;
md += `## Provenance\n- **Part 1 (below, IDs G001–G${String(seq).padStart(3,'0')}):** the NEW P0/P1/P2/P3 governance-primitive list, quoted **verbatim** from this run's operator prompt, each mapped to an implementation file + test + status.\n`;
md += `- **Part 2:** the prior **160-item P1–P10** adoption matrix is **carried forward** from run/adoption-matrix-p1-assurance-core (\`docs/generated/adoption_matrix_p1_assurance_core/FULL_ADOPTION_MATRIX_160.md\`, in-repo). Its per-priority totals are reproduced below; no item is dropped.\n\n`;
md += `## Part 1 — status totals (new governance list: ${rows.length} items)\n\n| Status | Count |\n| --- | ---: |\n`;
for(const s of [I,PA,NY,BG,CF]) md += `| ${s} | ${counts[s]||0} |\n`;
md += `| **TOTAL (new)** | **${rows.length}** |\n\n`;
md += `## Part 1 — per-priority\n\n| Priority | INTEGRATED | PARTIAL | NOT_YET | BLOCKED | COMMERCIAL | Total |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
for(const p of ['P0_CORE_IP','P1_ASSURANCE','P2_COMMERCIAL_DIFFERENTIATOR','P3_LONG_TERM_IP']){const b=byPrio[p]||{};const t=Object.values(b).reduce((a,c)=>a+c,0);md+=`| ${p} | ${b[I]||0} | ${b[PA]||0} | ${b[NY]||0} | ${b[BG]||0} | ${b[CF]||0} | ${t} |\n`;}
md += `\n## Part 1 — full item table\n\n| ID | Item | Priority | Status | Impl file | Test | Evidence basis | Required next proof | This run implemented |\n| --- | --- | --- | --- | --- | --- | --- | --- | :---: |\n`;
for(const r of rows) md += `| ${r.id} | ${r.name} | ${r.prio} | ${r.status} | ${r.file} | ${r.test} | ${r.evidence} | ${r.next} | ${r.run} |\n`;
md += `\n## Part 2 — prior 160-item matrix (carried forward, not dropped)\n\n`;
md += `Reproduced totals from the prior run (full itemization in \`docs/generated/adoption_matrix_p1_assurance_core/FULL_ADOPTION_MATRIX_160.md\`):\n\n`;
md += `| Prior status | Count |\n| --- | ---: |\n| INTEGRATED | 73 |\n| PARTIAL | 27 |\n| NOT_YET | 32 |\n| BLOCKED_BY_FOUNDER_GATE | 11 |\n| COMMERCIAL_FUTURE | 17 |\n| **TOTAL (prior)** | **160** |\n\n`;
md += `**Merged grand total accounted for:** ${rows.length} (new governance) + 160 (prior P1–P10) = ${rows.length + 160} items, none skipped. Note: several new P0/P1 items are the deeper, now-implemented form of prior P1 assurance rows (e.g. AI configuration manifest, context provenance, threat-model versioning) — they are counted in both lists by design, with the new list reflecting the stronger local implementation.\n`;
writeFileSync(join(DIR,'FULL_ADOPTION_MATRIX_MERGED.md'), md);
console.log(`MERGED_OK new=${rows.length} `+[I,PA,NY,BG,CF].map(s=>`${s}=${counts[s]||0}`).join(' ')+` grand=${rows.length+160}`);
