# SCL-1 Lane Contract — Provider-Neutral Sandbox Control Layer

- **Lane ID:** SCL-1 · **Base SHA:** 7e3e96316bed4653abb2b24529ab8854489bb946 · **Risk:** narrow-sensitive (one sensitive-core writer)
- **Allowed paths:** src/scl/**, .foundergate/schemas/scl_*, docs/lanes/SCL1_*, docs/contracts/SCL1_*
- **Forbidden paths:** frozen product (src/safety_check, src/founder_url_drop, tools/macos, .foundergate/policies), ARLC tools/terminal0, DCL src/directives
- **Dependencies:** ARLC-1 (ACTIVE), DCL-1 (ACTIVE)
- **Writer:** Terminal-0 · **Checker:** independent (pending) · **Merge:** cumulative wave-1 line under ARLC authority

## Required components (provider-neutral)
provider registry · capability contract · source-provider contract · project-adapter contract · Check Plan schema · command allow/deny policy · no-host-fallback invariant · immutable source binding · exact evaluated-SHA binding · run-ID namespace · resource limits · timeout · teardown · interruption recovery · evidence normalization · Evidence Pack interface · provider health · provider replacement seam · **fake provider** · deterministic synthetic fixtures · OpenSandbox **Provider 001 adapter (CANDIDATE, NOT ADOPTED, NOT DEFAULT)**

## Invariants
No default-provider selection · no customer/private code · no credential exposure · no production action · **no host fallback** · no isolation claim beyond proof · no provider-adoption claim · no Android-execution claim.

## Status: **LANE CONTRACTED — BUILD PENDING (bounded remaining work)**
Live fixed-public-fixture run requires explicit disk authority — see decision packet. Synthetic/fake-provider qualification only until then.
