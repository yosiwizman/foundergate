# Advisor Registry — registered work, none active (as of 2026-07-17, main 8b9d957)

**STATUS: registry · registered work, NONE ACTIVE · founder release required for any item**

> **Plain English.** This is the on-disk record of everything the Advisor has *registered* — harvest queue, doctrine
> backlog, founder backlog, and standing decisions. Persisting it here means it survives any chat/session loss. **Nothing
> in this file is activated by being written down.** Every item is REGISTERED · NONE ACTIVE · founder release required.
> Merged ≠ accepted; DRAFT ≠ authority; registered ≠ released.
>
> **As of:** 2026-07-17 · **Base:** main `8b9d957cfae84b8a745ee8975482ea9f04d9b568` · **Repo:** private ·
> **Author lane:** Lane B (docs-only). **This registry makes no readiness, approval, activation, or release claim.**

All items HELD until explicit founder release. Merged ≠ accepted; DRAFT ≠ authority; registered ≠ released.

## Harvest queue (from AKIOR — patterns transfer, proof does not; pin exact SHA only after AKIOR's own checker evidence seals CLEAN)
- H1 RC Documentation Integrity Gate — source docs/contracts/CLDH_RC_DOCUMENTATION_INTEGRITY_GATE.md in yosiwizman/akior-activepieces-engine. Status: SOURCE-NOT-READY (audited 2026-07-14: placeholder checker identity; SHA binding stale to their main). Adoption path: DRAFT authority citing pinned SHA, incl. mandatory KNOWN-GAP-WAIVED class wired to the W4-recorded absent VB1 pre-signature-audit artifact (named every run, never backfilled) → independent check → founder signature → FounderGate builder + checker + own 10+ mutation tests. NOT a VB1 acceptance criterion unless founder explicitly signs it in.
- H2 Founder Gate Capsule — source: AKIOR FG01 capsule (manifest + minimal committed founder script + side-effect certification + explicit transition-state machine + receipt watcher). Status: AKIOR build in progress; wait for sealed CLEAN evidence at exact SHA. FounderGate applications in priority order: M1 soak-release ceremony, founder signature stamping, side-effect certification retrofitted onto "read-only" audit prompts.
- H3 Founder-Driven Witness Contract — source: AKIOR witness-procedure correction (builder-driven ≠ founder acceptance; founder clicks, terminal instructs/observes read-only; contract check rejects witness packets where automation logs show the tested actions were machine-performed). Status: AKIOR fix in progress. FounderGate application: binding procedure for the future VB3/UI founder witness.
- H4 No Split-Brain UI Contract — source: AKIOR UI critical-mutation incident (2026-07-16). Artifact family extended per 2026-07-16 incident: the critical-mutation registry gains a mandatory effect_class field (destructive / non-destructive / lifecycle-only) with mechanical guards (named failures; seeded red proofs) that lifecycle-only actions never reach destructive endpoints and destructive confirmations never render in non-destructive flows. Also: canonical source seal with supersession lineage + uniqueness guard (single SOURCE_READY authority per artifact family). Harvest waits for the FINAL seal at the final evaluated SHA. Status: REGISTERED · NONE ACTIVE · founder release required.

## Doctrine backlog (docs+hygiene wave, post-current-gates; sources pinned at exact versions in each DRAFT authority)
- D1 Checker Shortcut Catalog — 12 named fake-done shortcuts into all checker standing instructions; the edit itself is evaluation-class (independent check + seeded-shortcut detection proof + founder signature). Shortcut #12 (live incident 2026-07-16): transport success treated as operational success (HTTP 200 masking backend ok:false); required semantics: operation success only on explicit backend body proof (ok + enacted + lifecycle fields), never transport-level res.ok alone.
- D2 Mechanical Floor — deny-lists (force-push, recursive delete) + deterministic hooks (secret-scan on write) on Pro AND M1; explicit sheriff carve-outs; hooks are evaluation-class with fire-proof mutation tests. NOTE: partially emergent already — the Pro's firewall hooks blocked reset --hard / rm -rf / git clean on 2026-07-15 during sheriff work, exactly as designed.
- D3 Component Classification Doctrine (KEYSTONE — lands first or alongside; D1/D2/D5 enforcement are instances of it) — guidance-class vs evaluation-class; oracle-anchored change control for evaluation-class; enumerates current inventory by path on disk; the doctrine itself is evaluation-class (founder signature to amend). Gains the side-effect-certification principle from H2: "read-only by instruction" is a claim, not a property.
- D4 Mismatch Log — Law-68 CONFLICT → recorded event, append-only under docs/assembly-evidence/ (MISMATCH-EVENTS.md exists; this doctrine makes the class systematic); evaluator repair = first-class prioritized work.
- D5 Context Hygiene Law — ~300-line ceiling on standing operational context files ONLY (never constitution/ledgers/evidence); scheduled prune; enforced by a mechanical line-count check (RC-gate family) so it can block.
- Rejected (founder-endorsed): agent/skill/tool maximalism; self-evolution of evaluation components without an external oracle anchor.

## Founder backlog (priority order)
- P1 Backup/DR lane — git-bundle both repos + off-repo evidence (incl. single-copy raw AKIOR soak report at /Users/yosiwizman/Projects/akior-soak-runs/) to two locations; encrypted + data-classified off-site; periodically TESTED restore is the acceptance criterion; untested backup = nonexistent. Stopgap copy of the AKIOR report remains available founder-lane.
- P2 Governance-on-disk — docs/advisor/ for handoffs + tracker versions; committed handoffs carry data class; founder-lane negotiation numbers redacted BEFORE first commit (history is forever). THIS REGISTRY is the first installment.
- P3 Dependency/CVE lane — periodic audit→propose→check→evidence wave; never moves main during a live soak binding; never runs on a soak host.
- P4 Secrets lifecycle — folds into the W3 Key Custody follow-up; blocked behind the KCA precondition (see below).
- Back burner (design-before-trigger): design-partner intake SANDBOX authority (legal terms prerequisite) · public-claims sync from ledger (trademark clearance first) · founder AI-spend dashboard.

## Standing decisions on record
- KCA precondition: UNSATISFIABLE in current single-operational-principal reality (checker finding, docs/assembly-evidence/kca/LANE_A_KCA_CHECK.md). Founder decision: DEFERRED — two-principal setup available (second GitHub identity + separate M1 user + role row) whenever founders choose; until then dispatcher build remains blocked by HR-4. No exception signed.
- W1-H1 (labeled soak sub-result): tracked hardening item, future evaluation-class lane, not authorized.
- W2 build-time items (ID entropy · pin hash · status mapping): must-fix-before-VB2-build.
- SD-1: CLOSED by PR #127.
- VB1 pre-signature-audit artifact: genuinely ABSENT, honestly recorded (W4), stays OPEN, never backfilled.

## Registered future product stage
- FS1 CUSTOMER SOAK-AS-A-FEATURE ("Endurance Evidence for founder projects") — origin: founder product decision 2026-07-17, the night §29 endurance evidence completed on FounderGate itself. Insight: demo-works ≠ endures; non-developer founders are never told the difference by any AI-builder tool; FounderGate's own soak machinery (soak driver, quiet-host guard, freeze/attestation, lease) is generic and becomes the engine. Scope when released: (a) plain-English soak setup for a founder's app (health definition templates replacing hand-written SLOs), (b) managed quiet run environment (the founder does not own a dedicated Mac), (c) Truth Dashboard endurance cards with honest PASS / NOT-PASSED-with-true-reason in founder language, (d) the qualification ladder 8h → 24h → 48h → 30d as guided steps in the founder flow at the approach to go-live. Position: AFTER V8.11 (post-VB3 — the recommendation belongs at the act edge); entering V8.11 mid-stage would violate Law 69 scope discipline. V8.11-NATIVE SLOTS (ride along with already-planned work, no new scope): (1) evidence taxonomy includes an Endurance category from day one — FounderGate's own soak rows are its first entries; (2) VB3 gate-card data model carries an endurance-evidence field (present/absent/stale); (3) the 8h→24h→48h→30d ladder is recorded in the assembly manual as the standing qualification pattern. Release: founder gate, not before VB3 acceptance. Status: REGISTERED · NONE ACTIVE · founder release required.
