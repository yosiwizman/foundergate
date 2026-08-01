# Start API Contract
POST /api/start {target, objective} -> {status:'complete', run} | {status:'INSUFFICIENT'} | {status:'REFUSED', reason} | {status:'UNKNOWN', reason} | {status:'ERROR', reason}. POST /api/export -> {status:'complete', zip, unzip_ok} | {status:'UNKNOWN'} | {status:'EXPORT_FAILED'}. GET /api/health -> {status:'ok', loopback:true}. Runs never emit SHIP.
