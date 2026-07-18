# PAES-1 Recovery

On restart/compaction/crash: supervisor reloads `.foundergate/supervisor/{state,queue,lease,recovery}.json`,
verifies DCL/ARLC/ARE digests, checks deadline + PANIC, and resumes from
`next_safe_action`. Watchdog recovers stale workers (verified stale only),
preserves logs, releases lease atomically, never duplicates a committed action.
