# **Machine Capacity and Resource-Aware Lane Scheduler**

**Post-MVP / Commercialization Architecture Note**

---

**This architecture note does not change Roadmap V8.11 and does not authorize implementation in V8-A1. During V8-A1, machine capacity is handled as a Terminal-0 preflight and evidence record only. Productized Machine Capacity Profiler and Resource-Aware Lane Scheduler belong to a later stage, likely V8-B/V8-C/V8-D depending on the implementation path.**

## 1. Why this exists

FounderGate must eventually run safely on different computers: Mac, Ubuntu, Windows, weak laptop, strong workstation, local-only, cloud-writer-heavy, or hybrid. A fixed lane count that is safe on one machine is reckless on another and wasteful on a third. The software must profile the machine and adjust lane count automatically.

## 2. Non-developer founder requirement

The founder must never be asked "how many parallel lanes should we run?" — that is a hardware question a non-developer cannot and should not answer. The system inspects, decides, records its reasoning, and shows the decision in plain English. The founder sees the result; the machine owns the math.

## 3. Machine Capacity Profiler

A component that inspects the host at startup and before each autonomous bundle: operating system, CPU cores, RAM, available disk, Docker availability, Playwright availability, Node/Git/GitHub CLI status, local writer slots, cloud writer slots. It emits one JSON profile per run (schema in Section 5) and a plain-English one-liner ("This machine can safely run 3 lanes; Playwright limited to 1").

## 4. Resource-Aware Lane Scheduler

Consumes the profile plus the lane-type table (Section 6) plus the dependency DAG plus file locks, and produces the lane plan: how many lanes, which types, which order. Hard rule: **more compute allows more lanes only when dependency-safe, file-lock-safe, and proof-safe.** The scheduler may always choose fewer lanes; it may never override dependency safety, file locks, secrets policy, founder gates, or Roadmap V8.11.

## 5. Machine profile JSON draft

```json
{
  "machine_id": "example",
  "os": "macos|ubuntu|windows",
  "cpu_cores": 0,
  "ram_gb": 0,
  "disk_free_gb": 0,
  "docker_available": false,
  "playwright_available": false,
  "node_available": false,
  "git_available": false,
  "github_cli_available": false,
  "local_writer_slots": 0,
  "cloud_writer_slots": 0,
  "recommended_parallel_lanes": 1,
  "heavy_build_lanes": 1,
  "playwright_lanes": 1,
  "safe_mode": true,
  "reason": "default conservative profile"
}
```

## 6. Lane type table

| Lane type | Cost profile | Parallel-safe? |
| ----- | ----- | ----- |
| Docs-only | trivial CPU/RAM | Yes, freely |
| Schema | trivial; same-file conflict risk | Yes, if file sets disjoint |
| Validator/tests | CPU bursts | Yes, after schemas exist |
| UI components | moderate; build tooling RAM | Yes, after shell/reader/guard exist |
| Playwright | browser + ports; heavy | Limited (1–2 typical) |
| Docker | heavy RAM/disk | Forbidden in V8-A1; gated later |
| Local LLM writer | very heavy RAM | Limited by RAM |
| Cloud writer | trivial locally; merge-conflict risk | Limited by conflict risk, not RAM |
| Gate/witness/live action | human + safety | Never parallel; serial by law |

## 7. Safe lane count examples

Conservative defaults: recommended_parallel_lanes = min(cpu_cores / 2, ram_gb / 8), floor 1; playwright_lanes = 1 unless ram_gb ≥ 24 and cores ≥ 8; heavy_build_lanes = 1 unless ram_gb ≥ 32. Cloud writer slots sized by merge-conflict tolerance (disjoint file sets), typically 2–4 regardless of local hardware.

## 8. Mac Mini 24GB example

8–12 cores, 24 GB RAM, fast SSD: recommended_parallel_lanes 3–4; playwright_lanes 1–2; heavy_build_lanes 1; docker false in V8-A1; safe_mode false; reason: "RAM comfortable; browser lanes capped by port isolation."

## 9. Ubuntu workstation example

16 cores, 64 GB RAM: recommended_parallel_lanes 6; playwright_lanes 2; heavy_build_lanes 2; cloud writers 3–4 if file sets disjoint; reason: "CPU/RAM headroom; conflict risk now the limiter, not hardware."

## 10. Weak laptop safe mode example

2–4 cores, 8 GB RAM: safe_mode true; recommended_parallel_lanes 1; playwright_lanes 1 (serialized); heavy_build_lanes 1; reason: "RAM floor; serialize everything; correctness over speed."

## 11. Cloud-writer-heavy mode

Local machine only orchestrates and verifies; writers are remote. Local lane count stays low; cloud_writer_slots governed by merge-conflict risk and the one-writer-per-file-set law. Terminal-0 remains merge sheriff regardless of where writers run.

## 12. Commercialization requirement

**Commercial FounderGate must not assume a fixed machine. It must adapt to hardware and available writer resources. More compute allows more lanes only when dependency-safe, file-lock-safe, and proof-safe.** A buyer's first machine will not be the founder's machine; adaptive scheduling is a product requirement, not an optimization.

## 13. What stage should implement this

Preflight-as-evidence: V8-A1 (Terminal-0 behavior only, per the Assembly Manual). Profiler as a real module: earliest V8-B alongside the Run Launcher. Scheduler productized with UI: V8-C/V8-D. Nothing here reorders Roadmap V8.11 stages.

## 14. Non-goals for V8-A1

No profiler module, no scheduler module, no lane UI, no Docker, no auto-scaling, no benchmarking suite. V8-A1's only obligation is the preflight JSON evidence record per bundle.

## 15. Future acceptance tests

Profiler emits valid JSON on all three OS families; scheduler never exceeds profile limits; scheduler never schedules two writers on one file set; weak-machine profile forces safe_mode; removing RAM lowers lane count on next run; plain-English reason string always present; founder never asked a hardware question.
