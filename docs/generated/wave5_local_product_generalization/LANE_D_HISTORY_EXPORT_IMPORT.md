# Lane D — History Export / Import
- Export run history to a local JSON file (download, local-only, no customer data).
- Import from a locally generated history file: schema-checked (array of run objects with src/status).
- Rejects malformed files, invalid schema, and any customer/private/production-looking content.
- Imported history is clearable. Labeled local/browser-only.
Verified (E2E): export downloads JSON; valid import accepted; unsafe import REJECTED; malformed REJECTED.
