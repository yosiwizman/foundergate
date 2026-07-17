"""Isolated intake-contract tests. Stdlib only. NO network, NO GitHub, NO cloning.
Run: python3 -m unittest test_contract -v
"""
import dataclasses
import unittest

from contract import (
    Acceptance, AuthorityError, IntakeLimits, IntakeManifest, IntakeStatus,
    SourceObservation, ValidationError, decide_intake, evaluate_evidence_completeness,
    is_exact_commit, normalize_github_url,
)
from fake_source_provider import FakeSourceProvider

LIM = IntakeLimits()
URL = "https://github.com/octocat/Hello-World"


def obs(url=URL, ref=None, faults=frozenset()):
    return FakeSourceProvider(faults=faults).observe(url, ref, LIM)


def status(o):
    return decide_intake(o, LIM)[0]


class IntakeTests(unittest.TestCase):

    def test_01_valid_public_url_accepted(self):
        n = normalize_github_url(URL)
        self.assertEqual((n.host, n.owner, n.repository), ("github.com", "octocat", "Hello-World"))
        self.assertEqual(status(obs()), IntakeStatus.ACCEPTED_FOR_ANALYSIS)

    def test_02_exact_commit_retained(self):
        o = obs()
        self.assertTrue(is_exact_commit(o.exact_commit))
        self.assertEqual(len(o.exact_commit), 40)
        # deterministic resolution
        self.assertEqual(o.exact_commit, obs().exact_commit)

    def test_03_ssh_url_rejected(self):
        for u in ("git@github.com:octocat/Hello-World.git", "ssh://git@github.com/o/r"):
            with self.assertRaises(ValidationError):
                normalize_github_url(u)

    def test_04_file_url_rejected(self):
        for u in ("file:///etc/passwd", "/Users/x/repo", "C:\\repo"):
            with self.assertRaises(ValidationError):
                normalize_github_url(u)

    def test_05_non_github_rejected(self):
        for u in ("https://gitlab.com/o/r", "https://evil.example/o/r", "http://github.com/o/r"):
            with self.assertRaises(ValidationError):
                normalize_github_url(u)

    def test_06_embedded_credential_rejected(self):
        with self.assertRaises(ValidationError):
            normalize_github_url("https://user:pass@github.com/o/r")

    def test_07_query_credential_rejected(self):
        for u in ("https://github.com/o/r?token=abc", "https://github.com/o/r?access_token=x"):
            with self.assertRaises(ValidationError):
                normalize_github_url(u)

    def test_08_path_traversal_rejected(self):
        self.assertEqual(status(obs(faults=frozenset({"path_traversal"}))), IntakeStatus.REJECTED)

    def test_09_absolute_archive_path_rejected(self):
        self.assertEqual(status(obs(faults=frozenset({"absolute_path"}))), IntakeStatus.REJECTED)

    def test_10_unsafe_symlink_rejected(self):
        self.assertEqual(status(obs(faults=frozenset({"unsafe_symlink"}))), IntakeStatus.REJECTED)

    def test_11_oversized_rejected(self):
        self.assertEqual(status(obs(faults=frozenset({"oversized"}))), IntakeStatus.REJECTED)

    def test_12_excessive_file_count_rejected(self):
        self.assertEqual(status(obs(faults=frozenset({"too_many_files"}))), IntakeStatus.REJECTED)

    def test_13_mutable_ref_mismatch_rejected(self):
        self.assertEqual(status(obs(faults=frozenset({"ref_mismatch"}))), IntakeStatus.REJECTED)

    def test_14_missing_digest_rejected(self):
        self.assertEqual(status(obs(faults=frozenset({"no_digest"}))), IntakeStatus.REJECTED)

    def test_15_private_repo_held_or_rejected(self):
        self.assertIn(status(obs(faults=frozenset({"private"}))),
                      (IntakeStatus.REJECTED, IntakeStatus.HELD_FOR_FOUNDER_REVIEW))

    def test_16_secret_file_held(self):
        self.assertEqual(status(obs(faults=frozenset({"secret_file"}))), IntakeStatus.HELD_FOR_FOUNDER_REVIEW)

    def test_17_submodule_held(self):
        self.assertEqual(status(obs(faults=frozenset({"submodule"}))), IntakeStatus.HELD_FOR_FOUNDER_REVIEW)

    def test_18_lfs_held(self):
        self.assertEqual(status(obs(faults=frozenset({"lfs"}))), IntakeStatus.HELD_FOR_FOUNDER_REVIEW)

    def test_19_no_provider_specific_leak(self):
        o = obs()
        st, reasons, decisions = decide_intake(o, LIM)
        m = IntakeManifest(request_id="r1", normalized_url=o.normalized_url, exact_commit=o.exact_commit,
                           snapshot_sha256=o.snapshot_sha256, file_count=o.file_count, byte_count=o.byte_count,
                           status=st, refusal_reasons=reasons, policy_decisions=decisions)
        names = {f.name for f in dataclasses.fields(m)}
        self.assertEqual(names, {"request_id", "normalized_url", "exact_commit", "snapshot_sha256",
                                 "file_count", "byte_count", "status", "refusal_reasons", "policy_decisions"})
        blob = repr(m).lower()
        for leak in ("octokit", "github_api", "rate_limit", "provider_raw", "access_token"):
            self.assertNotIn(leak, blob)

    def test_20_provider_cannot_accept(self):
        with self.assertRaises(AuthorityError):
            FakeSourceProvider().attempt_self_acceptance("r1")
        self.assertTrue(Acceptance(request_id="r1", issued_by="founder", accepted=True).accepted)

    def test_21_incomplete_evidence_unknown_or_rejected(self):
        self.assertEqual(evaluate_evidence_completeness(obs(faults=frozenset({"no_commit"}))), IntakeStatus.UNKNOWN)
        self.assertEqual(evaluate_evidence_completeness(None), IntakeStatus.REJECTED)
        self.assertEqual(status(obs(faults=frozenset({"no_commit"}))), IntakeStatus.REJECTED)

    def test_22_deterministic_manifest(self):
        o1, o2 = obs(), obs()
        self.assertEqual(o1, o2)                    # deterministic observation
        st1 = decide_intake(o1, LIM)
        st2 = decide_intake(o2, LIM)
        self.assertEqual(st1, st2)                  # deterministic policy


if __name__ == "__main__":
    unittest.main(verbosity=2)
