"""Isolated tests for the Phase-4.1 patch compatibility guard (Phase 7, Lane C). No runtime."""
import unittest
from patch_compatibility import (
    evaluate, verify_bound_version, verify_source_context, verify_post_application,
    VersionMismatch, SourceDrift, PartialApplication, ForbiddenBinding, sha256_text,
)

GOOD_SRC = {
    "services/docker/port_allocator.py": 'x=1\nDOCKER_PUBLISH_HOST = "0.0.0.0"\ny=2\n',
    "services/docker/networking.py": '  "44772": ("0.0.0.0", host_execd_port),\n  "8080": ("0.0.0.0", host_http_port),\n',
}
GOOD_PATCHED = {
    "services/docker/port_allocator.py": 'x=1\nDOCKER_PUBLISH_HOST = "127.0.0.1"\ny=2\n',
    "services/docker/networking.py": '  "44772": ("127.0.0.1", host_execd_port),  # loopback\n  "8080": ("127.0.0.1", host_http_port),  # loopback\n',
}


class PatchGuardTests(unittest.TestCase):
    def test_01_happy_path(self):
        v = evaluate("0.2.1", sha256_text("patch"), GOOD_SRC, GOOD_PATCHED)
        self.assertTrue(v.applicable)
        self.assertTrue(v.requires_runtime_retest)

    def test_02_wrong_version_fails_closed(self):
        with self.assertRaises(VersionMismatch):
            verify_bound_version("0.2.2")
        with self.assertRaises(VersionMismatch):
            evaluate("0.3.0", "x", GOOD_SRC, GOOD_PATCHED)

    def test_03_source_drift_fails_closed(self):
        drifted = dict(GOOD_SRC)
        drifted["services/docker/port_allocator.py"] = 'DOCKER_PUBLISH_HOST = os.environ["X"]\n'
        with self.assertRaises(SourceDrift):
            evaluate("0.2.1", "x", drifted, GOOD_PATCHED)

    def test_04_partial_application_rejected(self):
        partial = dict(GOOD_PATCHED)
        partial["services/docker/networking.py"] = '  "44772": ("127.0.0.1", host_execd_port),\n'  # 8080 missing
        with self.assertRaises(PartialApplication):
            evaluate("0.2.1", "x", GOOD_SRC, partial)

    def test_05_residual_0000_rejected(self):
        bad = dict(GOOD_PATCHED)
        bad["services/docker/networking.py"] = ('  "44772": ("127.0.0.1", host_execd_port),\n'
                                                '  "8080": ("0.0.0.0", host_http_port),\n')
        with self.assertRaises((ForbiddenBinding, PartialApplication)):
            evaluate("0.2.1", "x", GOOD_SRC, bad)

    def test_06_never_silent_fallback(self):
        # a governed line still on 0.0.0.0 must raise, never pass
        with self.assertRaises(ForbiddenBinding):
            verify_post_application("port_allocator.py", 'DOCKER_PUBLISH_HOST = "0.0.0.0"\nDOCKER_PUBLISH_HOST = "127.0.0.1"\n')

    def test_07_patch_sha_recorded(self):
        v = evaluate("0.2.1", "deadbeef", GOOD_SRC, GOOD_PATCHED)
        self.assertEqual(v.patch_sha256, "deadbeef")


if __name__ == "__main__":
    unittest.main(verbosity=2)
