"""FounderGate Phase-4.1 loopback patch compatibility guard (Phase 7, Lane C).

Ensures the loopback-binding compatibility patch is only applied to the exact
opensandbox-server version + source context it was authored against, fails closed on
drift, and never silently falls back to 0.0.0.0. NO live runtime; NO OpenSandbox install.
Standard library only.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

BOUND_SERVER_VERSION = "0.2.1"
PATCH_SHA256 = None  # set by record_patch_sha() at load-time from the patch file if present

# The exact upstream source lines the patch expects to replace (context anchors).
EXPECTED_CONTEXT = {
    "port_allocator.py": ['DOCKER_PUBLISH_HOST = "0.0.0.0"'],
    "networking.py": ['"44772": ("0.0.0.0", host_execd_port),',
                      '"8080": ("0.0.0.0", host_http_port),'],
}
# What the patch must produce (post-condition anchors).
EXPECTED_RESULT = {
    "port_allocator.py": ['DOCKER_PUBLISH_HOST = "127.0.0.1"'],
    "networking.py": ['"44772": ("127.0.0.1", host_execd_port)',
                      '"8080": ("127.0.0.1", host_http_port)'],
}
_FORBIDDEN = '0.0.0.0'


class PatchError(Exception): ...
class VersionMismatch(PatchError): ...
class SourceDrift(PatchError): ...
class PartialApplication(PatchError): ...
class ForbiddenBinding(PatchError): ...


@dataclass(frozen=True)
class PatchVerdict:
    server_version: str
    patch_sha256: str
    applicable: bool
    reason: str
    requires_runtime_retest: bool = True


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def verify_bound_version(server_version: str) -> None:
    if server_version != BOUND_SERVER_VERSION:
        raise VersionMismatch(
            f"patch is bound to opensandbox-server {BOUND_SERVER_VERSION}, not {server_version!r}; "
            "an upgrade REQUIRES a new runtime retest before use")


def verify_source_context(filename: str, source_text: str) -> None:
    """Fail closed if the upstream source does not contain the exact expected context."""
    key = filename.split("/")[-1]
    anchors = EXPECTED_CONTEXT.get(key)
    if anchors is None:
        raise SourceDrift(f"no expected context registered for {key}")
    for a in anchors:
        if a not in source_text:
            raise SourceDrift(f"expected upstream anchor missing in {key}: {a!r} — source drifted")


def verify_post_application(filename: str, patched_text: str) -> None:
    """After applying, require the loopback result and forbid any residual 0.0.0.0
    on a governed publish line. Reject partial application."""
    key = filename.split("/")[-1]
    wanted = EXPECTED_RESULT.get(key, [])
    for w in wanted:
        if w not in patched_text:
            raise PartialApplication(f"patched {key} missing required loopback result: {w!r}")
    # any governed publish line still on 0.0.0.0 is a hard fail (never silent fallback)
    for line in patched_text.splitlines():
        if ("host_execd_port" in line or "host_http_port" in line or "DOCKER_PUBLISH_HOST =" in line) \
                and _FORBIDDEN in line:
            raise ForbiddenBinding(f"governed publish still bound to 0.0.0.0 in {key}: {line.strip()!r}")


def evaluate(server_version: str, patch_sha256: str,
             sources: dict, patched: dict) -> PatchVerdict:
    """Full gate. `sources`/`patched` map filename -> text (pre/post). Raises on any failure.
    Returns an applicable PatchVerdict only when version, context, and post-conditions all hold."""
    verify_bound_version(server_version)
    for fn, text in sources.items():
        verify_source_context(fn, text)
    for fn, text in patched.items():
        verify_post_application(fn, text)
    return PatchVerdict(server_version=server_version, patch_sha256=patch_sha256,
                        applicable=True, reason="version+context+postconditions verified",
                        requires_runtime_retest=True)
