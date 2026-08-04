# Project Knowledge Update Bundle — V5 (paste-ready for ChatGPT Project Knowledge)

> **Claude cannot edit ChatGPT Project Knowledge directly.** Paste this in as the current source of truth. It supersedes V4.

## Anti-drift (read first)
- FounderGate is the **deterministic outer controller / GATE**; any AI/worker is a **replaceable worker** that **cannot override the controller or self-certify**.
- Everything is **LOCAL / SYNTHETIC with limits**. NOT real sandbox/network/production security — none claimed. No final verdict says "secure".
- Real provider activation, private repo access, and Gate 8 are **blocked**; each needs an explicit founder authorization phrase. No external network probing.

## Roadmap status (updated 2026-08-03, after P0.2)
- Local proofs (with limits): app factory, repeatability, crash recovery, Drive Mode, showroom, provider-agnostic harness, P1 Assurance Core, P0 Core IP, and now **P0.2 — Always-On Outer Controller + Environment Integrity Challenge Gauntlet** (LOCAL_SYNTHETIC_RUNTIME_CONTROL_READY_WITH_LIMITS).
- Gates 1–7 accepted with limits; Aug-3 arc complete-with-limits but not yet founder-accepted; Gate 8 blocked.

## Always-on outer controller status
- `src/outer_controller/outer-controller.mjs` wraps a local synthetic worker end-to-end (contract → attestation → challenge gauntlet → admission → runtime compare → containment → evidence plane → post-run verification → final verdict). Worker cannot override.

## Environment Run Contract / Pre-run attestation / Boundary challenges / Evidence plane
- Run contract validated + digest-bound. Pre-run attestation fails closed on missing critical evidence. 15 boundary challenges record behavior (config alone is never PASS). Evidence plane is append-only, outside the worker, digest-chained.

## Flight-recorder UI status
- New "Boundary Assurance / Flight Recorder" dashboard panel; visible headed proof 11/11 + 9 screenshots + video. 16-fixture gauntlet: good verified, 15 bad held/stopped/quarantined, 0 false green, 0 "secure".

## What remains local/synthetic
- Everything. This is not real isolation/sandbox/production proof; challenges are synthetic (one real harmless child for teardown only).

## Blocked gates (unchanged)
- real provider activation / private repo access / Gate 8 / deploy / bill / outreach / customer data / merge — blocked. No external network.

## Next recommended step (founder's choice)
- Continue **P3 Security & Trust locally**, or deepen the outer controller (more challenge shapes, evidence-plane persistence). Real-world milestone = one real provider adapter proof (founder gate; not authorized here). Zero-risk: paste this V5 into ChatGPT PK.
