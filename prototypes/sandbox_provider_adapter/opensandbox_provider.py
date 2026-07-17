"""OpenSandbox provider adapter (Phase 3 prototype — DESIGN ONLY).

Pure request-serialization / response-parsing for the exact Phase-2-proven
REST + execd seams. NO network calls, NO Docker calls, NO OpenSandbox SDK, NO MCP.
Endpoints are configurable and DEFAULT DISABLED; a disabled transport raises
ProviderUnavailable, so nothing reaches a network during tests. In LOCAL_DEV mode
non-loopback endpoints and any '0.0.0.0' client target are rejected.

All OpenSandbox-specific JSON shapes are translated into provider-neutral types
and neutral error classes; none leak outward.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Optional

from contract import (
    Confidence, CreateSessionRequest, CreateSessionResult, EgressPolicy,
    EvidenceRef, ExecResult, InspectResult, Mount, ProviderMeta,
    ProviderProtocolError, ProviderUnavailable, RunMode, SandboxProvider,
    TerminationProof, TerminateResult, Timestamps, ValidationError,
    DownloadResult, EgressResult, EvidenceBundle, HealthResult,
    is_loopback_endpoint, validate_create_request,
)

_TS = Timestamps("2026-01-01T00:00:00Z", "2026-01-01T00:00:01Z",
                 "2026-01-01T00:00:00Z", "2026-01-01T00:00:01Z")


def _sha(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


@dataclass
class OpenSandboxConfig:
    lifecycle_endpoint: Optional[str] = None
    execd_endpoint: Optional[str] = None
    mode: RunMode = RunMode.LOCAL_DEV
    enabled: bool = False                 # endpoints default disabled


class _DisabledTransport:
    """Default transport: refuses every call so no network is touched."""
    def request(self, *a, **k):
        raise ProviderUnavailable("transport disabled (endpoints default off)")


class OpenSandboxProvider(SandboxProvider):
    def __init__(self, config: Optional[OpenSandboxConfig] = None, transport=None):
        self.config = config or OpenSandboxConfig()
        self.mode = self.config.mode
        self._transport = transport or _DisabledTransport()
        for ep in (self.config.lifecycle_endpoint, self.config.execd_endpoint):
            if ep is not None:
                self._check_target(ep)

    # ---- endpoint guards -------------------------------------------------- #
    def _check_target(self, endpoint: str) -> None:
        if "0.0.0.0" in endpoint:
            raise ValidationError("'0.0.0.0' is not a valid client target")
        if self.mode is RunMode.LOCAL_DEV and not is_loopback_endpoint(endpoint):
            raise ValidationError(f"local-dev mode requires a loopback endpoint: {endpoint}")

    def _ensure_enabled(self) -> None:
        if not self.config.enabled:
            raise ProviderUnavailable("provider endpoints are disabled by default")

    # ---- pure serializers (no I/O) ---------------------------------------- #
    def build_create_body(self, req: CreateSessionRequest) -> dict:
        """Translate a neutral create request into the REST body. Fail-closed."""
        validate_create_request(req, self.mode)          # image/timeout/mounts/egress
        body = {
            "image": {"uri": req.workload_image_ref},
            "entrypoint": list(req.entrypoint),
            "timeout": int(req.timeout_s),
            "resourceLimits": {"cpu": req.resource_limits.cpu,
                               "memory": req.resource_limits.memory},
        }
        if req.egress_policy is not None:
            body["networkPolicy"] = {
                "defaultAction": req.egress_policy.default_action,
                "egress": [{"action": r.action, "target": r.target}
                           for r in req.egress_policy.rules],
            }
        return body

    def build_upload_parts(self, dest_path: str, content: bytes) -> list:
        """Ordered multipart parts. Phase-2 F6: metadata part MUST carry a
        filename so execd routes it to form.File['metadata']."""
        meta = json.dumps({"path": dest_path}).encode()
        return [
            ("metadata", ("metadata.json", meta, "application/json")),
            ("file", (dest_path.rsplit("/", 1)[-1], content, "application/octet-stream")),
        ]

    # ---- pure parsers (translate provider JSON -> neutral) ---------------- #
    def parse_create_response(self, obj: dict) -> CreateSessionResult:
        if not isinstance(obj, dict) or "id" not in obj or "status" not in obj:
            raise ProviderProtocolError("create response missing id/status")
        status = obj["status"]
        state = status.get("state") if isinstance(status, dict) else None
        if state is None:
            raise ProviderProtocolError("create response missing status.state")
        meta = ProviderMeta("opensandbox", self._server_version(obj),
                            self._image_ref(obj), "standard-container",
                            "linux-container", "v1")
        return CreateSessionResult(str(obj["id"]), meta, str(state), _TS,
                                   Confidence.VERIFIED)

    def parse_command_stream(self, ndjson_text: str) -> ExecResult:
        """Parse execd NDJSON events into a neutral ExecResult."""
        if not ndjson_text.strip():
            raise ProviderProtocolError("empty command stream")
        stdout, stderr, saw_init, saw_complete = [], [], False, False
        first_ts = last_ts = None
        for line in ndjson_text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                raise ProviderProtocolError(f"malformed NDJSON event: {line[:40]!r}")
            if not isinstance(e, dict) or "type" not in e:
                raise ProviderProtocolError("event missing 'type'")
            t = e["type"]
            ts = e.get("timestamp")
            first_ts = first_ts if first_ts is not None else ts
            last_ts = ts if ts is not None else last_ts
            if t == "init":
                saw_init = True
            elif t == "stdout":
                stdout.append(e.get("text", ""))
            elif t == "stderr":
                stderr.append(e.get("text", ""))
            elif t in ("execution_complete", "exit"):
                saw_complete = True
        if not saw_init or not saw_complete:
            raise ProviderProtocolError("stream missing init/execution_complete")
        # exit code: explicit field, else the '__RC=N' convention, else None (fail-closed)
        exit_code = None
        joined = "\n".join(stdout)
        for tok in joined.split():
            if tok.startswith("__RC="):
                try:
                    exit_code = int(tok[5:])
                except ValueError:
                    exit_code = None
        out_ref = EvidenceRef("stdout", _sha(joined.encode()), _TS.responded_at, len(joined))
        err_ref = EvidenceRef("stderr", _sha("\n".join(stderr).encode()), _TS.responded_at,
                              len("\n".join(stderr)))
        return ExecResult(exit_code, out_ref, err_ref, first_ts or _TS.started_at,
                          last_ts or _TS.ended_at, _TS,
                          Confidence.VERIFIED if exit_code is not None else Confidence.PARTIAL)

    def parse_inspect(self, rest_obj: dict, docker_meta: Optional[dict] = None) -> InspectResult:
        dm = docker_meta or {}
        mounts = tuple(Mount("provider_volume" if m.get("Type") == "volume" else "host_path",
                             m.get("Destination", "-"), m.get("RW", True) is False)
                       for m in dm.get("Mounts", []))
        return InspectResult(
            ProviderMeta("opensandbox", self._server_version(rest_obj),
                         self._image_ref(rest_obj), "standard-container", "linux-container", "v1"),
            mounts=mounts,
            capabilities=tuple(dm.get("CapAdd") or ()),
            privileged=bool(dm.get("Privileged", False)),
            network_mode=str(dm.get("NetworkMode", "UNKNOWN")),
            security_options=tuple(dm.get("SecurityOpt") or ()),
            user=str(dm.get("User") or "root"),
            published_endpoints=tuple((p, b) for p, b in dm.get("Published", [])),
            timestamps=_TS, confidence=Confidence.VERIFIED)

    def parse_termination(self, get_status_code: int,
                          container_absent: Optional[bool] = None,
                          sidecar_absent: Optional[bool] = None,
                          volume_absent: Optional[bool] = None) -> TerminationProof:
        session_absent = get_status_code == 404
        conf = Confidence.VERIFIED if session_absent else Confidence.UNKNOWN
        ev = EvidenceRef("teardown", _sha(str(get_status_code).encode()), _TS.responded_at, 3)
        return TerminationProof(session_absent, container_absent, sidecar_absent,
                                volume_absent, ev, conf)

    def translate_error(self, provider_error: dict) -> Exception:
        code = (provider_error or {}).get("code", "")
        msg = (provider_error or {}).get("message", "provider error")
        mapping = {
            "INVALID_FILE_METADATA": ValidationError,
            "INVALID_FILE_CONTENT": ValidationError,
            "UNAUTHORIZED": ProviderUnavailable,
        }
        return mapping.get(code, ProviderProtocolError)(msg)

    # ---- helpers ---------------------------------------------------------- #
    @staticmethod
    def _server_version(obj: dict) -> str:
        return str(obj.get("_provider_version", "0.2.1"))

    @staticmethod
    def _image_ref(obj: dict) -> str:
        img = obj.get("image")
        if isinstance(img, dict) and img.get("uri"):
            return str(img["uri"])
        return "UNKNOWN"

    # ---- SandboxProvider methods (all fail-closed via disabled transport) - #
    def create_session(self, req: CreateSessionRequest) -> CreateSessionResult:
        body = self.build_create_body(req)               # validates first
        self._ensure_enabled()
        raise ProviderUnavailable("no live transport in Phase-3 prototype")

    def upload_artifact(self, session_id, dest_path, content, expected_sha256, timeout_s):
        self.build_upload_parts(dest_path, content)
        self._ensure_enabled()
        raise ProviderUnavailable("no live transport in Phase-3 prototype")

    def execute_command(self, session_id, command, cwd, timeout_ms):
        if timeout_ms is None:
            raise ValidationError("explicit timeout required")
        self._ensure_enabled()
        raise ProviderUnavailable("no live transport in Phase-3 prototype")

    def download_artifact(self, session_id, src_path, timeout_s, expected_sha256=None):
        self._ensure_enabled()
        raise ProviderUnavailable("no live transport in Phase-3 prototype")

    def apply_egress_policy(self, session_id, policy: EgressPolicy, timeout_s):
        if self.mode is RunMode.GOVERNED and policy.default_action != "deny":
            raise ValidationError("governed mode requires default-deny egress")
        self._ensure_enabled()
        raise ProviderUnavailable("no live transport in Phase-3 prototype")

    def inspect_session(self, session_id, timeout_s):
        self._ensure_enabled()
        raise ProviderUnavailable("no live transport in Phase-3 prototype")

    def terminate_session(self, session_id, timeout_s, idempotency_key=None):
        self._ensure_enabled()
        raise ProviderUnavailable("no live transport in Phase-3 prototype")

    def prove_termination(self, session_id, timeout_s):
        self._ensure_enabled()
        raise ProviderUnavailable("no live transport in Phase-3 prototype")

    def collect_evidence(self, run_id, session_id, timeout_s):
        self._ensure_enabled()
        raise ProviderUnavailable("no live transport in Phase-3 prototype")

    def health_check(self, endpoint, timeout_s):
        self._check_target(endpoint)
        self._ensure_enabled()
        raise ProviderUnavailable("no live transport in Phase-3 prototype")
