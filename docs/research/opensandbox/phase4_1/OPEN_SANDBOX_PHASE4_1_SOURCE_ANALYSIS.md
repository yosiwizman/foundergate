# OpenSandbox 0.2.1 Port-Binding Source Analysis (Phase 4.1)

**Goal:** determine whether OpenSandbox can run without publishing execd/HTTP workload ports on `0.0.0.0`. Analyzed the installed `opensandbox-server==0.2.1` package in an **isolated uv venv on macOS** (not the global environment) and cross-referenced the evaluated source commit `192b5bf54a5fd01c7050ba4de9aba48939776cef`. No global OpenSandbox change was made.

## Every governed port-binding code path
| Port | Where created | Current HostIp | File:line |
|---|---|---|---|
| execd 44772 (egress sidecar) | `sidecar_port_bindings = {"44772": ("0.0.0.0", host_execd_port), ...}` | `0.0.0.0` | `services/docker/networking.py:405` |
| HTTP 8080 (egress sidecar) | `"8080": ("0.0.0.0", host_http_port)` | `0.0.0.0` | `services/docker/networking.py:406` |
| non-egress workload publish | `bindings[container_port] = (DOCKER_PUBLISH_HOST, host_port)` | `DOCKER_PUBLISH_HOST="0.0.0.0"` | `services/docker/port_allocator.py:94` (const `:25`) |
| port probe host | `PORT_PROBE_HOST = DOCKER_PUBLISH_HOST` | `0.0.0.0` | `port_allocator.py:29` |
| policy 18080 | published on the sidecar alongside 8080/44772 | `0.0.0.0` | (same sidecar path) |

## Is publication needed when the server uses the native proxy?
The server-side proxy resolves its execd target in `_resolve_endpoint(...)` (`networking.py:201-214`):
- **No egress sidecar** → `_resolve_internal_endpoint(container, port)` → `{bridge_ip}:{port}` (`networking.py:327-333`). The server reaches execd via the container's **bridge IP**; the host publish is **not needed**.
- **Egress sidecar present** (governed default-deny; the workload shares the sidecar netns, so "the main container's private IP is not a stable proxy target", `networking.py:203-205`) → `_resolve_host_mapped_endpoint(self._resolve_proxy_host(), ...)` → `{proxy_host}:{execd_host_port}/proxy/{port}` (`networking.py:216-270`). Here the server reaches execd via the **host-mapped published port**, i.e. it **does** need a published host port.
- `_resolve_proxy_host()` (`networking.py:311-323`): when `server.host` is `127.0.0.1` (our config), it returns `host_cfg` = **`127.0.0.1`**. So the egress-sandbox proxy connects to **`127.0.0.1:execd_host_port`**.

## Consequences for the mitigation
- **Preferred "no publication" (patch A)** is viable for **non-egress** sandboxes (proxy uses the bridge IP) but **breaks the proxy for egress sandboxes** (which are exactly the governed default-deny case), because those resolve to a host-mapped published port. Achieving no-publish for egress sandboxes would require re-pointing the proxy at the **sidecar's** bridge IP — a deeper, higher-risk change to `_resolve_internal_endpoint`.
- **Loopback binding (patch B)** is minimal and correct: the egress-sandbox proxy already targets `127.0.0.1:execd_host_port`, so binding the published port to `127.0.0.1` instead of `0.0.0.0` **preserves the native proxy** while **eliminating the `0.0.0.0` exposure**. Non-egress publishes also become loopback-only.

## Selected mitigation (patch B — loopback-only)
Change `0.0.0.0` → `127.0.0.1` at three governed sites: `port_allocator.py:25` (`DOCKER_PUBLISH_HOST`, which also fixes `PORT_PROBE_HOST` and the non-egress path) and `networking.py:405-406` (sidecar execd/http). 3 lines, 2 files.
- **Can the port be omitted safely?** Only for non-egress sandboxes; **not** for egress sandboxes under the current proxy logic → omission rejected as non-minimal/risky.
- **Can loopback binding be configured?** Not via config (`host_ip` only affects endpoint URLs) → a source patch is required.
- **Is a minimal patch sufficient?** Yes (patch B).
- **Maintainability across upgrades?** LOW-to-MEDIUM risk: the patch is 3 localized constant/literal changes with no logic change; it must be re-checked whenever OpenSandbox alters `port_allocator.DOCKER_PUBLISH_HOST` or the `sidecar_port_bindings` literal. Upstreaming a `[docker].publish_host` config option would remove the maintenance burden.

## Guard (defense in depth)
Independent of the patch, the FounderGate adapter adds `assert_no_public_port_binding(port_map)` (`opensandbox_provider.py`) that inspects Docker port metadata for governed ports (44772/8080/18080) and **rejects the runtime** (provider-neutral `AuthorityError`) if any is bound to a non-loopback HostIp (`0.0.0.0`/`::`/empty/public), rejects malformed metadata (`ProviderProtocolError`), and never silently continues. Loopback-only or unpublished pass.
