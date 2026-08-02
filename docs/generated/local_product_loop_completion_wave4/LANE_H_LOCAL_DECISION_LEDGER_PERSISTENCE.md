# Lane H — Local Decision Ledger Persistence
Allowed local statuses only: CONTINUE_DEMO / HOLD / REPAIR / STOP (hard-guarded by LEDGER_OK).
Never SHIP/MERGE/DEPLOY/BILL/SEND/CUSTOMER_READY (not offered; real-world buttons permanently
disabled). Notes persist in localStorage (local/synthetic, clearable) with a "Clear local ledger"
button. Verified (E2E): records safe statuses; persists across reload; Clear empties it.
