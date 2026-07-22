# FounderGate Five-Plane Architecture v1

**Invariant:** no component may write all five planes. Enforced by `src/v8b/lrcq/assurance/assurance-core.mjs` `authorityViolations()` (tested, 0 violations).

| Plane | Owner(s) | Contract |
|---|---|---|
| Control | launcher, controller | schedules only; no execution |
| Execution | provider_adapter, builder_worker | no self-approval; no gate signing; no merge/push |
| Evidence | evidence_writer | append-only; no mutation/deletion |
| Identity & Capability | lease_manager | issues/revokes leases; does not execute |
| Reconciliation | reconciler | records/decides reconciliation; no policy rewrite |

Checker workers write NO plane (read-only). See AUTHORITY_MATRIX.
