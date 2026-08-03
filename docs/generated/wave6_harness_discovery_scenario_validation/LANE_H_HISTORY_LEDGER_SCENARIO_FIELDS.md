# Lane H — History / Ledger Scenario Fields
Run history records scenario entries (e.g. "scenario: calendar-app-pass") with status + decision
(never SHIP). History & ledger export/import continue to reject customer/private/production-looking
content, forbidden statuses (SHIP/MERGE/DEPLOY/BILL/SEND/CUSTOMER_READY), and malformed schema.
Verified (E2E): history records scenario field; no SHIP.
