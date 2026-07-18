"""Regression: a qualification_run_id and a driver_lease_run_id are distinct namespaces and cannot be
silently exchanged (prevents cross-run evidence binding)."""
import re, unittest
QUAL = re.compile(r"^[a-z0-9-]+-\d{8}T\d{6}Z$")     # timestamped intent slug
DRIVER = re.compile(r"^run_[0-9a-f-]{36}$")          # UUID-prefixed driver/lease id
def classify(v):
    if QUAL.match(v): return "qualification_run_id"
    if DRIVER.match(v): return "driver_lease_run_id"
    return "unknown"
class RunIdNamespaces(unittest.TestCase):
    def test_qual(self): self.assertEqual(classify("integrated-8h-rerun-20260717T173028Z"),"qualification_run_id")
    def test_driver(self): self.assertEqual(classify("run_f3124ace-e39f-4d52-9e46-1dc5b2f1e1b1"),"driver_lease_run_id")
    def test_not_exchangeable(self):
        q="integrated-8h-rerun-20260717T173028Z"; d="run_f3124ace-e39f-4d52-9e46-1dc5b2f1e1b1"
        self.assertNotEqual(classify(q),classify(d))
        self.assertFalse(QUAL.match(d)); self.assertFalse(DRIVER.match(q))  # cannot cross-match
    def test_manifest_requires_both_distinct(self):
        man={"qualification_run_id":"integrated-8h-rerun-20260717T173028Z","driver_lease_run_id":"run_f3124ace-e39f-4d52-9e46-1dc5b2f1e1b1"}
        self.assertEqual(classify(man["qualification_run_id"]),"qualification_run_id")
        self.assertEqual(classify(man["driver_lease_run_id"]),"driver_lease_run_id")
        self.assertNotEqual(man["qualification_run_id"],man["driver_lease_run_id"])
if __name__=="__main__": unittest.main(verbosity=2)
