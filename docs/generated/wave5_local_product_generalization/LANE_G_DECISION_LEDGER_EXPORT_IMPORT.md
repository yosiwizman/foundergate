# Lane G — Local Decision Ledger Export / Import
- Export local notes to JSON (download).
- Import valid local notes (array of strings, each starting with an allowed local status).
- Rejects forbidden statuses: SHIP / MERGE / DEPLOY / BILL / SEND / CUSTOMER_READY (and any status
  not in CONTINUE_DEMO/HOLD/REPAIR/STOP).
- Clearable. No real-world action triggered.
Verified (E2E): export downloads JSON; valid import accepted; forbidden (SHIP) REJECTED.
