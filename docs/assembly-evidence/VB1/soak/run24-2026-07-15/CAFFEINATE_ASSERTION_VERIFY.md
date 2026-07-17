# VB1 24h qualifying soak — caffeinate `-dimsu` assertion (independent post-launch verification)

**Verified:** 2026-07-16 02:25 UTC (~2 min after launch) · **Method:** `pmset -g assertions` (read-only, independent of the driver's own self-report).

## Process tree of the run
```
57085  ppid 1      node src/tools/soak-driver.mjs --sha 0cd51f8… --claim 24 --ttl 108000 …   (DRIVER = lease owner)
57090  ppid 57085  caffeinate -dimsu node src/tools/soak-driver.mjs …                         (power-assertion holder)
57139  ppid 57085  node src/tools/soak-run.mjs --claim 24 --interval 900 --probe "npm test"    (soak child)
```

## pmset assertion holder (pid 57090) — verbatim
```
pid 57090(caffeinate): PreventUserIdleSystemSleep   Details: caffeinate asserting on behalf of 'node' (pid 57085)
pid 57090(caffeinate): PreventUserIdleDisplaySleep  Details: caffeinate asserting on behalf of 'node' (pid 57085)
pid 57090(caffeinate): PreventSystemSleep           Details: caffeinate asserting on behalf of 'node' (pid 57085)
```
System-wide: `PreventSystemSleep 1` (was **0** at preflight — this run is what now holds it).

## Verdict on the requirement
- **Held on behalf of the driver's own process tree?** YES — every assertion explicitly reads *"asserting on behalf of 'node' (pid 57085)"*, which is the soak-driver process. The driver independently recorded the same fact as `caffeinate assertion: HELD (descendant)`.
- **The critical `-s` (PreventSystemSleep) present?** YES.
- **No timeout?** YES — none of pid 57090's three assertions show a `Timeout will fire` / `TimeoutActionRelease` line. (Contrast: pid 59637 `caffeinate -t 300` = the Claude harness idle keep-alive, which DOES show `Timeout will fire in 300 secs` — that is NOT this run's holder and is irrelevant to the soak.)

**Residual sleep capability from the preflight is now fully covered for the span:** the `-dimsu` pin holds display+idle+system sleep off with no timeout, on behalf of pid 57085, for the duration of the run.
