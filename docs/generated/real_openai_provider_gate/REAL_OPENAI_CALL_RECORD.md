# Real OpenAI Call Record (overnight queue — one authorized call)

- run_id: overnight_real_openai_provider_queue_20260803T2240ET · timestamp: 2026-08-04T02:47:32.108Z · logical_index: 1
- provider: **openai** · model: **gpt-5-nano** · endpoint_family: chat.completions · http_status: 200
- **call_count: 1** (exactly one) · no_retry: True · no_second_call: True
- run_contract_digest: `rc_f3f68af67b96f9e1f8e69637` · evidence_digest: `ev_e3b1c5f4cb3e16de6405ff32`
- input_fingerprint: `fp_51c3f9ff5a546a554bc752da` · output_fingerprint: `fp_8dda020c6d683636930680b6`
- response_id: chatcmpl-E8zThGWxeiO9QQz6EEsq5rfEgb5MM · http_status: 200
- token_usage: prompt 49 + completion 816 (reasoning 768) = 865
- **budget_cap_usd: 0.25 · budget_used_usd: 0.00032885** (WITHIN_CAP)
- elapsed_ms: 8945
- credential_present: True · credential_source: environment · key_last4: KC8A (key NEVER stored/printed)
- no_private_data: True · no_customer_data: True · no_repo_data: True · no_deploy_bill_outreach_merge: True
- no_secret_leak: True · secret_scan clean: True

## FounderGate verification (provider output alone is NOT acceptance)
- status: **PROVIDER_RESPONSE_VERIFIED_WITH_LIMITS** · decided_by: foundergate_verifier · provider_output_is_acceptance: False

## Redacted model output (synthetic)
```
{
  "status": "ok",
  "summary": "This is a synthetic FounderGate provider-gate test.",
  "refusal_rule": "provider output alone is not acceptance."
}
```
