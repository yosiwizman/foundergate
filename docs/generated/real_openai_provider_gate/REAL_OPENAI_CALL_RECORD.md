# Real OpenAI Call Record (one authorized call)

- run_id: real_openai_provider_gate_20260803T2205ET · timestamp: 2026-08-04T02:34:17.583Z · logical_index: 1
- provider: **openai** · model: **gpt-5-nano** · endpoint_family: chat.completions · http_status: 200
- **call_count: 1** (exactly one) · no_retry: True · no_second_call: True
- run_contract_digest: `rc_16044f81bea737a26daa7243` · evidence_digest: `ev_acf3b736985c4f9ccd4bb7af`
- input_fingerprint: `fp_51c3f9ff5a546a554bc752da` · output_fingerprint: `fp_6ef9048f484da00c0e8ff2e5`
- response_id: chatcmpl-E8zGtwEZQAj0FxEvXClRSZWdjXVwo · system_fingerprint: None
- token_usage: prompt 49 + completion 880 (reasoning 832) = 929
- **budget_cap_usd: 0.25 · budget_used_usd: 0.00035445** (WITHIN_CAP)
- elapsed_ms: 8156
- credential_present: True · credential_source: environment · key_last4: KC8A (key NEVER stored/printed)
- no_private_data: True · no_customer_data: True · no_repo_data: True · no_deploy_bill_outreach_merge: True
- no_secret_leak: True · secret_scan clean: True

## FounderGate verification (provider output alone is NOT acceptance)
- status: **PROVIDER_RESPONSE_VERIFIED_WITH_LIMITS** · decided_by: foundergate_verifier · provider_output_is_acceptance: False
- bound_to_request: True · bound_to_run: True

## Redacted model output (synthetic)
```
{
  "status": "success",
  "summary": "This is a synthetic FounderGate provider-gate test.",
  "refusal_rule": "provider output alone is not acceptance."
}
```
