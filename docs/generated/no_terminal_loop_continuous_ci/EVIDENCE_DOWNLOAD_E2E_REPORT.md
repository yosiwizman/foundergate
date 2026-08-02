# Evidence Download E2E Report
In the live browser session, clicking Export on the dashboard issued POST /api/export and the UI reported SEALED_EXPORT_LOCAL with the real path runs/sealed_export.zip. The exporter creates a real ZIP and verifies unzip -t server-side before reporting complete.
