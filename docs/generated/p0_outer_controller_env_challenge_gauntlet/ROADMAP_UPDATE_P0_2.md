# Roadmap Update — P0.2 Always-On Outer Controller + Environment Integrity Challenge Gauntlet

## Maturity label
LOCAL_SYNTHETIC_RUNTIME_CONTROL_READY_WITH_LIMITS

## Completed before this run
- P0 Core IP primitives (46), Assumption Verification Engine, Environment/Execution Integrity, Boundary Monitoring, Containment, Evidence Confidence, AI Assurance records — a tested local library.
- P1 Assurance Core; provider-agnostic simulated harness; app factory / crash recovery / drive mode / showroom.

## What this run adds
- **Always-on deterministic outer controller** (`src/outer_controller/outer-controller.mjs`) that wraps a local synthetic worker: load+validate run contract → pre-run attestation → active boundary challenge gauntlet → admission → run worker → expected-vs-observed runtime → containment on violation/unknown/monitoring-loss/deadline → independent evidence plane → post-run verification → final verdict. The worker cannot override it.
- **Environment Run Contract**, **Pre-Run Attestation**, **Active Boundary Challenge Tests** (15 challenges), **Independent Evidence Plane** (append-only, outside worker), **Expected-vs-Observed Runtime Comparison**, **External Stop Controller** (with a real harmless-child teardown proof), **Post-Run Verification** (never "secure").
- A **16-fixture gauntlet**: good fixture verified; 15 controlled failures all held/stopped/quarantined; 0 false green; 0 "secure".

## What remains blocked
- Real provider activation, private repo access, Gate 8, deploy, bill, outreach, customer data, merge — all blocked; each needs an explicit founder phrase. No external network probing.

## Why this is core IP
- It is the deterministic outer controller that treats any AI/worker as replaceable and unable to self-certify — the structural claim behind "FounderGate is the gate." Independent evidence + controlled failure detection is the defensible primitive.

## Relation to lab-scale containment incidents (no customer validation claimed)
- Publicly discussed AI-agent containment failures (network exfil, credential/metadata access, sandbox escape, monitoring gaps) motivate this design. FounderGate demonstrates **local synthetic** detection/stop/seal of analogous failure shapes. This is NOT a claim of validation against any lab's real environment, and NOT an OpenAI/Anthropic-ready claim.
