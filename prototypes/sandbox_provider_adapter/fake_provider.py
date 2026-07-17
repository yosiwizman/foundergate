"""Deterministic in-memory fake sandbox provider (Phase 3 prototype — DESIGN ONLY).

No network, no Docker, no OpenSandbox. Simulates the full provider-neutral
contract in memory for contract tests. Supports injected failures and CANNOT
return sufficient evidence when required evidence is withheld.
"""
from __future__ import annotations

import hashlib
from typing import Optional

from contract import (
    Acceptance, AuthorityError, Confidence, CreateSessionRequest,
    CreateSessionResult, DownloadResult, EgressPolicy, EgressResult, EvidenceBundle,
    EvidenceRef, ExecResult, HealthResult, InspectResult, Mount, ProviderMeta,
    RunMode, SandboxProvider, TerminateResult, TerminationProof, Timestamps,
    UploadResult, ValidationError, validate_create_request,
)

# Deterministic timestamps (no wall-clock; keeps tests reproducible).
_TS = [f"2026-01-01T00:00:{i:02d}Z" for i in range(60)]


def _sha(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


class FakeProvider(SandboxProvider):
    """In-memory provider. `failures` injects specific fault modes."""

    def __init__(self, mode: RunMode = RunMode.LOCAL_DEV,
                 failures: Optional[frozenset] = None,
                 image_ref: str = "python@sha256:" + "d" * 64):
        self.mode = mode
        self.failures = failures or frozenset()
        self._image = image_ref
        self._sessions: dict = {}
        self._files: dict = {}            # (sid, path) -> bytes
        self._n = 0

    def _ts(self) -> Timestamps:
        a, b = _TS[self._n % 60], _TS[(self._n + 1) % 60]
        self._n += 2
        return Timestamps(requested_at=a, responded_at=b,
                          started_at=a, ended_at=b)

    def _meta(self) -> ProviderMeta:
        return ProviderMeta(
            provider_name="fake", provider_version="0.0.1-fake",
            workload_image_ref=self._image, runtime_kind="standard-container",
            host_kind="in-memory", api_contract_version="phase3")

    # 1
    def create_session(self, req: CreateSessionRequest) -> CreateSessionResult:
        validate_create_request(req, self.mode)          # fail-closed
        sid = f"fake-{len(self._sessions)}"
        self._sessions[sid] = {"alive": True, "egress": req.egress_policy}
        return CreateSessionResult(sid, self._meta(), "Running",
                                   self._ts(), Confidence.VERIFIED)

    def _require(self, sid: str):
        if sid not in self._sessions:
            raise ValidationError(f"unknown session {sid}")

    # 2
    def upload_artifact(self, session_id, dest_path, content, expected_sha256,
                        timeout_s) -> UploadResult:
        self._require(session_id)
        stored = _sha(content)
        if "digest_mismatch" in self.failures:
            stored = "sha256:" + "0" * 64      # simulate corruption
        if stored != expected_sha256:
            raise ValidationError("uploaded digest mismatch")
        self._files[(session_id, dest_path)] = content
        return UploadResult(dest_path, stored, self._ts(), Confidence.VERIFIED)

    # 3
    def execute_command(self, session_id, command, cwd, timeout_ms) -> ExecResult:
        self._require(session_id)
        ts = self._ts()
        if "exec_missing_evidence" in self.failures:
            # provider fails to capture required evidence -> fail closed downstream
            return ExecResult(None, None, None, None, None, ts, Confidence.UNKNOWN)
        out = EvidenceRef("stdout", _sha(b"OK"), ts.responded_at, 2)
        err = EvidenceRef("stderr", _sha(b""), ts.responded_at, 0)
        return ExecResult(0, out, err, ts.started_at, ts.ended_at, ts,
                          Confidence.VERIFIED)

    # 4
    def download_artifact(self, session_id, src_path, timeout_s,
                          expected_sha256=None) -> DownloadResult:
        self._require(session_id)
        data = self._files.get((session_id, src_path), b"RESULT")
        dig = _sha(data)
        if expected_sha256 and dig != expected_sha256:
            raise ValidationError("downloaded digest mismatch")
        return DownloadResult("mem://" + src_path, dig, len(data),
                              self._ts(), Confidence.VERIFIED)

    # 5
    def apply_egress_policy(self, session_id, policy: EgressPolicy,
                            timeout_s) -> EgressResult:
        self._require(session_id)
        if self.mode is RunMode.GOVERNED and policy.default_action != "deny":
            raise ValidationError("governed mode requires default-deny egress")
        ev = EvidenceRef("egress", _sha(b"policy"), _TS[0], 6)
        return EgressResult(policy.default_action, policy.rules,
                            policy.mode_hint, ev, self._ts(), Confidence.VERIFIED)

    # 6
    def inspect_session(self, session_id, timeout_s) -> InspectResult:
        self._require(session_id)
        return InspectResult(
            self._meta(), mounts=(Mount("none", "-"),),
            capabilities=(), privileged=False, network_mode="bridge",
            security_options=("no-new-privileges:true",), user="root",
            published_endpoints=(("44772", "127.0.0.1"),),
            timestamps=self._ts(), confidence=Confidence.VERIFIED)

    # 7
    def terminate_session(self, session_id, timeout_s,
                          idempotency_key=None) -> TerminateResult:
        # idempotent: terminating an absent session is success
        if session_id in self._sessions:
            self._sessions[session_id]["alive"] = False
        return TerminateResult(True, self._ts(), Confidence.VERIFIED)

    # 8
    def prove_termination(self, session_id, timeout_s) -> TerminationProof:
        if "termination_unknown" in self.failures:
            return TerminationProof(False, None, None, None, None, Confidence.UNKNOWN)
        gone = (session_id not in self._sessions
                or not self._sessions[session_id]["alive"])
        ev = EvidenceRef("teardown", _sha(b"404"), _TS[0], 3)
        return TerminationProof(gone, gone, gone, gone, ev,
                                Confidence.VERIFIED if gone else Confidence.UNKNOWN)

    # 9
    def collect_evidence(self, run_id, session_id, timeout_s) -> EvidenceBundle:
        self._require(session_id)
        refs = (EvidenceRef("stdout", _sha(b"OK"), _TS[0], 2),
                EvidenceRef("exit", None, _TS[0], 0),
                EvidenceRef("inspect", _sha(b"i"), _TS[0], 1),
                EvidenceRef("teardown", _sha(b"404"), _TS[0], 3))
        complete = "exec_missing_evidence" not in self.failures
        return EvidenceBundle(run_id, session_id, self._meta(), refs,
                              "COMPLETE" if complete else "INCOMPLETE",
                              Confidence.VERIFIED if complete else Confidence.UNKNOWN)

    # 10
    def health_check(self, endpoint, timeout_s) -> HealthResult:
        return HealthResult(True, "0.0.1-fake", "phase3", self._ts(),
                            Confidence.VERIFIED)

    # Deliberately NOT part of the interface: a provider trying to self-accept.
    def attempt_self_acceptance(self, run_id: str) -> Acceptance:
        """Any provider attempt to issue founder acceptance must fail."""
        return Acceptance(run_id=run_id, issued_by="provider", accepted=True)
