# Low-Click Flow Report (Lane C)
Hands-light flow confirmed:
- One large "Run safe demo check" button starts the REAL safe demo (calls /api/start on the loopback server; no fake). A default objective is pre-filled so no typing is required.
- "Export evidence package" becomes enabled ONLY after a real run completes (mirrors #export-btn.disabled). It calls the REAL /api/export.
- If the local server is off, the page shows UNKNOWN / server-unavailable in Founder Mode — it never fakes green.
No faked export, completion, tests, or evidence. Verified live: Run -> 30/30 COMPLETE -> Export -> SEALED_EXPORT_LOCAL.
