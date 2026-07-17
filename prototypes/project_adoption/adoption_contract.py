"""FounderGate project-adoption contract (Phase 7.1 Lane F — DESIGN + SYNTHETIC TESTS).

Project-NEUTRAL core interfaces so future FounderGate projects (a second project, an
outside operator, and later AKIOR) can adopt the Safety Check + Evidence Pack via bounded
ADAPTERS, not a core rewrite. NO AKIOR import, NO network, NO repository execution.
Standard library only.

Truth labels are explicit and never blurred: IMPLEMENTED / PROVEN / COMPATIBILITY_PREPARED /
PLANNED / HELD / NOT_AUTHORIZED / UNKNOWN. No adapter may issue founder acceptance, merge,
production, security, or customer authority.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

CORE_SCHEMA_VERSION = "1.0.0"


class ClaimLabel(str, Enum):
    IMPLEMENTED = "IMPLEMENTED"
    PROVEN = "PROVEN"
    COMPATIBILITY_PREPARED = "COMPATIBILITY_PREPARED"
    PLANNED = "PLANNED"
    HELD = "HELD"
    NOT_AUTHORIZED = "NOT_AUTHORIZED"
    UNKNOWN = "UNKNOWN"


class ProjectType(str, Enum):
    PYTHON_PUBLIC = "python_public"
    GENERIC_WEB = "generic_web"
    ANDROID = "android"          # AKIOR-like; schema-only; NOT_AUTHORIZED for execution


class AdoptionError(Exception): ...
class SchemaVersionError(AdoptionError): ...
class AuthorityError(AdoptionError): ...
class UnsupportedProject(AdoptionError): ...


# --- authority: founder-only acceptance (no adapter/provider may construct this) ------- #
@dataclass(frozen=True)
class Acceptance:
    run_id: str
    issued_by: str
    accepted: bool
    def __post_init__(self):
        if self.issued_by != "founder":
            raise AuthorityError(f"acceptance only by 'founder', not {self.issued_by!r}")


# --- project-neutral CORE value types --------------------------------------------------- #
@dataclass(frozen=True)
class ExactVersionIdentity:
    kind: str            # e.g. "git-commit"
    value: str           # e.g. 40-hex


@dataclass(frozen=True)
class ImmutableSnapshotIdentity:
    archive_sha256: Optional[str]
    canonical_manifest_sha256: Optional[str]


@dataclass(frozen=True)
class ProjectDescriptor:
    project_type: ProjectType
    repository_url: Optional[str] = None
    declared_data_class: str = "unknown"
    authorization: ClaimLabel = ClaimLabel.HELD   # execution authorization for this project


@dataclass(frozen=True)
class IntakeRequest:
    repository_url: str
    visibility: str = "public"       # only "public" is supported today; private -> HELD


@dataclass(frozen=True)
class IntakeObservation:
    normalized_url: str
    exact_version: Optional[ExactVersionIdentity]
    snapshot: Optional[ImmutableSnapshotIdentity]
    is_private: bool = False


@dataclass(frozen=True)
class CheckModule:
    key: str
    label: str
    applies_to: tuple              # tuple[ProjectType, ...]


@dataclass(frozen=True)
class CheckPlan:
    project_type: ProjectType
    modules: tuple                 # tuple[CheckModule, ...]
    status: ClaimLabel             # PLANNED / HELD / NOT_AUTHORIZED / UNKNOWN
    reasons: tuple = ()


# CORE run/evidence state — no project-specific fields.
@dataclass(frozen=True)
class RuntimeProgressEvent:
    run_id: str
    stage: int
    name: str
    status: str


@dataclass(frozen=True)
class RuntimeRecoveryState:
    run_id: str
    state: str                     # STARTED/RUNNING/COMPLETE/FAILED/UNKNOWN


@dataclass(frozen=True)
class CleanupEvidence:
    snapshot_deleted: bool
    sandbox_torn_down: bool
    runtime_destroyed: bool


@dataclass(frozen=True)
class CheckerVerdict:
    identity: str
    verdict: str                   # CHECKER-CLEAN/FINDINGS/REJECT/INSUFFICIENT-EVIDENCE/PENDING


@dataclass(frozen=True)
class FounderWitnessState:
    run_id: str
    witnessed: bool = False        # only the founder sets this via Acceptance, never an adapter


# CORE claim keys — an extension may NEVER overwrite these.
CORE_CLAIM_KEYS = frozenset({
    "compileability", "build", "tests", "security", "production_readiness",
    "network_isolation", "docker_socket", "host_mounts", "teardown",
    "snapshot_deletion", "runtime_destruction",
})


def build_evidence_pack(*, schema_version: str, run_id: str, project_type: ProjectType,
                        exact_version: Optional[ExactVersionIdentity],
                        snapshot: Optional[ImmutableSnapshotIdentity],
                        core_claims: dict, extensions: Optional[dict] = None) -> dict:
    """Build the canonical Evidence Pack core. Project observations go ONLY under
    extensions[<namespace>]; they may NOT collide with a core claim key. Fail-closed on a
    missing exact version / snapshot digest and on schema mismatch."""
    if schema_version != CORE_SCHEMA_VERSION:
        raise SchemaVersionError(f"schema {schema_version} != core {CORE_SCHEMA_VERSION}")
    if exact_version is None or not exact_version.value:
        raise AdoptionError("exact version identity is required")
    if snapshot is None or not snapshot.canonical_manifest_sha256:
        raise AdoptionError("immutable snapshot identity is required")
    ext = extensions or {}
    for ns, fields in ext.items():
        if not isinstance(fields, dict):
            raise AdoptionError(f"extension {ns} must be an object")
        for k in fields:
            if k in CORE_CLAIM_KEYS:
                raise AuthorityError(f"extension {ns}.{k} may not overwrite core claim {k!r}")
    # core claims default the four to NOT_PROVEN unless observed
    claims = {"build": "NOT_PROVEN", "tests": "NOT_PROVEN", "security": "NOT_PROVEN",
              "production_readiness": "NOT_PROVEN"}
    claims.update({k: v for k, v in core_claims.items() if k in CORE_CLAIM_KEYS})
    return {
        "schema_version": CORE_SCHEMA_VERSION, "run_id": run_id, "project_type": project_type.value,
        "exact_version": {"kind": exact_version.kind, "value": exact_version.value},
        "snapshot": {"archive_sha256": snapshot.archive_sha256, "canonical_manifest_sha256": snapshot.canonical_manifest_sha256},
        "claims": claims, "extensions": ext,
        "footer": "FounderGate Evidence Pack — evidence of the named checks on the exact recorded version; not a security, compliance, production-readiness, or bug-free certification.",
    }


def validate_pack_schema(pack: dict) -> None:
    """Fail closed on a schema-version mismatch. Unknown future top-level fields are preserved
    (additive policy) as long as the major version matches; a different major fails closed."""
    v = pack.get("schema_version", "")
    if not v:
        raise SchemaVersionError("missing schema_version")
    major = v.split(".")[0]
    if major != CORE_SCHEMA_VERSION.split(".")[0]:
        raise SchemaVersionError(f"incompatible major version {v} vs {CORE_SCHEMA_VERSION}")


# --- abstract adapter seams (adapters own their bits; NONE can accept) ------------------ #
class ProjectAdapter(ABC):
    project_type: ProjectType
    @abstractmethod
    def detect(self, observation: IntakeObservation) -> bool: ...
    @abstractmethod
    def check_modules(self) -> tuple: ...
    def attempt_accept(self, run_id: str):
        return Acceptance(run_id=run_id, issued_by="adapter", accepted=True)  # must raise


class SourceProvider(ABC):
    @abstractmethod
    def normalize(self, url: str) -> str: ...
    def attempt_accept(self, run_id: str):
        return Acceptance(run_id=run_id, issued_by="source-provider", accepted=True)  # must raise


class SandboxProvider(ABC):
    @abstractmethod
    def create(self, image_ref: str): ...
    def attempt_accept(self, run_id: str):
        return Acceptance(run_id=run_id, issued_by="sandbox-provider", accepted=True)  # must raise


# --- synthetic adapters (design; no execution) ------------------------------------------ #
_COMPILEABILITY = CheckModule("compileability", "python byte-compile", (ProjectType.PYTHON_PUBLIC,))
_WEB_STATIC = CheckModule("web_static_lint", "static HTML/JS structure", (ProjectType.GENERIC_WEB,))
# NOTE: there is deliberately NO Android/Gradle execution module — Android is NOT_AUTHORIZED.


class PythonPublicFixtureAdapter(ProjectAdapter):
    project_type = ProjectType.PYTHON_PUBLIC
    def detect(self, o): return True
    def check_modules(self): return (_COMPILEABILITY,)


class GenericWebProjectAdapter(ProjectAdapter):
    project_type = ProjectType.GENERIC_WEB
    def detect(self, o): return True
    def check_modules(self): return (_WEB_STATIC,)


class AndroidAkiorLikeAdapter(ProjectAdapter):
    """Schema-only descriptor for an AKIOR-like Android project. NO execution, NO Gradle,
    NOT_AUTHORIZED. Present so the Evidence Pack core + contract can be exercised for the
    project TYPE without implying any Android/mobile runtime support."""
    project_type = ProjectType.ANDROID
    def detect(self, o): return True
    def check_modules(self): return ()   # no authorized modules; execution NOT_AUTHORIZED


AUTHORIZED_FIXTURES = ("https://github.com/pypa/sampleproject",)  # config registry, not core logic


def plan_checks(descriptor: ProjectDescriptor, adapter: Optional[ProjectAdapter],
                observation: Optional[IntakeObservation]) -> CheckPlan:
    """Project-neutral planning. Missing adapter -> HELD/UNKNOWN; Android -> NOT_AUTHORIZED;
    unsupported/private -> HELD; else PLANNED with the adapter's applicable modules only."""
    if adapter is None:
        return CheckPlan(descriptor.project_type, (), ClaimLabel.HELD, ("no project adapter registered",))
    # Defense-in-depth fail-closed: Android/AKIOR-like is NOT_AUTHORIZED even if a caller mistakenly
    # passes authorization=PLANNED. This is the PLANNER (not the acceptance authority layer); naming
    # the dangerous type here is an intentional belt-and-suspenders guard, not an authority leak.
    if descriptor.project_type == ProjectType.ANDROID or descriptor.authorization == ClaimLabel.NOT_AUTHORIZED:
        return CheckPlan(descriptor.project_type, (), ClaimLabel.NOT_AUTHORIZED,
                         ("Android/AKIOR-like execution is not authorized; no Gradle/device support",))
    if observation is not None and observation.is_private:
        return CheckPlan(descriptor.project_type, (), ClaimLabel.HELD, ("private repositories not supported",))
    if observation is not None and (observation.exact_version is None or observation.snapshot is None):
        return CheckPlan(descriptor.project_type, (), ClaimLabel.HELD, ("exact version + immutable snapshot required",))
    # only modules that apply to this project type run
    modules = tuple(m for m in adapter.check_modules() if descriptor.project_type in m.applies_to)
    if not modules:
        return CheckPlan(descriptor.project_type, (), ClaimLabel.HELD, ("no authorized check module for this project type",))
    return CheckPlan(descriptor.project_type, modules, ClaimLabel.PLANNED)
