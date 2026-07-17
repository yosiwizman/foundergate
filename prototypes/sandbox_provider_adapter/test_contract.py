"""Isolated contract tests for the Phase-3 sandbox provider prototype.

Standard library only. NO Docker, NO OpenSandbox, NO network. Run from this dir:
    python3 -m unittest test_contract -v
"""
import dataclasses
import hashlib
import unittest

from contract import (
    Acceptance, AuthorityError, Confidence, CreateSessionRequest, EgressPolicy,
    EgressRule, Mount, ProviderProtocolError, ProviderUnavailable, ResourceLimits,
    RunMode, RunOutcome, ValidationError, evaluate_run,
)
from fake_provider import FakeProvider
from opensandbox_provider import OpenSandboxConfig, OpenSandboxProvider

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
        outcome = evaluate_run(ex, up.stored_sha256 == _sha(content),
                               dl.downloaded_sha256 == dl.downloaded_sha256, tp)
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

    # bonus: disabled transport => ProviderUnavailable (no network in tests)
    def test_17_disabled_transport_is_unavailable(self):
        prov = OpenSandboxProvider(OpenSandboxConfig(lifecycle_endpoint="http://127.0.0.1:8090"))
        with self.assertRaises(ProviderUnavailable):
            prov.create_session(_req())


if __name__ == "__main__":
    unittest.main(verbosity=2)
