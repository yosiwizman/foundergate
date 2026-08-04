# Adversarial Physical Test Report

Harness: src/physical_containment/adversarial-matrix.mjs. Every hostile case MUST fail closed (HOLD/UNKNOWN/NOT_PASSED/ALTERNATE_PATH_DETECTED/HARDWARE_STATE_MISMATCH/MONITORING_LOST/AUTHORIZATION_*). No forbidden claim, no false green.

Result: **ALL 32 CASES FAIL-CLOSED (0 false green)**. By group: {"hardware":10,"authorization":9,"monitoring":5,"stop":2,"claim":6}

| Group | Case | Observed | Fail-closed |
| --- | --- | --- | :---: |
| hardware | relay commanded open but measured closed | HARDWARE_STATE_MISMATCH | ✅ |
| hardware | relay commanded closed without authorization | AUTHORIZATION_INVALID | ✅ |
| hardware | alternate Ethernet adapter attached | ALTERNATE_PATH_DETECTED | ✅ |
| hardware | Wi-Fi interface appears | ALTERNATE_PATH_DETECTED | ✅ |
| hardware | Bluetooth interface active | ALTERNATE_PATH_DETECTED | ✅ |
| hardware | USB network adapter inserted | ALTERNATE_PATH_DETECTED | ✅ |
| hardware | host bridge available | ALTERNATE_PATH_DETECTED | ✅ |
| hardware | data-diode channel becomes bidirectional | MONITORING_LOST | ✅ |
| hardware | execution node gains write to evidence store | MONITORING_LOST | ✅ |
| hardware | power relay fails to open | HARDWARE_STATE_MISMATCH | ✅ |
| authorization | replayed signature (nonce reuse) | AUTHORIZATION_INVALID | ✅ |
| authorization | expired signature | AUTHORIZATION_EXPIRED | ✅ |
| authorization | signature for wrong machine | AUTHORIZATION_INVALID | ✅ |
| authorization | signature for wrong image | AUTHORIZATION_INVALID | ✅ |
| authorization | signature for wrong destination | AUTHORIZATION_INVALID | ✅ |
| authorization | broadened capability request | AUTHORIZATION_INVALID | ✅ |
| authorization | duplicate nonce | AUTHORIZATION_INVALID | ✅ |
| authorization | execution env self-authorizes | AUTHORIZATION_INVALID | ✅ |
| authorization | hardware supervisor key mismatch (unhealthy) | SUPERVISOR_UNAVAILABLE | ✅ |
| monitoring | sensor killed | UNKNOWN | ✅ |
| monitoring | evidence stream interrupted | EVIDENCE_INCOMPLETE | ✅ |
| monitoring | two sensors disagree (relay mismatch) | HARDWARE_STATE_MISMATCH | ✅ |
| monitoring | recorder bidirectional drift | MONITORING_LOST | ✅ |
| monitoring | supervisor restarts (watchdog inactive) | SUPERVISOR_UNAVAILABLE | ✅ |
| stop | power cut requested but current remains | HARDWARE_STATE_MISMATCH | ✅ |
| stop | power state unknown (no measurement) | UNKNOWN | ✅ |
| claim | missing relay evidence never passes | UNKNOWN | ✅ |
| claim | unknown radio state → no isolation claim | UNKNOWN | ✅ |
| claim | one path test does not imply all blocked | HOLD_LEVEL_NOT_SUPPORTED | ✅ |
| claim | measured boot ⇒ vulnerability-free? (must be false) | NOT_PASSED | ✅ |
| claim | hardware-assisted labeled physically severed | HOLD_LEVEL_NOT_SUPPORTED | ✅ |
| claim | Level1 claims hardware-assisted | HOLD_LEVEL_NOT_SUPPORTED | ✅ |
