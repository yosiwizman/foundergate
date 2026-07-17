"""Isolated contract tests for the Phase-3 sandbox provider prototype.

Standard library only. NO Docker, NO OpenSandbox, NO network. Run from this dir:
    python3 -m unittest test_contract -v
"""
import dataclasses
import hashlib
import unittest

from contract import (
    Acceptance, AuthorityError, Confidence, CreateSessionRequest, DownloadResult,
    EgressPolicy, EgressRule, Mount, ProviderProtocolError, ProviderUnavailable,
    ResourceLimits, RunMode, RunOutcome, ValidationError, evaluate_run,
    validate_governed_image_ref,
)
from fake_provider import FakeProvider
from opensandbox_provider import (
    OpenSandboxConfig, OpenSandboxProvider, assert_no_public_port_binding,
)

IMG = "python@sha256:" + "d" * 64


def _sha(b): return "sha256:" + hashlib.sha256(b).hexdigest()


def _req(image=IMG, timeout=300, mounts=(), egress=None, mode_env=()):
    return CreateSessionRequest(
        run_id="run-1", workload_image_ref=image, entrypoint=("sleep", "infinity"),
        timeout_s=timeout, resource_limits=ResourceLimits(), egress_policy=egress,
        mounts=mounts, env=mode_env)


class ContractTests(unittest.TestCase):

    # 1
    def test_01_fake_lifecycle_succeeds(self):
        p = FakeProvider(mode=RunMode.LOCAL_DEV)
        s = p.create_session(_req())
        content = b"FOUNDERGATE_OPENSANDBOX_PHASE2_INPUT"
        up = p.upload_artifact(s.session_id, "/workspace/input.txt", content, _sha(content), 30)
        self.assertEqual(up.stored_sha256, _sha(content))
        ex = p.execute_command(s.session_id, "bash builder.sh", "/workspace", 30000)
        self.assertEqual(ex.exit_code, 0)
        dl = p.download_artifact(s.session_id, "/workspace/output/result.txt", 30)
        p.apply_egress_policy(s.session_id, EgressPolicy("deny", (EgressRule("allow", "example.com"),)), 10)
        ins = p.inspect_session(s.session_id, 10)
        self.assertFalse(ins.privileged)
        p.terminate_session(s.session_id, 10)
        tp = p.prove_termination(s.session_id, 10)
        self.assertTrue(tp.session_absent)
        # N1: meaningful assertions (replacing a tautological digest comparison)
        self.assertEqual(s.session_id, "fake-0")                 # deterministic session identity
        self.assertEqual(s.status, "Running")                    # deterministic state transition
        self.assertEqual(ex.stdout_ref.kind, "stdout")           # exact evidence field
        self.assertIsInstance(dl, DownloadResult)                # provider-neutral response type
        self.assertEqual(dl.downloaded_sha256, _sha(b"RESULT"))  # real digest of downloaded bytes
        self.assertFalse(hasattr(dl, "execution_complete"))      # no provider-specific field leak
        download_ok = dl.downloaded_sha256 == _sha(b"RESULT")
        outcome = evaluate_run(ex, up.stored_sha256 == _sha(content), download_ok, tp)
        self.assertEqual(outcome, RunOutcome.EVIDENCE_SUFFICIENT)

    # 2
    def test_02_missing_image_fails_closed(self):
        p = FakeProvider()
        with self.assertRaises(ValidationError):
            p.create_session(_req(image=None))

    # 3
    def test_03_missing_timeout_fails_closed(self):
        p = FakeProvider()
        with self.assertRaises(ValidationError):
            p.create_session(_req(timeout=None))

    # 4
    def test_04_host_mount_rejected(self):
        p = FakeProvider()
        with self.assertRaises(AuthorityError):
            p.create_session(_req(mounts=(Mount("host_path", "/work"),)))

    # 5
    def test_05_docker_socket_mount_rejected(self):
        p = FakeProvider()
        with self.assertRaises(AuthorityError):
            p.create_session(_req(mounts=(Mount("docker_socket", "/var/run/docker.sock"),)))

    # 6
    def test_06_non_default_deny_egress_rejected_governed(self):
        p = FakeProvider(mode=RunMode.GOVERNED)
        with self.assertRaises(ValidationError):
            p.create_session(_req(egress=EgressPolicy("allow", ())))

    # 7
    def test_07_missing_exec_evidence_fails(self):
        p = FakeProvider(failures=frozenset({"exec_missing_evidence"}))
        s = p.create_session(_req())
        ex = p.execute_command(s.session_id, "x", "/", 1000)
        outcome = evaluate_run(ex, True, True, p.prove_termination(s.session_id, 10))
        self.assertEqual(outcome, RunOutcome.NOT_PASSED)

    # 8
    def test_08_digest_mismatch_fails(self):
        p = FakeProvider()
        s = p.create_session(_req())
        with self.assertRaises(ValidationError):
            p.upload_artifact(s.session_id, "/x", b"data", _sha(b"OTHER"), 10)
        # and evidence-level: a mismatched upload flag => NOT_PASSED
        ex = p.execute_command(s.session_id, "x", "/", 1000)
        self.assertEqual(evaluate_run(ex, False, True, p.prove_termination(s.session_id, 10)),
                         RunOutcome.NOT_PASSED)

    # 9
    def test_09_unknown_termination_is_unknown(self):
        p = FakeProvider(failures=frozenset({"termination_unknown"}))
        s = p.create_session(_req())
        ex = p.execute_command(s.session_id, "x", "/", 1000)
        tp = p.prove_termination(s.session_id, 10)
        self.assertEqual(tp.confidence, Confidence.UNKNOWN)
        self.assertEqual(evaluate_run(ex, True, True, tp), RunOutcome.UNKNOWN)

    # 10
    def test_10_provider_cannot_issue_acceptance(self):
        p = FakeProvider()
        with self.assertRaises(AuthorityError):
            p.attempt_self_acceptance("run-1")
        # only the founder authority can construct an Acceptance
        ok = Acceptance(run_id="run-1", issued_by="founder", accepted=True)
        self.assertTrue(ok.accepted)

    # 11
    def test_11_opensandbox_serialization_deterministic(self):
        prov = OpenSandboxProvider(OpenSandboxConfig())
        b1 = prov.build_create_body(_req(egress=EgressPolicy("deny", (EgressRule("allow", "example.com"),))))
        b2 = prov.build_create_body(_req(egress=EgressPolicy("deny", (EgressRule("allow", "example.com"),))))
        self.assertEqual(b1, b2)
        self.assertEqual(b1["image"]["uri"], IMG)
        self.assertEqual(b1["timeout"], 300)
        self.assertEqual(b1["networkPolicy"]["defaultAction"], "deny")

    # 12
    def test_12_malformed_response_rejected(self):
        prov = OpenSandboxProvider(OpenSandboxConfig())
        with self.assertRaises(ProviderProtocolError):
            prov.parse_create_response({})
        with self.assertRaises(ProviderProtocolError):
            prov.parse_command_stream("this is not ndjson")
        with self.assertRaises(ProviderProtocolError):
            prov.parse_command_stream('{"type":"stdout","text":"x"}')  # no init/complete

    # 13
    def test_13_local_mode_rejects_non_loopback(self):
        with self.assertRaises(ValidationError):
            OpenSandboxProvider(OpenSandboxConfig(lifecycle_endpoint="http://10.0.0.5:8090"))
        prov = OpenSandboxProvider(OpenSandboxConfig())
        with self.assertRaises(ValidationError):
            prov.health_check("http://192.168.1.20:8090", 5)

    # 14
    def test_14_zero_host_target_rejected(self):
        with self.assertRaises(ValidationError):
            OpenSandboxProvider(OpenSandboxConfig(execd_endpoint="http://0.0.0.0:44772"))

    # 15
    def test_15_no_provider_specific_leak(self):
        prov = OpenSandboxProvider(OpenSandboxConfig())
        stream = ('{"type":"init","text":"abc","timestamp":1}\n'
                  '{"type":"stdout","text":"HELLO","timestamp":2}\n'
                  '{"type":"stdout","text":"__RC=0","timestamp":3}\n'
                  '{"type":"execution_complete","timestamp":4}\n')
        ex = prov.parse_command_stream(stream)
        # neutral dataclass, fixed field set — no provider event-type names leak
        names = {f.name for f in dataclasses.fields(ex)}
        self.assertEqual(names, {"exit_code", "stdout_ref", "stderr_ref",
                                 "started_at", "ended_at", "timestamps", "confidence"})
        blob = repr(ex)
        for leak in ("execution_complete", "jupyter", "init", "ping"):
            self.assertNotIn(leak, blob)
        self.assertEqual(ex.exit_code, 0)

    # 16
    def test_16_injected_failure_never_sufficient(self):
        for fail in ("exec_missing_evidence", "termination_unknown", "digest_mismatch"):
            p = FakeProvider(failures=frozenset({fail}))
            s = p.create_session(_req())
            ex = p.execute_command(s.session_id, "x", "/", 1000)
            up_ok = fail != "digest_mismatch"
            tp = p.prove_termination(s.session_id, 10)
            outcome = evaluate_run(ex, up_ok, True, tp)
            self.assertIn(outcome, (RunOutcome.NOT_PASSED, RunOutcome.UNKNOWN),
                          f"failure {fail} produced {outcome}")
            self.assertNotEqual(outcome, RunOutcome.EVIDENCE_SUFFICIENT)

    # 18 — N2: strict governed digest validation (positive + negatives)
    def test_18_governed_image_digest_strict(self):
        good = "docker.io/library/python@sha256:" + "a1" * 32   # 64 lowercase hex
        validate_governed_image_ref(good)                        # positive: no raise
        validate_governed_image_ref("python@sha256:" + "d" * 64)  # bare name ok
        bad = [
            "",                                          # missing name
            "python:3.11-slim",                          # tag-only, no digest
            "python:latest",                             # :latest tag-only
            "python:latest@sha256:" + "a" * 64,          # :latest present
            "python@sha256:",                            # empty digest
            "python@sha256:abcd",                        # short digest
            "python@sha256:" + "A" * 64,                 # uppercase hex
            "python@sha256:" + "g" * 64,                 # non-hex
            "@sha256:" + "a" * 64,                        # missing repository name
        ]
        for ref in bad:
            with self.assertRaises(ValidationError, msg=f"should reject {ref!r}"):
                validate_governed_image_ref(ref)
        # and end-to-end via create_session in governed mode
        from fake_provider import FakeProvider as FP
        gp = FP(mode=RunMode.GOVERNED)
        with self.assertRaises(ValidationError):
            gp.create_session(_req(image="python:latest",
                                   egress=EgressPolicy("deny", ())))

    # 19 — Phase 4.1 port-binding guard (no-publish / loopback-only pass; 0.0.0.0 / malformed reject)
    def test_19_port_binding_guard(self):
        # A. no publication (port exposed, HostBindings None) -> OK
        assert_no_public_port_binding({"44772/tcp": None})
        # B. loopback-only publication -> OK
        assert_no_public_port_binding({
            "44772/tcp": [{"HostIp": "127.0.0.1", "HostPort": "40001"}],
            "8080/tcp": [{"HostIp": "127.0.0.1", "HostPort": "40002"}],
            "18080/tcp": [{"HostIp": "::1", "HostPort": "40003"}]})
        # non-governed ports are ignored even if public
        assert_no_public_port_binding({"9999/tcp": [{"HostIp": "0.0.0.0", "HostPort": "9"}]})
        # C. 0.0.0.0 on a governed port -> AuthorityError (neutral)
        for bad in ("0.0.0.0", "::", "", "192.168.5.15"):
            with self.assertRaises(AuthorityError, msg=f"should reject HostIp {bad!r}"):
                assert_no_public_port_binding({"44772/tcp": [{"HostIp": bad, "HostPort": "40001"}]})
        # D. malformed Docker metadata -> ProviderProtocolError (neutral), never silent
        for bad_meta in (None, "not-a-dict", {"44772/tcp": "not-a-list"},
                         {"44772/tcp": [{"HostPort": "40001"}]}):   # missing HostIp
            with self.assertRaises((ProviderProtocolError,)):
                assert_no_public_port_binding(bad_meta)
        # E. the guard raises only provider-neutral errors (never a provider-specific type)
        try:
            assert_no_public_port_binding({"8080/tcp": [{"HostIp": "0.0.0.0", "HostPort": "1"}]})
        except AuthorityError:
            pass
        else:
            self.fail("guard did not reject 0.0.0.0")

    # bonus: disabled transport => ProviderUnavailable (no network in tests)
    def test_17_disabled_transport_is_unavailable(self):
        prov = OpenSandboxProvider(OpenSandboxConfig(lifecycle_endpoint="http://127.0.0.1:8090"))
        with self.assertRaises(ProviderUnavailable):
            prov.create_session(_req())


if __name__ == "__main__":
    unittest.main(verbosity=2)
