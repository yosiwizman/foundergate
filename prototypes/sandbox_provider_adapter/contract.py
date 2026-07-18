"""FounderGate provider-neutral sandbox contract (Phase 3 prototype — DESIGN ONLY).

Isolated prototype. NOT imported by FounderGate production code. No network, no
Docker, no OpenSandbox, no SDK, no MCP. Standard library only.

This module defines the FounderGate-owned interface every sandbox provider must
implement. No provider-specific type, field, or error may leak across it. Providers
return *observations*; they never return a verdict. FounderGate evaluates evidence;
the founder accepts. See docs/architecture/SANDBOX_PROVIDER_CONTRACT.md.
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #


class Confidence(str, Enum):
    VERIFIED = "VERIFIED"
    PARTIAL = "PARTIAL"
    UNKNOWN = "UNKNOWN"


class RunMode(str, Enum):
    LOCAL_DEV = "LOCAL_DEV"   # loopback only; strict client-target checks
    GOVERNED = "GOVERNED"     # deny-by-default egress + exact image required


class RunOutcome(str, Enum):
    """FounderGate-side evidence-completeness outcome. NOT a founder acceptance."""
    EVIDENCE_SUFFICIENT = "EVIDENCE_SUFFICIENT"
    NOT_PASSED = "NOT_PASSED"
    UNKNOWN = "UNKNOWN"


# Mount source kinds. Only NONE / PROVIDER_VOLUME are permitted for a workload.
FORBIDDEN_MOUNT_KINDS = frozenset({"host_path", "home", "docker_socket"})
ALLOWED_MOUNT_KINDS = frozenset({"none", "provider_volume"})

_LOOPBACK_HOSTS = frozenset({"127.0.0.1", "localhost", "::1", "[::1]"})
_SHA256_RE = re.compile(r"^sha256:[0-9a-f]{64}$")
# Governed image identity: repository[:tag]@sha256:<64 lowercase hex>.
_GOVERNED_IMAGE_RE = re.compile(r"^[a-z0-9][a-z0-9._/-]*(:[a-zA-Z0-9._-]+)?@sha256:[0-9a-f]{64}$")


def validate_governed_image_ref(ref: Optional[str]) -> None:
    """N2: a governed/qualification run requires an EXACT digest-pinned image.

    Rejects: empty/missing name, tag-only, ':latest', empty/short/malformed digest,
    uppercase or non-hex digest.
    """
    if not ref:
        raise ValidationError("governed image: missing image identity")
    if ":latest" in ref:
        raise ValidationError("governed image: ':latest' is not permitted")
    if "@sha256:" not in ref:
        raise ValidationError("governed image: an exact '@sha256:<digest>' is required (tag-only rejected)")
    digest = ref.split("@sha256:", 1)[1]
    if len(digest) != 64:
        raise ValidationError(f"governed image: digest must be 64 hex chars, got {len(digest)}")
    if digest != digest.lower() or any(c not in "0123456789abcdef" for c in digest):
        raise ValidationError("governed image: digest must be lowercase hexadecimal")
    if not _GOVERNED_IMAGE_RE.match(ref):
        raise ValidationError(f"governed image: malformed digest-pinned reference: {ref!r}")


# --------------------------------------------------------------------------- #
# Provider-neutral error classes (providers MUST translate into these)
# --------------------------------------------------------------------------- #


class SandboxError(Exception):
    """Base for all provider-neutral errors."""


class ValidationError(SandboxError):
    """Request violates an invariant; fail closed, nothing is created."""


class AuthorityError(SandboxError):
    """A forbidden authority/mount/credential was requested."""


class ProviderUnavailable(SandboxError):
    """Transport/endpoint unreachable or disabled."""


class ProviderProtocolError(SandboxError):
    """Malformed / unschema'd provider response."""


class SandboxTimeoutError(SandboxError):
    """Deadline exceeded."""


class Cancelled(SandboxError):
    """Caller cancelled; session left in a queryable state."""


class TerminationUnproven(SandboxError):
    """Teardown could not be confirmed -> UNKNOWN."""


class EvidenceIncomplete(SandboxError):
    """Required evidence missing -> not-passed."""


# --------------------------------------------------------------------------- #
# Common value types
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class Timestamps:
    requested_at: str
    responded_at: str
    started_at: Optional[str] = None
    ended_at: Optional[str] = None


@dataclass(frozen=True)
class ProviderMeta:
    provider_name: str
    provider_version: str                 # mandatory exact version
    workload_image_ref: str               # mandatory exact ref (digest preferred)
    runtime_kind: str = "UNKNOWN"         # standard-container | secure-runtime | UNKNOWN
    host_kind: str = "UNKNOWN"
    api_contract_version: str = "UNKNOWN"


@dataclass(frozen=True)
class Mount:
    source_kind: str                      # must be in ALLOWED_MOUNT_KINDS
    dest_path: str
    read_only: bool = True


@dataclass(frozen=True)
class EgressRule:
    action: str                           # "allow" | "deny"
    target: str                           # FQDN or wildcard


@dataclass(frozen=True)
class EgressPolicy:
    default_action: str                   # "deny" | "allow"
    rules: tuple = ()                      # tuple[EgressRule, ...]
    mode_hint: str = "dns+nft"


@dataclass(frozen=True)
class ResourceLimits:
    cpu: str = "1000m"
    memory: str = "512Mi"


@dataclass(frozen=True)
class EvidenceRef:
    kind: str                             # stdout|stderr|exit|inspect|egress|upload|download|teardown
    digest: Optional[str]                 # sha256:... or None if unhashable
    captured_at: str
    bytes: int = 0


def is_sha256(value: Optional[str]) -> bool:
    return bool(value) and bool(_SHA256_RE.match(value))


def is_loopback_endpoint(endpoint: str) -> bool:
    """True only if the endpoint host is loopback. '0.0.0.0' is never loopback."""
    host = endpoint
    if "://" in host:
        host = host.split("://", 1)[1]
    host = host.rsplit("/", 1)[0] if "/" in host else host
    # strip port
    if host.startswith("["):                       # ipv6 [::1]:port
        host = host.split("]")[0] + "]"
    elif host.count(":") == 1:
        host = host.split(":", 1)[0]
    return host in _LOOPBACK_HOSTS


# --------------------------------------------------------------------------- #
# Request / response structures
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class CreateSessionRequest:
    run_id: str
    workload_image_ref: Optional[str]
    entrypoint: tuple
    timeout_s: Optional[int]
    resource_limits: ResourceLimits = field(default_factory=ResourceLimits)
    egress_policy: Optional[EgressPolicy] = None
    mounts: tuple = ()                    # tuple[Mount, ...]; empty by default
    env: tuple = ()                       # tuple[(k, v), ...]; no secrets
    idempotency_key: Optional[str] = None


@dataclass(frozen=True)
class CreateSessionResult:
    session_id: str
    provider_meta: ProviderMeta
    status: str
    timestamps: Timestamps
    confidence: Confidence


@dataclass(frozen=True)
class UploadResult:
    stored_path: str
    stored_sha256: str
    timestamps: Timestamps
    confidence: Confidence


@dataclass(frozen=True)
class ExecResult:
    exit_code: Optional[int]
    stdout_ref: Optional[EvidenceRef]
    stderr_ref: Optional[EvidenceRef]
    started_at: Optional[str]
    ended_at: Optional[str]
    timestamps: Timestamps
    confidence: Confidence


@dataclass(frozen=True)
class DownloadResult:
    content_ref: str
    downloaded_sha256: str
    bytes: int
    timestamps: Timestamps
    confidence: Confidence


@dataclass(frozen=True)
class EgressResult:
    effective_default: str
    effective_rules: tuple
    enforcement_mode: str
    evidence_ref: Optional[EvidenceRef]
    timestamps: Timestamps
    confidence: Confidence


@dataclass(frozen=True)
class InspectResult:
    provider_meta: ProviderMeta
    mounts: tuple
    capabilities: tuple
    privileged: bool
    network_mode: str
    security_options: tuple
    user: str                             # "root" recorded as a risk flag
    published_endpoints: tuple            # tuple[(port, bind_scope), ...]
    timestamps: Timestamps
    confidence: Confidence


@dataclass(frozen=True)
class TerminateResult:
    accepted: bool
    timestamps: Timestamps
    confidence: Confidence


@dataclass(frozen=True)
class TerminationProof:
    session_absent: bool
    container_absent: Optional[bool]
    sidecar_absent: Optional[bool]
    volume_absent: Optional[bool]
    evidence_ref: Optional[EvidenceRef]
    confidence: Confidence


@dataclass(frozen=True)
class EvidenceBundle:
    run_id: str
    session_id: str
    provider_meta: ProviderMeta
    evidence: tuple                       # tuple[EvidenceRef, ...]
    completeness: str                     # COMPLETE | INCOMPLETE
    confidence: Confidence


@dataclass(frozen=True)
class HealthResult:
    reachable: bool
    provider_version: Optional[str]
    api_contract_version: str
    timestamps: Timestamps
    confidence: Confidence


# --------------------------------------------------------------------------- #
# Founder acceptance — deliberately NOT issuable by a provider
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class Acceptance:
    """Only the founder authority may issue an acceptance. Constructing one with
    any other issuer is an AuthorityError. No provider can produce this."""
    run_id: str
    issued_by: str
    accepted: bool

    def __post_init__(self):
        if self.issued_by != "founder":
            raise AuthorityError(
                f"acceptance may only be issued by 'founder', not {self.issued_by!r}"
            )


# --------------------------------------------------------------------------- #
# Shared invariant validation (used by every conforming provider)
# --------------------------------------------------------------------------- #


def validate_create_request(req: CreateSessionRequest, mode: RunMode) -> None:
    """Fail-closed validation of a create request. Raises on any violation."""
    if not req.workload_image_ref:
        raise ValidationError("missing workload image identity")
    if req.timeout_s is None:
        raise ValidationError("missing explicit timeout")
    if req.timeout_s <= 0:
        raise ValidationError("timeout must be positive")
    for m in req.mounts:
        if m.source_kind in FORBIDDEN_MOUNT_KINDS:
            raise AuthorityError(f"forbidden mount source_kind: {m.source_kind}")
        if m.source_kind not in ALLOWED_MOUNT_KINDS:
            raise ValidationError(f"unknown mount source_kind: {m.source_kind}")
        if "docker.sock" in m.dest_path:
            raise AuthorityError("docker socket mount is forbidden for a workload")
    for k, _v in req.env:
        if any(s in k.lower() for s in ("secret", "token", "password", "api_key", "aws_")):
            raise AuthorityError(f"secret-like env var not permitted without a later gate: {k}")
    if mode is RunMode.GOVERNED:
        if req.egress_policy is None or req.egress_policy.default_action != "deny":
            raise ValidationError("governed mode requires default-deny egress")
        validate_governed_image_ref(req.workload_image_ref)   # N2: exact digest required


def evaluate_run(
    exec_result: Optional[ExecResult],
    upload_digest_ok: bool,
    download_digest_ok: bool,
    termination_proof: Optional[TerminationProof],
) -> RunOutcome:
    """FounderGate-side evidence-completeness outcome. Never a founder acceptance.

    Fail-closed: any missing exec evidence or digest mismatch -> NOT_PASSED;
    unproven termination -> UNKNOWN; otherwise EVIDENCE_SUFFICIENT.
    """
    if exec_result is None:
        return RunOutcome.NOT_PASSED
    if (exec_result.exit_code is None
            or exec_result.stdout_ref is None
            or exec_result.stderr_ref is None
            or exec_result.started_at is None
            or exec_result.ended_at is None):
        return RunOutcome.NOT_PASSED           # EvidenceIncomplete
    if not upload_digest_ok or not download_digest_ok:
        return RunOutcome.NOT_PASSED
    if termination_proof is None:
        return RunOutcome.UNKNOWN
    if (termination_proof.confidence is Confidence.UNKNOWN
            or not termination_proof.session_absent):
        return RunOutcome.UNKNOWN
    return RunOutcome.EVIDENCE_SUFFICIENT


# --------------------------------------------------------------------------- #
# Provider-neutral abstract interface (the ten operations)
# --------------------------------------------------------------------------- #


class SandboxProvider(ABC):
    """FounderGate-owned interface. Implementations translate all provider
    specifics into these neutral types and errors."""

    mode: RunMode = RunMode.LOCAL_DEV

    @abstractmethod
    def create_session(self, req: CreateSessionRequest) -> CreateSessionResult: ...

    @abstractmethod
    def upload_artifact(self, session_id: str, dest_path: str,
                        content: bytes, expected_sha256: str,
                        timeout_s: int) -> UploadResult: ...

    @abstractmethod
    def execute_command(self, session_id: str, command: str, cwd: str,
                        timeout_ms: int) -> ExecResult: ...

    @abstractmethod
    def download_artifact(self, session_id: str, src_path: str,
                          timeout_s: int,
                          expected_sha256: Optional[str] = None) -> DownloadResult: ...

    @abstractmethod
    def apply_egress_policy(self, session_id: str, policy: EgressPolicy,
                            timeout_s: int) -> EgressResult: ...

    @abstractmethod
    def inspect_session(self, session_id: str, timeout_s: int) -> InspectResult: ...

    @abstractmethod
    def terminate_session(self, session_id: str, timeout_s: int,
                          idempotency_key: Optional[str] = None) -> TerminateResult: ...

    @abstractmethod
    def prove_termination(self, session_id: str, timeout_s: int) -> TerminationProof: ...

    @abstractmethod
    def collect_evidence(self, run_id: str, session_id: str,
                         timeout_s: int) -> EvidenceBundle: ...

    @abstractmethod
    def health_check(self, endpoint: str, timeout_s: int) -> HealthResult: ...
