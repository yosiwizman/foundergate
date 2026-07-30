# Source Audit Identity

## Qualification Ladder audit package (this run's basis)
- File: `FounderGate_Qualification_Ladder_ReadOnly_Audit_Review_ChatGPT_20260730T0800ET.zip`
- SHA-256: `ff742989f1668f2244d2a98578efbbbf1fc6c72dacccd44c0b52e78fdb9564a6`
- Expected SHA-256: `ff742989f1668f2244d2a98578efbbbf1fc6c72dacccd44c0b52e78fdb9564a6`
- **Identity: MATCH ✅**
- Verdict carried in: `LADDER_AUDIT_READY_LEVEL1_PARTIAL_LEVEL2_NOT_PROVEN`
  - Level 1: chain proven, 30-min duration not proven
  - Level 2: autonomy proven, 2-hour duration NOT proven (~20 min; label mismatch)
  - Level 3: five-hour NOT proven (~62 min best)
  - Level 4: blocked

## Level-3B endurance package (defect source)
- File: `FounderGate_Level3B_Actual_FiveHour_Endurance_Review_ChatGPT_20260730T0050ET.zip`
- SHA-256: `163d55b9bc45068ecfd3bc4a12c8a0ccfc69cc7e3e8a5a513af0e3462c955594` ✅
- Extracted harness scripts: `scripts/monitor.sh`, `scripts/ledger.sh`, `scripts/endurance_driver.sh`
- **Confirmed root cause from source:** all three scripts take `RUN="$1"` = the movable Desktop run-folder path and write every log under `$RUN/evidence/…`; none check write success; the driver declares completion from wall-clock `elapsed` (`date +%s` − START) alone, not from monitor/ledger disk spans. When the Desktop folder was relocated ~62 min in, the paths vanished, the append loops spun writing nothing, and the driver still "completed" at the 5h mark over a ~4h evidence hole.
