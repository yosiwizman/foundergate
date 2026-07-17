"""Deterministic in-memory fake source provider (Phase 5 prototype — DESIGN ONLY).

Simulates a PUBLIC GitHub repository with NO network, NO GitHub API, NO cloning. Resolves
a fake ref to one exact SHA, emits a deterministic archive manifest, supports injected
failures, and returns OBSERVATIONS only — never a founder acceptance.
"""
from __future__ import annotations

import hashlib
from typing import Optional

from contract import (
    ArchiveEntry, IntakeLimits, NormalizedUrl, SourceObservation, ValidationError,
    normalize_github_url, validate_archive_entry,
)

# Injectable fault modes.
FAULTS = frozenset({
    "path_traversal", "unsafe_symlink", "absolute_path", "oversized", "too_many_files",
    "ref_mismatch", "secret_file", "submodule", "lfs", "private", "no_commit", "no_digest",
})


def _fake_sha(url: str, ref: str) -> str:
    # deterministic 40-hex "commit" derived from url+ref (NOT a real git sha)
    return hashlib.sha1(f"{url}@{ref}".encode()).hexdigest()


class FakeSourceProvider:
    name = "fake-github"
    version = "0.0.1-fake"

    def __init__(self, faults: Optional[frozenset] = None):
        self.faults = faults or frozenset()

    def resolve_ref(self, url: str, requested_ref: Optional[str]) -> str:
        ref = requested_ref or "main"
        return _fake_sha(url, ref)

    def _entries(self) -> list:
        entries = [ArchiveEntry("repo/README.md", 1200), ArchiveEntry("repo/src/app.py", 3400)]
        if "path_traversal" in self.faults:
            entries.append(ArchiveEntry("repo/../escape.txt", 10))
        if "absolute_path" in self.faults:
            entries.append(ArchiveEntry("/etc/evil", 10))
        if "unsafe_symlink" in self.faults:
            entries.append(ArchiveEntry("repo/link", 0, is_symlink=True, link_target="../../../../etc/passwd"))
        return entries

    def observe(self, url: str, requested_ref: Optional[str], limits: IntakeLimits) -> SourceObservation:
        """Produce a SourceObservation. Never raises for policy reasons — it records
        observations (including unsafe entries); policy decides. URL validity IS enforced
        (a malformed URL is not a repository)."""
        norm: NormalizedUrl = normalize_github_url(url)   # fail-closed URL validation
        commit = None if "no_commit" in self.faults else self.resolve_ref(url, requested_ref)
        digest = None if "no_digest" in self.faults else hashlib.sha256(f"snap:{commit}".encode()).hexdigest()
        file_count = (limits.maximum_file_count + 1) if "too_many_files" in self.faults else 2
        byte_count = (limits.maximum_snapshot_size + 1) if "oversized" in self.faults else 4600

        unsafe = []
        for e in self._entries():
            try:
                validate_archive_entry(e, max_file_size=limits.maximum_file_size)
            except ValidationError as ex:
                unsafe.append(f"{e.name}: {ex}")

        return SourceObservation(
            normalized_url=norm,
            exact_commit=commit,
            snapshot_sha256=digest,
            file_count=file_count,
            byte_count=byte_count,
            is_private="private" in self.faults,
            ref_matches_commit="ref_mismatch" not in self.faults,
            detected_languages=("python",),
            detected_package_managers=("pip",),
            detected_license_files=("LICENSE",),
            detected_secret_like_files=(".env",) if "secret_file" in self.faults else (),
            detected_large_files=(),
            detected_submodules=("vendor/x",) if "submodule" in self.faults else (),
            detected_lfs=("model.bin",) if "lfs" in self.faults else (),
            unsafe_entries=tuple(unsafe),
            source_provider_name=self.name,
            source_provider_version=self.version,
        )

    # Deliberately NOT part of the interface: a provider trying to self-accept.
    def attempt_self_acceptance(self, request_id: str):
        from contract import Acceptance
        return Acceptance(request_id=request_id, issued_by="provider", accepted=True)
