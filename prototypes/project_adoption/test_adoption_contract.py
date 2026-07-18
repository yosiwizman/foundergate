"""Synthetic contract tests for the FounderGate project-adoption contract (Lane F).

Proves project-neutrality, fixture/core separation, adapter authority boundaries, Evidence
Pack versioning + namespacing, and Android/AKIOR-like NOT_AUTHORIZED fail-closed behavior.
No AKIOR import, no network, no repository execution. Run: python3 -m pytest (or unittest).
"""
import unittest

from adoption_contract import (
    CORE_SCHEMA_VERSION, CORE_CLAIM_KEYS, ClaimLabel, ProjectType,
    AdoptionError, SchemaVersionError, AuthorityError,
    Acceptance, ExactVersionIdentity, ImmutableSnapshotIdentity, ProjectDescriptor,
    IntakeRequest, IntakeObservation, RuntimeRecoveryState,
    PythonPublicFixtureAdapter, GenericWebProjectAdapter, AndroidAkiorLikeAdapter,
    AUTHORIZED_FIXTURES, plan_checks, build_evidence_pack, validate_pack_schema,
)

EV = ExactVersionIdentity("git-commit", "621e4974ca25ce531773def586ba3ed8e736b3fc")
SNAP = ImmutableSnapshotIdentity("fd8597e4", "649ecb02")
OBS = IntakeObservation("https://github.com/pypa/sampleproject", EV, SNAP)


def _pack(ptype=ProjectType.PYTHON_PUBLIC, core=None, ext=None):
    return build_evidence_pack(schema_version=CORE_SCHEMA_VERSION, run_id="sc-0bc1b04f",
                               project_type=ptype, exact_version=EV, snapshot=SNAP,
                               core_claims=core or {"compileability": "OBSERVED"}, extensions=ext)


class AdoptionContract(unittest.TestCase):
    # 1. core run state is project-neutral
    def test_01_core_run_state_project_neutral(self):
        st = RuntimeRecoveryState("sc-1", "RUNNING")
        self.assertEqual(set(st.__dataclass_fields__), {"run_id", "state"})  # no project fields

    # 2. fixture URL is configuration, not core logic
    def test_02_fixture_is_configuration(self):
        self.assertIn("https://github.com/pypa/sampleproject", AUTHORIZED_FIXTURES)
        import adoption_contract as m, inspect
        # the generic core (plan_checks/build_evidence_pack) must not hardcode the fixture string
        self.assertNotIn("pypa/sampleproject", inspect.getsource(m.plan_checks))
        self.assertNotIn("pypa/sampleproject", inspect.getsource(m.build_evidence_pack))

    # 3. exact-version identity required
    def test_03_exact_version_required(self):
        with self.assertRaises(AdoptionError):
            build_evidence_pack(schema_version=CORE_SCHEMA_VERSION, run_id="r", project_type=ProjectType.PYTHON_PUBLIC,
                                exact_version=None, snapshot=SNAP, core_claims={})

    # 4. immutable snapshot identity required
    def test_04_snapshot_required(self):
        with self.assertRaises(AdoptionError):
            build_evidence_pack(schema_version=CORE_SCHEMA_VERSION, run_id="r", project_type=ProjectType.PYTHON_PUBLIC,
                                exact_version=EV, snapshot=None, core_claims={})

    # 5-7. adapters/providers cannot issue founder acceptance
    def test_05_project_adapter_cannot_accept(self):
        with self.assertRaises(AuthorityError):
            PythonPublicFixtureAdapter().attempt_accept("sc-1")

    def test_06_source_provider_cannot_accept(self):
        with self.assertRaises(AuthorityError):
            Acceptance(run_id="sc-1", issued_by="source-provider", accepted=True)

    def test_07_sandbox_provider_cannot_accept(self):
        with self.assertRaises(AuthorityError):
            Acceptance(run_id="sc-1", issued_by="sandbox-provider", accepted=True)
        # only the founder can
        self.assertTrue(Acceptance(run_id="sc-1", issued_by="founder", accepted=True).accepted)

    # 8. project-specific fields stay namespaced
    def test_08_project_fields_namespaced(self):
        pack = _pack(ext={"python_public": {"pyproject_present": True}})
        self.assertIn("python_public", pack["extensions"])
        self.assertNotIn("pyproject_present", pack["claims"])  # not leaked into core claims

    # 9. project-specific fields cannot overwrite core claims
    def test_09_extension_cannot_overwrite_core(self):
        with self.assertRaises(AuthorityError):
            _pack(ext={"android": {"security": "PROVEN"}})  # 'security' is a core claim key

    # 10. unsupported project type -> HELD
    def test_10_unsupported_type_held(self):
        d = ProjectDescriptor(ProjectType.GENERIC_WEB, authorization=ClaimLabel.PLANNED)
        plan = plan_checks(d, PythonPublicFixtureAdapter(), OBS)  # python adapter, web type
        self.assertEqual(plan.status, ClaimLabel.HELD)  # no module applies to web

    # 11. missing adapter -> HELD or UNKNOWN
    def test_11_missing_adapter_held(self):
        d = ProjectDescriptor(ProjectType.PYTHON_PUBLIC, authorization=ClaimLabel.PLANNED)
        self.assertIn(plan_checks(d, None, OBS).status, {ClaimLabel.HELD, ClaimLabel.UNKNOWN})

    # 12. unsupported check module does not run
    def test_12_unsupported_module_excluded(self):
        d = ProjectDescriptor(ProjectType.GENERIC_WEB, authorization=ClaimLabel.PLANNED)
        plan = plan_checks(d, GenericWebProjectAdapter(), OBS)
        self.assertTrue(all(ProjectType.GENERIC_WEB in m.applies_to for m in plan.modules))

    # 13. python compileability not applied to android descriptor
    def test_13_compileability_not_on_android(self):
        d = ProjectDescriptor(ProjectType.ANDROID, authorization=ClaimLabel.NOT_AUTHORIZED)
        plan = plan_checks(d, AndroidAkiorLikeAdapter(), OBS)
        self.assertNotIn("compileability", [m.key for m in plan.modules])

    # 14. android descriptor does not imply gradle support
    def test_14_android_no_gradle(self):
        mods = [m.key for m in AndroidAkiorLikeAdapter().check_modules()]
        self.assertEqual(mods, [])  # no gradle/device/build module exists

    # 15. AKIOR-like descriptor remains NOT_AUTHORIZED
    def test_15_akior_like_not_authorized(self):
        d = ProjectDescriptor(ProjectType.ANDROID, authorization=ClaimLabel.NOT_AUTHORIZED)
        self.assertEqual(plan_checks(d, AndroidAkiorLikeAdapter(), OBS).status, ClaimLabel.NOT_AUTHORIZED)

    # 16. Evidence Pack core identical across project types
    def test_16_pack_core_identical(self):
        keys = lambda p: set(p.keys()) - {"project_type", "extensions"}
        self.assertEqual(keys(_pack(ProjectType.PYTHON_PUBLIC)), keys(_pack(ProjectType.GENERIC_WEB)))
        self.assertEqual(set(_pack(ProjectType.PYTHON_PUBLIC)["claims"]),
                         set(_pack(ProjectType.GENERIC_WEB)["claims"]))

    # 17. schema-version mismatch fails closed
    def test_17_schema_mismatch_fails_closed(self):
        with self.assertRaises(SchemaVersionError):
            build_evidence_pack(schema_version="9.9.9", run_id="r", project_type=ProjectType.PYTHON_PUBLIC,
                                exact_version=EV, snapshot=SNAP, core_claims={})
        with self.assertRaises(SchemaVersionError):
            validate_pack_schema({"schema_version": "2.0.0"})  # different major
        with self.assertRaises(SchemaVersionError):
            validate_pack_schema({})  # missing

    # 18. unknown future fields preserved (additive) or rejected per version policy
    def test_18_future_fields_policy(self):
        pack = _pack()
        pack["future_reserved_signature"] = "abc"       # additive, same major
        validate_pack_schema(pack)                        # preserved, no raise
        self.assertEqual(pack["future_reserved_signature"], "abc")
        pack["schema_version"] = "2.0.0"
        with self.assertRaises(SchemaVersionError):       # breaking major -> fail closed
            validate_pack_schema(pack)

    # 19. no project-specific code leaks into the core authority / evidence layers
    #     (the PLANNER intentionally names ANDROID as a fail-closed guard, so it is excluded here;
    #     the acceptance-authority class and the evidence-pack core must be fully type-agnostic).
    def test_19_no_project_code_in_authority(self):
        import inspect
        for obj in (Acceptance, build_evidence_pack):
            src = inspect.getsource(obj).lower()
            for token in ("python", "android", "gradle", "pyproject", "akior", "sampleproject"):
                self.assertNotIn(token, src)

    # 20. no private repository support is implied
    def test_20_private_repo_held(self):
        self.assertEqual(IntakeRequest("https://github.com/x/y").visibility, "public")
        priv = IntakeObservation("https://github.com/x/y", EV, SNAP, is_private=True)
        d = ProjectDescriptor(ProjectType.PYTHON_PUBLIC, authorization=ClaimLabel.PLANNED)
        self.assertEqual(plan_checks(d, PythonPublicFixtureAdapter(), priv).status, ClaimLabel.HELD)


if __name__ == "__main__":
    unittest.main(verbosity=2)
