# Evidence Pack Versioning and Migration

**Status:** COMPATIBILITY_PREPARED (design). Phase 7.1 Lane F. Executable counterpart:
`build_evidence_pack` / `validate_pack_schema` in `prototypes/project_adoption/adoption_contract.py`
(tests 08, 09, 16, 17, 18).

## Canonical schema version
`CORE_SCHEMA_VERSION = 1.0.0` (semantic: MAJOR.MINOR.PATCH). The canonical JSON is the single
authority; MD/HTML/PDF/sha256/zip are derived from it.

## Compatibility rules
- **Backward compatibility:** a consumer on MAJOR *N* reads any `N.x.y` pack. Same-major packs
  are always readable.
- **Additive-field policy (MINOR/PATCH):** new **optional** top-level or extension fields are
  additive and MUST NOT change the meaning of any existing field. Additive changes bump MINOR.
- **Breaking-change policy (MAJOR):** removing a field, changing a field's meaning, or changing a
  core claim's semantics bumps MAJOR and REQUIRES a migration note. Consumers **fail closed** on
  an unrecognized MAJOR (test 17/18).
- **Migration requirements:** every MAJOR bump ships a documented migration (old→new field map)
  and a validator update. No silent reinterpretation.

## Validator behavior
`validate_pack_schema`: missing `schema_version` → fail closed; different MAJOR → fail closed;
same MAJOR with unknown additive fields → **preserved** (not dropped, not trusted as core).
`build_evidence_pack`: refuses (raises) without an exact version + a canonical snapshot digest,
and rejects any extension key that collides with a core claim key.

## UNKNOWN behavior for old packets
A packet whose MAJOR is unknown to the reader is treated as `UNKNOWN` and fails closed — it is
never partially trusted. A same-major packet missing an expected optional field yields `UNKNOWN`
for that field only, never a fabricated value.

## Extension namespaces
- **Project-adapter namespace:** `extensions.<project_type>` (e.g. `extensions.python_public`,
  `extensions.android`). Owns project-specific observations.
- **Provider-adapter namespace:** `extensions.<provider>` (e.g. `extensions.opensandbox`). Owns
  sandbox/source provider specifics.
- **Rule (enforced in code):** no namespaced field may use a **core claim key**
  (`compileability, build, tests, security, production_readiness, network_isolation,
  docker_socket, host_mounts, teardown, snapshot_deletion, runtime_destruction`) — an attempt
  raises `AuthorityError` (test 09). A project-specific field can never alter the meaning of a
  core claim (test 16: the core keys are identical across project types).

## Reserved-for-later fields (declared, not yet populated)
- `checker_metadata` — independent checker identity + verdict linkage.
- `witness_metadata` — founder witness linkage (set only by the founder).
- `signature` / `tamper_evidence` — reserved for a later tamper-evident-ledger stage
  (PLANNED; NOT YET IMPLEMENTED — no signing occurs in Phase 7.1).

## Export compatibility
MD/HTML/PDF/sha256/zip renderers consume only the canonical JSON. Adding an extension namespace
MUST NOT break a renderer: renderers ignore unknown namespaces and render the core claims plus a
generic "project-specific observations" section. The sha256 manifest always covers every emitted
file.

## Required rule (restated)
A future project uses the **same canonical Evidence Pack core** while adding project-specific
observations under a namespaced extension field. No project-specific field alters the meaning of a
core claim.
