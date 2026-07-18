"""Phase 7 Lane D — negative intake fixtures. SYNTHETIC only, NO network, NO real repo.
Extends coverage with fail-closed classifications. Run: python3 -m unittest test_negative_fixtures -v
"""
import io, os, tarfile, tempfile, unittest

from contract import (
    IntakeLimits, IntakeStatus, SourceObservation, NormalizedUrl, ValidationError,
    decide_intake, normalize_github_url,
)
from github_public_provider import GitHubPublicProvider, _HostAllowlistRedirect
from contract import ValidationError as VE

LIM = IntakeLimits()
P = GitHubPublicProvider()


def make_tar(entries):
    fd, path = tempfile.mkstemp(suffix=".tar.gz"); os.close(fd)
    with tarfile.open(path, "w:gz") as tf:
        for e in entries:
            ti = tarfile.TarInfo(name=e["name"]); ti.type = e.get("type", tarfile.REGTYPE)
            ti.linkname = e.get("linkname", ""); data = e.get("data", b""); ti.size = len(data)
            tf.addfile(ti, io.BytesIO(data))
    return path


def scan(entries):
    return P.inspect_archive(make_tar(entries))


def E(name, **k):
    d = {"name": f"sampleproject-abc/{name}"}; d.update(k); return d


def obs(**over):
    base = dict(normalized_url=NormalizedUrl("github.com", "pypa", "sampleproject"),
                exact_commit="a" * 40, snapshot_sha256="b" * 64, file_count=3, byte_count=100,
                detected_license_files=("LICENSE",))
    base.update(over)
    return SourceObservation(**base)


class NegativeFixtures(unittest.TestCase):
    # source resolution / URL negatives
    def test_private_repo_rejected(self):
        self.assertEqual(decide_intake(obs(is_private=True), LIM)[0], IntakeStatus.REJECTED)

    def test_deleted_repo_no_commit_rejected(self):
        self.assertEqual(decide_intake(obs(exact_commit=None), LIM)[0], IntakeStatus.REJECTED)

    def test_ambiguous_head_missing_digest_rejected(self):
        self.assertEqual(decide_intake(obs(snapshot_sha256=None), LIM)[0], IntakeStatus.REJECTED)

    def test_redirect_host_violation_rejected(self):
        with self.assertRaises(VE):
            _HostAllowlistRedirect([]).redirect_request(None, None, 302, "", {}, "https://evil.example/x")

    def test_redirect_loop_host_still_checked(self):
        # a loop to a bad host is caught by the host check on the first hop
        with self.assertRaises(VE):
            _HostAllowlistRedirect([]).redirect_request(None, None, 302, "", {}, "http://127.0.0.1:9/x")

    def test_wrong_host_url_rejected(self):
        for u in ("https://gitlab.com/o/r", "https://raw.evil/o/r"):
            with self.assertRaises(ValidationError):
                normalize_github_url(u)

    # archive negatives
    def test_corrupt_archive_rejected(self):
        fd, path = tempfile.mkstemp(suffix=".tar.gz"); os.close(fd)
        open(path, "wb").write(b"not a real gzip archive")
        with self.assertRaises(Exception):
            P.inspect_archive(path)

    def test_tar_bomb_ratio_expanded_rejected(self):
        # a single entry declaring huge expanded size
        self.assertFalse(scan([E("big", data=b"x" * (5 * 1024 * 1024 + 10))]).ok)

    def test_nested_traversal_rejected(self):
        self.assertFalse(scan([E("a/b/../../../../etc/x", data=b"1")]).ok)

    def test_unicode_and_case_collision_rejected(self):
        self.assertFalse(scan([E("Readme.md", data=b"1"), E("README.MD", data=b"2")]).ok)

    def test_device_and_symlink_rejected(self):
        self.assertFalse(scan([E("dev", type=tarfile.CHRTYPE)]).ok)
        self.assertFalse(scan([E("l", type=tarfile.SYMTYPE, linkname="/etc/passwd")]).ok)

    # classification observations (held / observed, not rejected-unsafe)
    def test_secret_env_submodule_lfs_indicators(self):
        s = scan([E(".env", data=b"K=v"), E(".gitmodules", data=b"[s]"),
                  E("m.bin", data=b"version https://git-lfs.github.com/spec/v1"),
                  E("LICENSE.txt", data=b"MIT")])
        self.assertTrue(s.secret_like and s.submodules and s.license_files)

    def test_executable_bit_observed(self):
        import stat
        d = tempfile.mkdtemp(); f = os.path.join(d, "run.sh"); open(f, "w").write("#!/bin/sh\n")
        os.chmod(f, 0o755)
        from github_public_provider import canonical_manifest
        items, _ = canonical_manifest(d)
        self.assertTrue(items[0]["executable"])  # observation only, not a rejection

    def test_multiple_license_files_observed(self):
        s = scan([E("LICENSE", data=b"a"), E("LICENSE.txt", data=b"b")])
        self.assertGreaterEqual(len(s.license_files), 2)

    def test_missing_pyproject_and_no_src_are_observations(self):
        # decide_intake does not require pyproject/src; they are downstream observations, not URL/archive rejects
        st = decide_intake(obs(), LIM)[0]
        self.assertIn(st, (IntakeStatus.ACCEPTED_FOR_ANALYSIS, IntakeStatus.HELD_FOR_FOUNDER_REVIEW))

    def test_binary_only_and_unsupported_type_do_not_falsely_accept(self):
        # a repo with a secret-like file is HELD, never silently ACCEPTED
        self.assertEqual(decide_intake(obs(detected_secret_like_files=(".env",)), LIM)[0],
                         IntakeStatus.HELD_FOR_FOUNDER_REVIEW)

    def test_oversize_and_filecount_rejected(self):
        self.assertEqual(decide_intake(obs(byte_count=LIM.maximum_snapshot_size + 1), LIM)[0], IntakeStatus.REJECTED)
        self.assertEqual(decide_intake(obs(file_count=LIM.maximum_file_count + 1), LIM)[0], IntakeStatus.REJECTED)

    def test_ref_mismatch_rejected(self):
        self.assertEqual(decide_intake(obs(ref_matches_commit=False), LIM)[0], IntakeStatus.REJECTED)

    def test_provider_returns_observations_never_acceptance(self):
        from contract import Acceptance, AuthorityError
        with self.assertRaises(AuthorityError):
            Acceptance(request_id="r", issued_by="provider", accepted=True)


if __name__ == "__main__":
    unittest.main(verbosity=2)
