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


class GitHubProviderTests(unittest.TestCase):
    """Phase-6 source-provider tests. Synthetic tar archives only — NO network."""

    def _make_tar(self, entries):
        import tarfile, tempfile, io, os
        fd, path = tempfile.mkstemp(suffix=".tar.gz"); os.close(fd)
        with tarfile.open(path, "w:gz") as tf:
            for e in entries:
                ti = tarfile.TarInfo(name=e["name"])
                ti.type = e.get("type", tarfile.REGTYPE)
                ti.size = e.get("size", 0)
                ti.linkname = e.get("linkname", "")
                data = e.get("data", b"")
                ti.size = len(data)
                tf.addfile(ti, io.BytesIO(data))
        return path

    def _scan(self, entries):
        from github_public_provider import GitHubPublicProvider
        return GitHubPublicProvider().inspect_archive(self._make_tar(entries))

    def E(self, name, **k):
        d = {"name": f"sampleproject-abc/{name}"}; d.update(k); return d

    def test_p6_01_normalize_fixture_url(self):
        n = normalize_github_url("https://github.com/pypa/sampleproject")
        self.assertEqual((n.owner, n.repository), ("pypa", "sampleproject"))

    def test_p6_02_redirect_to_wrong_host_rejected(self):
        from github_public_provider import _HostAllowlistRedirect
        from contract import ValidationError as VE
        h = _HostAllowlistRedirect([])
        with self.assertRaises(VE):
            h.redirect_request(None, None, 302, "", {}, "https://evil.example/x")
        # allowlisted host does not raise on the host check (will call super -> returns a Request or None)
        try:
            h.redirect_request(__import__("urllib.request", fromlist=["Request"]).Request("https://github.com/a"),
                               None, 302, "", {}, "https://codeload.github.com/a/b/tar.gz/x")
        except Exception as e:
            self.assertNotIn("non-allowlisted", str(e))

    def test_p6_03_oversized_expanded_rejected(self):
        scan = self._scan([self.E("big.bin", data=b"x" * (5 * 1024 * 1024 + 1))])
        self.assertFalse(scan.ok)

    def test_p6_04_excessive_file_count_rejected(self):
        scan = self._scan([self.E(f"f{i}.txt", data=b"x") for i in range(1001)])
        self.assertFalse(scan.ok)

    def test_p6_05_path_traversal_rejected(self):
        self.assertFalse(self._scan([self.E("../escape", data=b"x")]).ok)

    def test_p6_06_absolute_path_rejected(self):
        import tarfile
        self.assertFalse(self._scan([{"name": "/etc/evil", "data": b"x"}]).ok)

    def test_p6_07_windows_drive_rejected(self):
        self.assertFalse(self._scan([{"name": "C:\\evil", "data": b"x"}]).ok)

    def test_p6_08_symlink_rejected(self):
        import tarfile
        self.assertFalse(self._scan([self.E("link", type=tarfile.SYMTYPE, linkname="../../etc/passwd")]).ok)

    def test_p6_09_hardlink_rejected(self):
        import tarfile
        self.assertFalse(self._scan([self.E("hl", type=tarfile.LNKTYPE, linkname="README")]).ok)

    def test_p6_10_device_fifo_rejected(self):
        import tarfile
        self.assertFalse(self._scan([self.E("dev", type=tarfile.CHRTYPE)]).ok)
        self.assertFalse(self._scan([self.E("fifo", type=tarfile.FIFOTYPE)]).ok)

    def test_p6_11_duplicate_and_case_collision(self):
        dup = self._scan([self.E("a.txt", data=b"1"), self.E("a.txt", data=b"2")])
        self.assertFalse(dup.ok)
        cc = self._scan([self.E("Readme.md", data=b"1"), self.E("README.MD", data=b"2")])
        self.assertFalse(cc.ok)

    def test_p6_12_submodule_and_lfs_and_secret_indicators(self):
        s = self._scan([self.E(".gitmodules", data=b"[submodule]"), self.E("id_rsa", data=b"KEY"),
                        self.E("LICENSE.txt", data=b"MIT")])
        self.assertIn(".gitmodules", s.submodules[0] if s.submodules else "")
        self.assertTrue(s.secret_like)
        self.assertTrue(s.license_files)

    def test_p6_13_canonical_manifest_deterministic(self):
        import tempfile, os
        from github_public_provider import canonical_manifest
        d = tempfile.mkdtemp()
        os.makedirs(os.path.join(d, "src"), exist_ok=True)
        open(os.path.join(d, "src", "a.py"), "w").write("print(1)\n")
        open(os.path.join(d, "b.txt"), "w").write("hello")
        m1, s1 = canonical_manifest(d)
        m2, s2 = canonical_manifest(d)
        self.assertEqual(s1, s2)
        self.assertEqual([i["path"] for i in m1], ["b.txt", "src/a.py"])

    def test_p6_14_provider_version_present(self):
        from github_public_provider import GitHubPublicProvider
        self.assertTrue(GitHubPublicProvider().version)


if __name__ == "__main__":
    unittest.main(verbosity=2)
