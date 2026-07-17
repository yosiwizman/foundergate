# OpenSandbox Phase 4 — Decision Packet (disposable Linux-VM adapter spike)

**Host:** Apple M4 Pro Mac Mini (`Mac16,11`, 24 GiB, arm64). **Runtime:** live OpenSandbox inside one disposable Ubuntu 24.04 ARM64 Lima/VZ VM, now destroyed. **Isolation:** runc / standard container ("Secure runtime is not configured") — no microVM/hardened/production claim. **Independent checker: CHECKER-CLEAN (34/34; 18/18 prototype tests; all 10 falsification attempts failed).** M1, AKIOR, and the Ubuntu WRX90 untouched; `main` unmodified (`e1ca1989…`, clean); PR #151/#152/#153 untouched (open drafts).

**Pins:** main `e1ca1989…` · PR#151 `e58632b…` · PR#152 `adcb169…` · PR#153 `3fe19c11…` · OpenSandbox `192b5bf5…` · Lima 2.1.4 (VZ) · `opensandbox-server==0.2.1` · images linux/arm64 `python@sha256:db3ff2e1…` `execd@sha256:1dc98c7d…` `egress@sha256:973130e0…` · Ubuntu `sha256:cafa1a96…`.

## Determinations
| Determination | Value | Basis |
|---|---|---|
| PHASE3_HARDENING_NOTES_CLOSED | **YES** | N1 (test_01 meaningful assertions) + N2 (strict `repo@sha256:<64 hex>` validation, test_18); 18/18 tests. |
| DISPOSABLE_LINUX_VM_PROVEN | **YES** | Lima/VZ plain-mode Ubuntu 24.04 arm64, no mounts/forwards/shared-folders; created and destroyed. |
| NATIVE_PROXY_SEAM_PROVEN | **YES** | adapter reached execd via `/proxy/44772/…` (200); no published-port fallback (server log). |
| NO_0_0_0_0_CONTROL_EXPOSURE_PROVEN | **NO** | OpenSandbox 0.2.1 **hardcodes** execd/http/policy publish to `0.0.0.0` (`port_allocator.py:25`, `networking.py:405-406`); not eliminable via config. Only **containment** was proven (below), not absence of the bind. |
| NO_MAC_PORT_FORWARD_PROVEN | **YES** | Lima `portForwards: []`; Mac→VM execd = HTTP 000; no macOS listener for 8090/execd. |
| LIVE_PROVIDER_ADAPTER_PROVEN | **YES** | create/upload/exec/download driven through the neutral contract; neutral types returned; no leak. |
| EXACT_IMAGE_DIGEST_ENFORCED | **YES** | governed validation requires `@sha256:<64 hex>`; workload/execd pinned by digest. |
| HOST_PATH_NON_EXPOSURE_PROVEN_FOR_CONFIGURATION | **YES** | workload-local write; sentinel absent on Mac + VM host; main clean. |
| WORKLOAD_DOCKER_SOCKET_BLOCKED | **YES** | `SOCKET_ABSENT`; no docker CLI; `CapAdd=null`; no host bind mount. |
| DEFAULT_DENY_EGRESS_PROVEN_FOR_CONFIGURATION | **YES** | `dns+nft` default-deny; allow example.com; example.org denied; nft `policy drop`. |
| DIRECT_IP_BYPASS_BLOCKED | **YES** | 1.1.1.1:443 (TCP), https://1.1.1.1, and IPv6 `2606:4700:4700::1111:443` all denied. |
| NON_ROOT_WORKLOAD_PROVEN | **YES** | execd ran `uid=1000 gid=1000` (per-command); default is root (recorded risk). |
| SANDBOX_TEARDOWN_PROVEN | **YES** | DELETE 204/GET 404; containers+network+volume gone; server down/8090 closed. |
| VM_DESTRUCTION_PROVEN | **YES** | instance+dir+disk gone; no hostagent; Mac forwards 0 (observable-state removal, not forensic erasure). |
| RENDERED_UI_FEASIBILITY_PROVEN | **NOT_RUN** | optional Playwright not run. |
| PROVIDER_REPLACEABILITY_PRESERVED | **YES** | callers see only the neutral contract; fake provider satisfies it; no gate/ledger/founder-facing coupling. |
| PRODUCTION_INTEGRATION_AUTHORIZED | **NO** | design only; founder gate required. |
| OPENSANDBOX_ADOPTION_AUTHORIZED | **NO** | one replaceable candidate behind the adapter. |
| MAIN_MERGE_AUTHORIZED | **NO** | evidence-only [HOLD]; Terminal-0 sole merge sheriff. |

## The one blocking item (why not PROCEED)
`PROCEED_TO_CUSTOMER_INTAKE_DESIGN` **requires** "no 0.0.0.0 control exposure." OpenSandbox 0.2.1 hardcodes publishing execd/http/policy ports to `0.0.0.0`; there is no configuration to bind them to loopback. In this spike the exposure was **fully contained** — the primary lifecycle API bound `127.0.0.1:8090` only, the `0.0.0.0` ports were unreachable from the Mac (NAT-only VM, no port forward), and the adapter used the native proxy, never those ports. But containment inside a disposable VM is **not** the same as proving the control ports are not `0.0.0.0`-bound. Honest, non-overclaiming determination: **NO_0_0_0_0_CONTROL_EXPOSURE_PROVEN = NO.** Everything else the gate requires is proven YES.

## Recommendation: **WATCH_AND_RETEST**
The direction is validated and strong — disposable Linux VM, native proxy, live replaceable adapter, exact-digest enforcement, host-path & Docker-socket non-exposure, strict `dns+nft` egress (incl. direct-IP and IPv6 denial), sandbox teardown, and VM destruction all proven, checker-clean. One **material endpoint weakness remains**: OpenSandbox's hardcoded `0.0.0.0` control-port publish. **Retest target:** bind execd/http/policy to loopback or a private in-host path (patch/config/firewall), re-verify no `0.0.0.0` control bind on Linux, then re-run this spike. Also carry forward: root-in-container hardening and a separate secure-runtime evaluation. **No adoption, no production integration, no merge is authorized. The founder gate remains.**

## Claim classes
VERIFIED-RUNTIME · VERIFIED-DISK · VERIFIED-VM-METADATA · VERIFIED-DOCKER-METADATA · PARTIALLY-VERIFIED · UNVERIFIED · CONTRADICTED · UNKNOWN (no "PASS").
