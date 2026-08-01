# Start State Machine Report
idle -> RUNNING -> {COMPLETE | INSUFFICIENT | REFUSED | ERROR | LOCAL_SERVER_UNAVAILABLE/UNKNOWN}. Export enabled only after a run yields a commit. Never a SHIP/GREEN state.
