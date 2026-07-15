# Independent caffeinate verification — Run 2 (operator, read-only)

Recorded by the operator at launch, in addition to the driver's own `caffeine-assertion.json`.
The founder release requires: verify the `caffeinate -dimsu` assertion sits in the driver's own
process tree and record it. This is that independent confirmation.

## Process tree at launch (from `ps -Ao pid,ppid,command`)

    58648  (ppid 1/launchd)  node src/tools/soak-driver.mjs --sha 490440d… --claim 8 --ttl 36000 …
    58651  (ppid 58648)      caffeinate -dimsu node src/tools/soak-driver.mjs --sha 490440d… …
    58700  (ppid 58648)      node src/tools/soak-run.mjs --claim 8 --interval 900 --probe "npm test" …

caffeinate (58651) and the driver (58648) are in the SAME process tree (here caffeinate is a
direct child/descendant of the driver — a quirk of `nohup … &` launch wrapping; the driver's
tree-membership check covers ancestor AND descendant, so it is correctly seen as in-tree).

## OS-level proof the assertion is real (from `pmset -g assertions`)

    pid 58651(caffeinate): PreventUserIdleSystemSleep
        Details: caffeinate asserting on behalf of 'node' (pid 58648)   <-- the driver
    System-wide: PreventUserIdleSystemSleep = 1  AND  PreventUserIdleDisplaySleep = 1

The `-dimsu` assertion is held ON BEHALF OF the driver process (pid 58648) with NO `-t` timeout
(distinct from the harness's unrelated transient `caffeinate -t 300`). While it holds, the host
cannot idle-sleep — the exact failure that produced Run 1's honest NOT-PASSED.

Full snapshots: `pmset-assertions-at-launch.txt`, `pmset-settings-at-launch.txt`.
