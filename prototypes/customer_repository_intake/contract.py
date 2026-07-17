"""FounderGate customer-repository intake contract (Phase 5 prototype — DESIGN ONLY).

Isolated prototype. NOT imported by FounderGate production code. NO network, NO GitHub
API, NO OpenSandbox, NO repository cloning. Standard library only.

First intake path: PUBLIC GitHub repository URL, read-only, exact-commit snapshot.
Providers return observations; only FounderGate policy decides an intake status; only the
founder accepts. No layer may produce "safe"/"secure"/"production-ready"/"accepted".
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from urllib.parse import urlsplit


class IntakeStatus(str, Enum):
    ACCEPTED_FOR_ANALYSIS = "ACCEPTED_FOR_ANALYSIS"
    REJECTED = "REJECTED"
    HELD_FOR_FOUNDER_REVIEW = "HELD_FOR_FOUNDER_REVIEW"
    UNKNOWN = "UNKNOWN"


# ---- error classes (provider-neutral) ---------------------------------- #
class IntakeError(Exception): ...
class ValidationError(IntakeError): ...          # request/url/entry violates a rule
class PolicyRejection(IntakeError): ...          # policy fail-closed rejection
class AcquisitionError(IntakeError): ...         # snapshot/digest problem
class EvidenceIncomplete(IntakeError): ...       # required evidence missing
class ProviderProtocolError(IntakeError): ...    # malformed provider output
class AuthorityError(IntakeError): ...           # forbidden authority (e.g. provider self-accept)


_SHA_RE = re.compile(r"^[0-9a-f]{40}$|^[0-9a-f]{64}$")   # git sha1(40) or sha256(64), lowercase
_OWNER_REPO_RE = re.compile(r"^[A-Za-z0-9._-]+$")
_ALLOWED_HOSTS = frozenset({"github.com", "www.github.com"})
_CREDENTIAL_QUERY_KEYS = ("token", "access_token", "auth", "password", "client_secret", "api_key")


def is_exact_commit(sha: Optional[str]) -> bool:
    return bool(sha) and bool(_SHA_RE.match(sha))


@dataclass(frozen=True)
class NormalizedUrl:
    host: str
    owner: str
    repository: str
    requested_ref: Optional[str] = None   # from /tree/<ref> or /commit/<sha>; else None


def normalize_github_url(url: str) -> NormalizedUrl:
    """Normalize + validate a PUBLIC GitHub HTTPS URL. Fail-closed on everything else."""
    if not url or not isinstance(url, str):
        raise ValidationError("empty url")
    u = url.strip()
    # reject non-https transports up front
    if u.startswith(("git@", "ssh://", "git://")):
        raise ValidationError("SSH/git URL not permitted")
    if u.startswith("file://") or u.startswith("/") or re.match(r"^[A-Za-z]:[\\/]", u):
        raise ValidationError("local filesystem path / file:// not permitted")
    parts = urlsplit(u)
    if parts.scheme != "https":
        raise ValidationError(f"scheme must be https, got {parts.scheme!r}")
    if parts.username or parts.password or "@" in parts.netloc:
        raise ValidationError("embedded credentials (userinfo) not permitted")
    host = parts.hostname or ""
    if host.lower() not in _ALLOWED_HOSTS:
        raise ValidationError(f"host not allowed (github.com only): {host!r}")
    # reject credential-bearing query strings
    q = parts.query.lower()
    if any(k in q for k in _CREDENTIAL_QUERY_KEYS):
        raise ValidationError("credential in query string not permitted")
    segs = [s for s in parts.path.split("/") if s]
    if len(segs) < 2:
        raise ValidationError("URL must be https://github.com/<owner>/<repo>")
    owner, repo = segs[0], segs[1]
    if repo.endswith(".git"):
        repo = repo[:-4]
    if not _OWNER_REPO_RE.match(owner) or not _OWNER_REPO_RE.match(repo):
        raise ValidationError("invalid owner/repository name")
    if ".." in owner or ".." in repo:
        raise ValidationError("path traversal in owner/repository")
    requested_ref = None
    if len(segs) >= 4 and segs[2] in ("tree", "commit"):
        requested_ref = segs[3]
    return NormalizedUrl(host.lower(), owner, repo, requested_ref)


# ---- archive-entry safety --------------------------------------------- #
@dataclass(frozen=True)
class ArchiveEntry:
    name: str
    size: int = 0
    is_symlink: bool = False
    link_target: Optional[str] = None
    is_submodule: bool = False
    is_lfs_pointer: bool = False


def validate_archive_entry(entry: ArchiveEntry, *, max_file_size: int) -> None:
    """Reject unsafe archive entries. Raises ValidationError on any violation."""
    name = entry.name
    if name.startswith("/") or re.match(r"^[A-Za-z]:[\\/]", name):
        raise ValidationError(f"absolute path entry: {name!r}")
    # normalize separators; reject traversal
    norm_parts = name.replace("\\", "/").split("/")
    if ".." in norm_parts:
        raise ValidationError(f"path traversal entry: {name!r}")
    if entry.size > max_file_size:
        raise ValidationError(f"entry exceeds max_file_size: {name!r} ({entry.size})")
    if entry.is_symlink:
        tgt = entry.link_target or ""
        if tgt.startswith("/") or re.match(r"^[A-Za-z]:[\\/]", tgt):
            raise ValidationError(f"absolute symlink target: {name!r} -> {tgt!r}")
        # resolve relative to the entry's directory; escaping the root is unsafe
        base = norm_parts[:-1]
        depth = len(base)
        up = 0
        for seg in tgt.replace("\\", "/").split("/"):
            if seg == "..":
                up += 1
            elif seg and seg != ".":
                up -= 1
            if up > depth:
                raise ValidationError(f"symlink escapes snapshot root: {name!r} -> {tgt!r}")


# ---- observations / manifest / evidence -------------------------------- #
@dataclass(frozen=True)
class SourceObservation:
    normalized_url: NormalizedUrl
    exact_commit: Optional[str]
    snapshot_sha256: Optional[str]
    file_count: int
    byte_count: int
    is_private: bool = False
    ref_matches_commit: bool = True         # acquired snapshot matches the resolved commit
    detected_languages: tuple = ()
    detected_package_managers: tuple = ()
    detected_license_files: tuple = ()
    detected_secret_like_files: tuple = ()
    detected_large_files: tuple = ()
    detected_submodules: tuple = ()
    detected_lfs: tuple = ()
    unsafe_entries: tuple = ()
    source_provider_name: str = "unknown"
    source_provider_version: str = "unknown"


@dataclass(frozen=True)
class IntakeLimits:
    maximum_snapshot_size: int = 200 * 1024 * 1024   # 200 MiB
    maximum_file_count: int = 50_000
    maximum_file_size: int = 50 * 1024 * 1024


@dataclass(frozen=True)
class IntakeRequest:
    repository_url: str
    declared_project_type: str
    declared_data_class: str
    network_policy: str
    founder_request_id: str
    requested_ref: Optional[str] = None
    declared_license: Optional[str] = None
    declared_build_command: Optional[str] = None
    declared_test_command: Optional[str] = None
    limits: IntakeLimits = field(default_factory=IntakeLimits)


@dataclass(frozen=True)
class IntakeManifest:
    request_id: str
    normalized_url: NormalizedUrl
    exact_commit: str
    snapshot_sha256: str
    file_count: int
    byte_count: int
    status: IntakeStatus
    refusal_reasons: tuple
    policy_decisions: tuple


@dataclass(frozen=True)
class Acceptance:
    """Only the founder may accept. No provider/automation may construct this."""
    request_id: str
    issued_by: str
    accepted: bool

    def __post_init__(self):
        if self.issued_by != "founder":
            raise AuthorityError(f"acceptance may only be issued by 'founder', not {self.issued_by!r}")


def decide_intake(obs: SourceObservation, limits: IntakeLimits) -> tuple:
    """FounderGate-side fail-closed policy. Returns (IntakeStatus, refusal_reasons, policy_decisions).
    Never returns safe/secure/accepted; only the four intake statuses."""
    reasons, decisions = [], []
    def dec(rule, verdict): decisions.append(f"{rule}={verdict}")

    # hard rejects (fail closed)
    if obs.is_private:
        reasons.append("private repository not supported in the public path"); dec("private", "REJECT")
    if not is_exact_commit(obs.exact_commit):
        reasons.append("no exact commit resolved"); dec("exact_commit", "REJECT")
    if not obs.snapshot_sha256:
        reasons.append("missing snapshot digest"); dec("digest", "REJECT")
    if not obs.ref_matches_commit:
        reasons.append("mutable-ref/commit mismatch"); dec("ref_match", "REJECT")
    if obs.unsafe_entries:
        reasons.append(f"unsafe archive entries: {list(obs.unsafe_entries)}"); dec("archive_safety", "REJECT")
    if obs.byte_count > limits.maximum_snapshot_size:
        reasons.append("snapshot exceeds size limit"); dec("size", "REJECT")
    if obs.file_count > limits.maximum_file_count:
        reasons.append("file count exceeds limit"); dec("file_count", "REJECT")
    if reasons:
        return IntakeStatus.REJECTED, tuple(reasons), tuple(decisions)

    # holds (need founder review)
    holds = []
    if obs.detected_secret_like_files:
        holds.append(f"secret-like files: {list(obs.detected_secret_like_files)}"); dec("secrets", "HOLD")
    if obs.detected_submodules:
        holds.append(f"submodules: {list(obs.detected_submodules)}"); dec("submodules", "HOLD")
    if obs.detected_lfs:
        holds.append(f"git-lfs: {list(obs.detected_lfs)}"); dec("lfs", "HOLD")
    if not obs.normalized_url or not obs.exact_commit:
        return IntakeStatus.UNKNOWN, ("incomplete observation",), tuple(decisions)
    if holds:
        return IntakeStatus.HELD_FOR_FOUNDER_REVIEW, tuple(holds), tuple(decisions)

    dec("all_rules", "PASS")
    return IntakeStatus.ACCEPTED_FOR_ANALYSIS, (), tuple(decisions)


def evaluate_evidence_completeness(obs: SourceObservation) -> IntakeStatus:
    """Incomplete evidence -> UNKNOWN or REJECTED, never a pass."""
    if obs is None:
        return IntakeStatus.REJECTED
    if not is_exact_commit(obs.exact_commit) or not obs.snapshot_sha256:
        return IntakeStatus.UNKNOWN
    return IntakeStatus.ACCEPTED_FOR_ANALYSIS
