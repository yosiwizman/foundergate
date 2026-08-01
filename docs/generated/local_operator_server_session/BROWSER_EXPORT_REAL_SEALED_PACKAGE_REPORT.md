# Browser Export -> Real Sealed Package Report (Subwave 3)
Export POSTs /api/export; server runs the real exporter (ditto ZIP + SHA256SUMS) and verifies with unzip -t. Dashboard shows SEALED_EXPORT_LOCAL on success; UNKNOWN if no run; EXPORT_FAILED if verification fails. Never claims a sealed export unless verified. E2E 3/3.
