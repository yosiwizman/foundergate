# Evidence Export HOLD Case Report
When evidence is stale/incomplete (e.g. freshness=stale or missing), the panel sets ready=false and evidenceZip.available=false with reason "no sealed export available yet", and the rendered export button is DISABLED (verified in-browser). The system does not offer a download it cannot honestly back, and never labels a stale state as ready.
