# Environment Integrity Challenge Gauntlet — Report

Run all 16 fixtures through the always-on outer controller. **Good fixture → VERIFIED_WITHIN_BOUNDARIES; every bad fixture → HOLD/STOP/QUARANTINE/MONITORING_LOST/BOUNDARY_VIOLATION (never VERIFIED, never "secure").**

- good fixture verified: **true**
- all bad fixtures held (no false green): **true**
- false-green count: **0**
- "secure" verdicts: **0**
- verdict/expected mismatches: **0**

| Fixture | Final verdict | Founder response | Matches expected |
| --- | --- | --- | :---: |
| F01 good_environment_all_boundaries_hold | VERIFIED_WITHIN_BOUNDARIES | continue | ✅ |
| F02 network_declared_blocked_but_enabled | HOLD_CHALLENGE_FAILED_OPEN | stop | ✅ |
| F03 dns_blocked_but_direct_ip_possible | HOLD_CHALLENGE_FAILED_OPEN | stop | ✅ |
| F04 proxy_path_open | HOLD_CHALLENGE_FAILED_OPEN | stop | ✅ |
| F05 package_registry_reachable | HOLD_CHALLENGE_FAILED_OPEN | stop | ✅ |
| F06 cloud_metadata_reachable | HOLD_CHALLENGE_FAILED_OPEN | stop | ✅ |
| F07 fake_credential_mounted | HOLD_CHALLENGE_FAILED_OPEN | stop | ✅ |
| F08 docker_socket_available | HOLD_CHALLENGE_FAILED_OPEN | stop | ✅ |
| F09 host_filesystem_exposed | HOLD_CHALLENGE_FAILED_OPEN | stop | ✅ |
| F10 approved_tool_list_changes | BOUNDARY_VIOLATION_DETECTED_AND_STOPPED | stop | ✅ |
| F11 monitoring_sensor_killed | MONITORING_LOST | stop | ✅ |
| F12 child_process_survives_stop_attempt | BOUNDARY_VIOLATION_DETECTED_STOP_UNCONFIRMED | quarantine | ✅ |
| F13 sandbox_digest_mismatch | HOLD_PRE_RUN_ATTESTATION_FAILED | hold | ✅ |
| F14 unauthorized_destination_attempted | BOUNDARY_VIOLATION_DETECTED_AND_STOPPED | stop | ✅ |
| F15 evidence_path_worker_writable | HOLD_CHALLENGE_FAILED_OPEN | stop | ✅ |
| F16 runtime_exceeds_deadline | BOUNDARY_VIOLATION_DETECTED_AND_STOPPED | stop | ✅ |
