# Judgment Panels + Evidence Bus — TEMPLATE / SPEC

> **TEMPLATE — NOT YET RUNNABLE.** This document is a design spec and a template for a judgment layer that is **not built**. No evidence bus, panel, renderer, route, or data source exists yet. Treat every panel below as a target shape to build toward, not a feature you can open today. The one non-negotiable rule: **a panel renders only what a real artifact proves, or renders `— (not yet wired)`; a fabricated score is a safety failure.**

> **Plain English — read this first.**
>
> 1. **What this is.** A design for two related things: an **evidence bus** (a single append-only place where every lane drops the real artifacts it already produces — proof files, checker verdicts, fingerprints, PR/CI state) and a small set of **judgment panels** (founder-facing scores for complexity, false-green risk, security exposure, and tech-debt) that a dashboard would render **only** from those real artifacts.
> 2. **Why it matters.** Today the harness's real signals are scattered across many files. A founder can't see, at a glance, whether a change is risky, whether something only *looks* proven, whether a forbidden surface was touched, or what debt is piling up. These panels would surface exactly that — honestly.
> 3. **What can go wrong.** The dangerous failure is a **fabricated score** — a panel that shows "SAFE" or a made-up risk percentage with no artifact behind it. That would hide the very problems it's meant to surface. So the rule is absolute: no backing artifact means the panel shows `— (not yet wired)`, never an invented number.
> 4. **What you can test now.** Nothing renders yet — this is a template. What you can verify is the *rule*: every panel description below names the exact real artifact it must derive from, and the honest empty state it must show when that artifact is absent.
> 5. **One next action.** If this ever gets built, build the **evidence bus first** — it's the substrate every panel reads. Until then, read this as the target and know that the raw artifacts exist but the bus and panels do not.

> **Status: SPEC / TEMPLATE ONLY — BUILDS NOTHING.** Every panel below is tagged with what it would need and whether that source exists today. This document changes no runtime file and claims no dashboard or bus exists.

---

## 0. Why an evidence bus at all

Today the harness's real signals are scattered: local proof JSON, deterministic checker verdicts, before/after fingerprints, lane leases and reports, PR/CI state. The **evidence bus** is the missing aggregation layer — but strictly as a **read-and-collate** surface, never a judge and never an actor.

**What the evidence bus is NOT:** it is not a merge sheriff, not a checker, not a gate-crosser. It reads artifacts other lanes already wrote and files them by event; it renders nothing green that an artifact does not prove.

---

## 1. Evidence-bus data model (spec)

An append-only event log. Each event is one JSON record; the bus never mutates or deletes an event, only appends.

```
{
  "event_id":    "<uuid>",
  "ts":          "<ISO-8601>",
  "project_id":  "<slug>",
  "lane":        "<lease/branch id>",
  "kind":        "proof|checker_verdict|fingerprint|pr_state|ci_state|gate_parked",
  "source_path": "<repo-relative path of the REAL artifact>",
  "sha":         "<exact commit the artifact is bound to>",
  "summary":     "<one line, copied from the artifact, never inferred>",
  "verdict":     "PASS|FAIL|UNKNOWN|— (not yet wired)"
}
```

**Hard rules for the bus:**

- **Every event cites a `source_path` to a real on-disk artifact.** An event with no backing file is invalid and must not be written.
- **`verdict:UNKNOWN` and `— (not yet wired)` are first-class, honest values.** The bus never upgrades UNKNOWN to PASS.
- **The bus is read-only toward every target and every gate.** It ingests; it never merges, sends, deploys, or crosses a founder gate. (A permanent gated boundary once built.)
- **SHA-bound.** A proof/verdict event is only valid for the exact SHA it names; a superseded SHA renders stale.

**Today's status of the bus:** **NOT STARTED.** The artifacts it would ingest exist; the append-only collator does not.

---

## 2. The judgment panels (spec, real-artifact-sourced only)

Four founder-facing panels. Each states what it shows, the **real artifact** it must derive from, the honest render when that artifact is absent, and its status. **No panel may compute a score from anything but a cited artifact.**

### 2.1 Complexity panel
- **Shows:** how big/risky the change surface of a lane is, in plain language.
- **Real source:** the lane's diff stat, file count, and whether it touches a sensitive-path list. All derivable read-only.
- **Honest empty render:** `— (not yet wired)` if no branch/diff is bound.
- **Score rule:** buckets only (`small / medium / large`) from real line/file counts; never a fabricated numeric "risk %".
- **Status: PLANNED** (inputs are real; the panel is not built).

### 2.2 False-green risk panel
- **Shows:** the risk that something *looks* proven but is not — the harness's core anti-overclaim signal.
- **Real source:** a cross-check of the evidence bus — a PASS event whose SHA does not match current HEAD (stale-SHA green), a proof present without an **independent** checker verdict (self-cert risk), or a half round-trip fingerprint (a before without a net-zero after).
- **Honest empty render:** `— (not yet wired)` if the bus is absent.
- **Score rule:** enumerates the *specific* mismatches found; never a subjective gut-feel score. Zero mismatches renders "no false-green signals found," not "SAFE."
- **Status: PLANNED** (this panel is the whole reason the bus must be SHA-bound and cite independent verdicts).

### 2.3 Security-exposure panel
- **Shows:** whether any lane touched or attempted a forbidden surface.
- **Real source:** role-guard / safety-gate outputs and the denylist checks the harness already runs (secrets, provider SDKs, credential paths). A parked-gate event also feeds this panel.
- **Honest empty render:** `— (not yet wired)` if no guard output is captured.
- **Score rule:** a discrete list of any guard that fired or any gate parked; an empty list renders "no forbidden-surface events recorded," never "secure."
- **Status: PLANNED.** This panel **never acts** — it is gated to display-only.

### 2.4 Tech-debt panel
- **Shows:** known-but-deferred work, each with a reason.
- **Real source:** the recorded concurrency-blocker list, the project's blockers array, and recorded roadmap hard-stops.
- **Honest empty render:** if open blockers exist, an empty render would itself be dishonest; the panel must show the real open items.
- **Score rule:** a count plus the top open blocker by tier, both cited; no invented "debt %".
- **Status: PLANNED** (inputs are real and enumerated today; the panel is not built).

---

## 3. Panel source-of-truth table (honest)

| Panel | Real source (must cite) | Today |
|---|---|---|
| Complexity | diff stat + sensitive-path check | **PLANNED** (inputs real) |
| False-green risk | evidence bus: stale-SHA / no-independent-verdict / half-round-trip | **PLANNED** (needs the bus) |
| Security exposure | role-guard/denylist outputs + parked-gate events | **PLANNED** (gated display-only) |
| Tech-debt | blocker list + blockers array + roadmap hard-stops | **PLANNED** (inputs real) |
| The evidence bus itself | append-only log over the above artifacts | **NOT STARTED** |

**Do not read this table as "judgment panels exist."** They do not. Every input named is real, but the collator and the panels are unbuilt and must be built under a separate, founder-approved builder task with its own lease and Checker verdict.

---

## 4. Non-goals (permanent)

- The bus and panels **never act** — no merge, send, deploy, or gate crossing. They are a read-only mirror. (Gated forever.)
- **No fabricated score.** A panel with no backing artifact renders `— (not yet wired)`; empty is honest, invented is a safety failure.
- **No self-certification.** A false-green panel that hid a missing independent verdict would defeat its own purpose; the panel must *surface* the gap.
- This spec **changes no runtime file** and claims **no dashboard or bus exists**.

---

## 5. Build order (when a future task is approved)

1. **Evidence bus first** (append-only collator over existing artifacts; SHA-bound; UNKNOWN-honest) — it is the substrate every panel reads.
2. **Tech-debt + complexity panels** (their inputs are already real and enumerated).
3. **False-green + security panels** (depend on the bus's SHA-binding and independent-verdict cross-check).

Each step is a separate leased builder task + independent Checker verdict + founder merge gate. Until then this document is the target; the honest current state is: **the raw artifacts exist, but neither the evidence bus nor any judgment panel is built.**

---

*Template / spec document. Ships no bus, panel, renderer, or automation.*
