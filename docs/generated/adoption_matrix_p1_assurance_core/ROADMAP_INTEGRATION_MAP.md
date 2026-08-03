# Roadmap Integration Map — 160 adoption items → 12 roadmap categories

Each of the 160 items maps to exactly one of the 12 categories. Counts below are auto-derived (total = 160).

## Category totals

| # | Category | Items | INTEGRATED | PARTIAL | NOT_YET | BLOCKED | COMMERCIAL |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Foundation/Governance | 20 | 19 | 1 | 0 | 0 | 0 |
| 2 | Technical Proof | 8 | 7 | 0 | 1 | 0 | 0 |
| 3 | Product/Operator | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | Provider/Repo | 10 | 3 | 1 | 2 | 4 | 0 |
| 5 | Security/Trust | 18 | 5 | 2 | 8 | 0 | 3 |
| 6 | Evaluation | 16 | 4 | 5 | 5 | 2 | 0 |
| 7 | Observability | 16 | 8 | 5 | 2 | 0 | 1 |
| 8 | Human Governance | 14 | 11 | 1 | 1 | 0 | 1 |
| 9 | Multi-Agent Governance | 14 | 5 | 6 | 3 | 0 | 0 |
| 10 | Operational Intelligence | 14 | 4 | 4 | 4 | 1 | 1 |
| 11 | Platform Extensibility | 14 | 6 | 1 | 6 | 0 | 1 |
| 12 | Commercial Differentiators | 16 | 1 | 1 | 0 | 4 | 10 |
| | **TOTAL** | **160** | | | | | |

## 1 Foundation/Governance (20)

- **#1 AI System Configuration Manifest** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#2 Context Provenance Record** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#3 Evaluation Dataset Governance** — P1 · PARTIAL · next: define local synthetic eval set; real/customer data stays blocked
- **#4 Security Finding → Validation → Patch → Acceptance separation** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#5 Function Preservation Verification** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#6 Independent Checker Verification** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#7 Mutation / Falsification Testing** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#8 Model & Provider Qualification Process** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#9 Tool Capability Classification** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#10 MCP Capability Classification** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#11 Agent Action Trace** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#12 Evidence Confidence Model** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#13 Risk Budget Framework** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#14 Scan Completeness States** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#15 Threat Model Versioning** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#16 Security Patch Safety Validation** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#17 Exact AI Configuration Fingerprinting** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#18 Provider-Neutral Security Interface** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#19 Immutable Context Snapshot** — P1 · INTEGRATED · next: wire into every provider run; keep local
- **#20 AI Runtime Manifest** — P1 · INTEGRATED · next: wire into every provider run; keep local

## 2 Technical Proof (8)

- **#26 Provider claim-vs-verification diffing** — P2 · INTEGRATED · next: surface per-field diff in UI
- **#29 Deterministic local shell builder** — P2 · INTEGRATED · next: keep as no-LLM baseline
- **#30 Request→artifact binding identity** — P2 · INTEGRATED · next: keep in regression
- **#31 App factory archetype library** — P2 · INTEGRATED · next: expand library carefully
- **#32 Factory repeatability across seeds** — P2 · INTEGRATED · next: keep
- **#33 Crash-injection + recovery gauntlet** — P2 · INTEGRATED · next: keep
- **#34 Independent app validator (classifyApp)** — P2 · INTEGRATED · next: keep
- **#35 Arbitrary (non-archetype) generation** — P2 · NOT_YET · next: out of scope until safe

## 3 Product/Operator (0)


## 4 Provider/Repo (10)

- **#21 One real provider adapter proof (budget-capped)** — P2 · BLOCKED_BY_FOUNDER_GATE · next: founder authorization phrase + $ cap
- **#22 Private-repo read-only evidence proof** — P2 · BLOCKED_BY_FOUNDER_GATE · next: founder authorization phrase
- **#23 Provider-agnostic gated flow (simulated)** — P2 · PARTIAL · next: add real adapter behind gate
- **#24 Hostile provider refusal** — P2 · INTEGRATED · next: keep in regression
- **#25 Repo evidence allowlist (local self-owned)** — P2 · INTEGRATED · next: extend to authorized private repo
- **#27 Multi-provider qualification ledger** — P2 · NOT_YET · next: record qualification runs over time
- **#28 Provider cost accounting (real)** — P2 · BLOCKED_BY_FOUNDER_GATE · next: per-call budget enforcement w/ real spend gate
- **#36 Real provider app generation at scale** — P2 · BLOCKED_BY_FOUNDER_GATE · next: after single real adapter proof
- **#37 Provider sandbox isolation policy** — P2 · NOT_YET · next: define per-provider sandbox contract
- **#38 Provider output schema contract** — P2 · INTEGRATED · next: version the contract

## 5 Security/Trust (18)

- **#39 Security finding lifecycle enforcement** — P3 · INTEGRATED · next: wire to real findings
- **#40 Patch safety validation gate** — P3 · INTEGRATED · next: require before any accept
- **#41 Threat model versioning** — P3 · INTEGRATED · next: bump on scope change
- **#42 Secret / credential scanning in sealer** — P3 · PARTIAL · next: formalize as a named scanner module
- **#43 Protected-path enforcement** — P3 · INTEGRATED · next: keep
- **#44 Claim-blocker (no overclaim)** — P3 · INTEGRATED · next: keep clean every run
- **#45 SAST/dependency scanning** — P3 · NOT_YET · next: add local scanner; report completeness state
- **#46 Supply-chain provenance (SLSA-style)** — P3 · NOT_YET · next: attest build inputs
- **#47 Signed evidence bundles** — P3 · NOT_YET · next: add signature (local key) then external
- **#48 Security certification (SOC2/ISO)** — P3 · COMMERCIAL_FUTURE · next: commercial; requires org + auditor
- **#49 Compliance mapping (GDPR/HIPAA)** — P3 · COMMERCIAL_FUTURE · next: commercial; requires legal
- **#50 Pen-test / red-team program** — P3 · COMMERCIAL_FUTURE · next: commercial
- **#51 Data classification & handling policy** — P3 · NOT_YET · next: define; customer data stays blocked
- **#52 Access-control / RBAC model** — P3 · NOT_YET · next: design for multi-user
- **#53 Audit-log immutability** — P3 · PARTIAL · next: append-only store
- **#54 Incident response runbook** — P3 · NOT_YET · next: document
- **#55 Prompt-injection defense evidence** — P3 · NOT_YET · next: test corpus + falsification
- **#56 Vulnerability disclosure policy** — P3 · NOT_YET · next: publish policy (planning)

## 6 Evaluation (16)

- **#57 Evaluation dataset schema** — P4 · PARTIAL · next: local synthetic set
- **#58 Real labeled evaluation dataset** — P4 · BLOCKED_BY_FOUNDER_GATE · next: needs real/customer data → blocked
- **#59 Golden-task regression suite** — P4 · PARTIAL · next: consolidate as named golden set
- **#60 Falsification/mutation coverage** — P4 · INTEGRATED · next: grow hostile corpus
- **#61 Evaluator independence (checker≠builder)** — P4 · INTEGRATED · next: keep
- **#62 External human evaluator (Gate 8)** — P4 · BLOCKED_BY_FOUNDER_GATE · next: founder authorization phrase
- **#63 Benchmark against baselines** — P4 · NOT_YET · next: define baselines
- **#64 Scoring / confidence calibration** — P4 · PARTIAL · next: calibrate thresholds w/ data
- **#65 A/B provider comparison** — P4 · NOT_YET · next: after real adapters
- **#66 Eval result provenance** — P4 · PARTIAL · next: bind eval runs to snapshots
- **#67 Regression gating in CI** — P4 · PARTIAL · next: expand check coverage
- **#68 Flaky-test detection** — P4 · NOT_YET · next: add retry/flake tracking
- **#69 Coverage completeness reporting** — P4 · INTEGRATED · next: wire to real scans
- **#70 Eval dataset governance approvals** — P4 · NOT_YET · next: approval workflow
- **#71 Human-in-the-loop eval UI** — P4 · NOT_YET · next: design reviewer UI
- **#72 Model qualification report** — P4 · INTEGRATED · next: per-model report

## 7 Observability (16)

- **#73 Agent action trace** — P5 · INTEGRATED · next: persist traces
- **#74 Run history ledger** — P5 · INTEGRATED · next: keep
- **#75 Decision ledger** — P5 · INTEGRATED · next: keep
- **#76 Evidence viewer / replay** — P5 · INTEGRATED · next: keep
- **#77 Structured logging (heartbeat units)** — P5 · PARTIAL · next: expand to assurance events
- **#78 Run-id scoping / lifecycle precedence** — P5 · INTEGRATED · next: keep
- **#79 Metrics / dashboards (ops)** — P5 · NOT_YET · next: define metrics
- **#80 Tracing across agents** — P5 · PARTIAL · next: correlate multi-agent traces
- **#81 Alerting on fail-closed events** — P5 · NOT_YET · next: local notifier
- **#82 Evidence confidence over time** — P5 · PARTIAL · next: trend view
- **#83 Scan completeness dashboard** — P5 · INTEGRATED · next: keep
- **#84 Risk budget monitoring** — P5 · INTEGRATED · next: keep
- **#85 Immutable audit trail** — P5 · PARTIAL · next: append-only log
- **#86 Real-time gate status** — P5 · PARTIAL · next: wire to real gates (planning)
- **#87 Observability export bundle** — P5 · INTEGRATED · next: keep
- **#88 SLO / error-budget tracking** — P5 · COMMERCIAL_FUTURE · next: commercial ops

## 8 Human Governance (14)

- **#89 Founder gate (explicit authorization phrase)** — P6 · INTEGRATED · next: keep
- **#90 Founder Drive Mode (plain-English)** — P6 · INTEGRATED · next: keep simplifying
- **#91 Founder-blind manual retest** — P6 · INTEGRATED · next: repeat per major change
- **#92 Reviewer readiness / showroom** — P6 · INTEGRATED · next: keep
- **#93 Founder acceptance records** — P6 · PARTIAL · next: accept Aug-3 arc
- **#94 No-overclaim guarantee to founder** — P6 · INTEGRATED · next: keep
- **#95 Founder hand-burden rule** — P6 · INTEGRATED · next: keep
- **#96 Project Knowledge sync (paste-ready)** — P6 · INTEGRATED · next: founder pastes V4
- **#97 Roadmap visibility** — P6 · INTEGRATED · next: keep updated
- **#98 Consent-before-irreversible-action** — P6 · INTEGRATED · next: keep
- **#99 Founder README per run** — P6 · INTEGRATED · next: keep
- **#100 Objection / QA handling** — P6 · INTEGRATED · next: keep
- **#101 Multi-founder / delegation model** — P6 · NOT_YET · next: design for team
- **#102 Legal / IP governance** — P6 · COMMERCIAL_FUTURE · next: commercial; requires counsel

## 9 Multi-Agent Governance (14)

- **#103 Builder / Checker / Advisor separation** — P7 · INTEGRATED · next: keep
- **#104 Independent checker verification record** — P7 · INTEGRATED · next: enforce checker≠builder
- **#105 Terminal advisor decision record** — P7 · INTEGRATED · next: keep
- **#106 Provider cannot self-certify** — P7 · INTEGRATED · next: keep
- **#107 Role boundary enforcement (no cross-write)** — P7 · PARTIAL · next: mechanize boundary checks
- **#108 Adversarial verification (refute)** — P7 · PARTIAL · next: multi-voter refute panel
- **#109 Consensus / quorum on findings** — P7 · NOT_YET · next: N-voter quorum
- **#110 Agent qualification / capability gating** — P7 · INTEGRATED · next: keep
- **#111 Inter-agent action trace correlation** — P7 · PARTIAL · next: correlate by run-id
- **#112 Conflict / disagreement resolution** — P7 · NOT_YET · next: define escalation
- **#113 Orchestrator determinism** — P7 · PARTIAL · next: formalize orchestrator
- **#114 Sub-agent budget accounting** — P7 · PARTIAL · next: per-agent budget
- **#115 Agent identity / attestation** — P7 · NOT_YET · next: signed agent identity
- **#116 Multi-agent replay / audit** — P7 · PARTIAL · next: multi-agent replay

## 10 Operational Intelligence (14)

- **#117 Doctor / readiness self-check** — P8 · INTEGRATED · next: keep
- **#118 Live-gate simulator (planning)** — P8 · PARTIAL · next: wire real gates (planning)
- **#119 Rehearsal / dry-run mode** — P8 · INTEGRATED · next: keep
- **#120 Run scheduling / queueing** — P8 · NOT_YET · next: design scheduler
- **#121 Failure-mode catalog** — P8 · INTEGRATED · next: grow catalog
- **#122 Auto-recovery where safe** — P8 · INTEGRATED · next: keep bounded
- **#123 Cost / spend forecasting** — P8 · BLOCKED_BY_FOUNDER_GATE · next: needs real spend gate
- **#124 Capacity / concurrency limits** — P8 · PARTIAL · next: formalize limits
- **#125 Health monitoring / heartbeat** — P8 · PARTIAL · next: expand
- **#126 Anomaly detection** — P8 · NOT_YET · next: define signals
- **#127 Runbook automation** — P8 · NOT_YET · next: encode runbooks
- **#128 Backup / restore of evidence** — P8 · PARTIAL · next: formal restore test
- **#129 Disaster recovery plan** — P8 · NOT_YET · next: document DR
- **#130 Operational SLAs** — P8 · COMMERCIAL_FUTURE · next: commercial

## 11 Platform Extensibility (14)

- **#131 Provider adapter plugin contract** — P9 · INTEGRATED · next: version + docs
- **#132 Archetype plugin library** — P9 · INTEGRATED · next: plugin API
- **#133 MCP capability registry** — P9 · INTEGRATED · next: dynamic registry
- **#134 Tool capability registry** — P9 · INTEGRATED · next: dynamic registry
- **#135 Template registry (idea builder)** — P9 · INTEGRATED · next: more safe templates
- **#136 Evidence packet renderer** — P9 · PARTIAL · next: generalize renderer
- **#137 Pluggable evaluators** — P9 · NOT_YET · next: evaluator interface
- **#138 Pluggable scanners** — P9 · NOT_YET · next: scanner interface
- **#139 Public API surface** — P9 · NOT_YET · next: design API
- **#140 SDK / CLI for adopters** — P9 · NOT_YET · next: design SDK
- **#141 Config-driven runtime manifest** — P9 · INTEGRATED · next: external config source
- **#142 Theming / white-label UI** — P9 · NOT_YET · next: later
- **#143 Internationalization** — P9 · NOT_YET · next: later
- **#144 Marketplace of adapters** — P9 · COMMERCIAL_FUTURE · next: commercial

## 12 Commercial Differentiators (16)

- **#145 Customer proof / case studies** — P10 · COMMERCIAL_FUTURE · next: requires real customers
- **#146 Paid pilot / revenue proof** — P10 · COMMERCIAL_FUTURE · next: requires billing (blocked)
- **#147 SaaS multi-tenant platform** — P10 · COMMERCIAL_FUTURE · next: requires deploy (blocked)
- **#148 Production deployment** — P10 · BLOCKED_BY_FOUNDER_GATE · next: founder gate; blocked
- **#149 Billing / payments integration** — P10 · BLOCKED_BY_FOUNDER_GATE · next: founder gate; blocked
- **#150 Marketing site / outreach** — P10 · BLOCKED_BY_FOUNDER_GATE · next: founder gate; blocked
- **#151 Pricing / packaging** — P10 · COMMERCIAL_FUTURE · next: commercial strategy
- **#152 Investor showroom one-pager** — P10 · INTEGRATED · next: keep honest
- **#153 Competitive differentiation narrative** — P10 · PARTIAL · next: sharpen
- **#154 Compliance certifications (commercial)** — P10 · COMMERCIAL_FUTURE · next: commercial
- **#155 Enterprise SSO / provisioning** — P10 · COMMERCIAL_FUTURE · next: commercial
- **#156 Support / SLA offering** — P10 · COMMERCIAL_FUTURE · next: commercial
- **#157 Partner / reseller program** — P10 · COMMERCIAL_FUTURE · next: commercial
- **#158 Usage analytics (customer)** — P10 · BLOCKED_BY_FOUNDER_GATE · next: customer data blocked
- **#159 Onboarding / self-serve signup** — P10 · COMMERCIAL_FUTURE · next: commercial
- **#160 Brand / trust seal program** — P10 · COMMERCIAL_FUTURE · next: commercial

