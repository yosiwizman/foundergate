# Evidence Export Hardening Report
- Real sealed exporter (src/evidence_viewer/export-package.mjs) verified: 5/5 self-tests; produces a real ZIP with SHA256SUMS-equivalent digest, unzip_ok=true, files limited to EVIDENCE_NOTE.md + RUN_EVIDENCE.json (no credentials/secrets), decision INTERNAL_DEMO_ONLY (refuses to seal SHIP).
- Founder panel exposes the export action ONLY when evidenceZip.available===true; otherwise a disabled button with an honest reason.
- No private/customer/production data; local-only; no deploy/external call.
