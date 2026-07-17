# OpenSandbox Loopback Patch — Maintenance Policy (Phase 7, Lane C)

**Status:** DESIGN · no live runtime. Governs the FounderGate-local Phase-4.1 loopback-binding compatibility patch for `opensandbox-server`.

## What the patch is
A minimal 3-line/2-file change binding execd/HTTP publish to `127.0.0.1` instead of `0.0.0.0` (`port_allocator.py:DOCKER_PUBLISH_HOST` and `networking.py` sidecar bindings). It is **bound to `opensandbox-server==0.2.1`**.

## Guard (`patch_compatibility.py`, proven by `test_patch_compatibility.py`)
The guard fails closed and **never silently falls back to `0.0.0.0`**:
1. **Version bound** — refuses any server version other than `0.2.1` (`VersionMismatch`).
2. **Source-context verification** — requires the exact upstream anchors (`DOCKER_PUBLISH_HOST = "0.0.0.0"`, the two sidecar `("0.0.0.0", …)` lines) before applying; missing anchors ⇒ `SourceDrift`.
3. **Post-condition verification** — requires the loopback result on every governed line; a missing line ⇒ `PartialApplication`.
4. **Forbidden-binding check** — any governed publish line still on `0.0.0.0` ⇒ `ForbiddenBinding` (hard fail).
5. **Patch SHA-256 recorded** in the verdict.
6. **`requires_runtime_retest = True`** — an applicable verdict still demands a **new runtime retest** (a fresh disposable-VM spike like Phase 6) before the patched server may be used again.

## Upgrade procedure (mandatory)
On any OpenSandbox version change: (a) the guard refuses to apply the 0.2.1 patch; (b) re-audit the upstream source for the publish site; (c) prefer upstreaming a `[docker].publish_host` config option to retire the patch; (d) if a patch is still needed, author a new version-bound patch + guard anchors; (e) **re-run a full disposable-VM runtime spike** and independent check before the founder UI may show a live result. No UI may display a live result produced by an unverified/unpatched server binding.

## Never
- Never apply the patch to a drifted source. Never accept partial application. Never leave a governed port on `0.0.0.0`. Never treat an applicable verdict as adoption or as removing the retest requirement.
