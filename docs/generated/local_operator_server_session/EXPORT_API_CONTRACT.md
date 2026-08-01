# Export API Contract
POST /api/export -> {status:'complete', zip:'runs/sealed_export.zip', unzip_ok:true} | {status:'UNKNOWN', reason} | {status:'EXPORT_FAILED', reason}. Refuses to seal a SHIP decision.
