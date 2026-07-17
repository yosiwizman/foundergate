# OpenSandbox Phase 6 — Independent Checker Report (public-repo intake runtime spike)

**Role / independence.** I am the INDEPENDENT CHECKER for Phase 6. I did not build this spike. This review is adversarial and read-only except for this single report file. The disposable VM was already destroyed and the source snapshot deleted before this review; I verified DURABLE evidence and reproducible-from-disk facts only. I did not modify FounderGate main, did not merge/close/ready any PR, did not contact the M1 or its soak, did not create/start any VM/runtime, did not run Docker/OpenSandbox/Lima, and did not clone a private repo or use credentials.

- Checker date: 2026-07-17
- Checker host: `Mac16,11` / Apple M4 Pro / arm64 (verified live)
- Phase-6 worktree: `/Users/yosiwizman/Projects/foundergate-wt-opensandbox-public-repo-phase6`
- Branch: `spike/opensandbox-public-repo-intake-phase6` @ HEAD `e1147c5` (== base; deliverables are uncommitted working-tree changes)
- Base: PR#156 head `e1147c50eb9b7f3bef17c6760556a0f52964df13`

## Check-by-check result

| # | Check | Result | Command / artifact |
|---|-------|--------|--------------------|
| 1 | Host Mac16,11 / Apple M4 Pro | PASS | `sysctl hw.model` → `Mac16,11`; `machdep.cpu.brand_string` → `Apple M4 Pro`; `uname -m` → `arm64` |
| 2 | Phase-6 branch descends from `e1147c5` | PASS | `git merge-base --is-ancestor e1147c5 HEAD` → yes (HEAD == e1147c5) |
| 3 | main unchanged (e1ca1989, clean) | PASS | `git ls-remote origin refs/heads/main` → `e1ca1989…`; main worktree HEAD `e1ca1989…`, `status --porcelain` empty |
| 4 | PR#151–156 OPEN/DRAFT | PASS | `gh pr view` each → OPEN, draft=True; PR#156 head `e1147c50eb9b` |
| 5 | Only allowed files changed; `fake_source_provider.py` UNCHANGED | PASS (1 INFO) | `git status --porcelain` + `git diff --stat e1147c5 -- fake_source_provider.py` (empty). See F-1 (`__pycache__/` untracked). |
| 6 | Exact commit bound; HEAD vs recorded 621e4974 | PASS | `git ls-remote https://github.com/pypa/sampleproject HEAD` → `621e4974ca25ce531773def586ba3ed8e736b3fc` == recorded `exact_commit`. Exact match; acquisition evidence internally consistent (binding block reuses same commit). |
| 7 | Archive URL is codeload tar.gz/<commit>; `redirect_to_other_host` False | PASS | acquisition `redirect_chain` = `https://codeload.github.com/pypa/sampleproject/tar.gz/621e4974…`; runtime_evidence `redirect_to_other_host: false` |
| 8 | Archive sha256 fd8597e4; final_host codeload | PASS | acquisition `archive_sha256` = `fd8597e4d351a9fd42007f48339dc93ee6469d8555fd0ff24906c69905357c01`; `final_host` = `codeload.github.com` |
| 9 | Canonical manifest sha256 649ecb02; 12 files; license LICENSE.txt | PASS | acquisition `canonical_manifest_sha256` = `649ecb02…`, `manifest_file_count` 12, `license_files` [`LICENSE.txt`] |
| 10 | In-sandbox manifest == Pro manifest | PASS | verifier_result `manifest_recompute.matches_pro_manifest` true, sha `649ecb02…`; `post_cleanup.still_matches_pro_manifest` true |
| 11 | NO Pro-side repo execution | PASS | `github_public_provider.py`: only `git ls-remote` (l.98) + allowlisted urllib download (l.107–136) + getmembers inspect (no run) + `extract_safe` writes files only (no exec). `runtime_driver.py`: verify path never imports/runs repo code. |
| 12 | Compileability-only (no build/test/script) | PASS | verifier_result classification `COMPILEABILITY_OBSERVED`, `compileall.exit_code` 0, `not_claimed` = [APPLICATION_WORKS, BUILD_PASSED, TESTS_PASSED, SAFE, PRODUCTION_READY]. grep of `runtime_driver.py`: only exec on repo src is `compileall` (l.135); no setup.py/pip/build/pytest/tox/entry_points. |
| 13 | Port binding GUARD_PASS; sidecar 127.0.0.1; no 0.0.0.0 | PASS | orchestrate_result `port_binding.guard` = `GUARD_PASS`; 18080/44772/8080 all `HostIp:127.0.0.1`; no `0.0.0.0` present |
| 14 | Docker socket blocked | PASS | runtime_evidence `authority.docker_socket` = `SOCKET_ABSENT / FILE_ABSENT`, `docker_api` = `NO_DOCKER_API (FileNotFoundError)`, `docker_cli` = `NO_DOCKER_CLI` |
| 15 | No host mounts / no macOS path | PASS | runtime_evidence `authority.macos_path` = `NO_USERS`, `host_mounts` = `NO_HOST_MOUNTS`; lima yaml `mounts: []`, `networks: []`, `portForwards: []` |
| 16 | Loopback binding reproven in server log | PASS | `server.stderr.log`: `grep -c 0.0.0.0` = 0; `Uvicorn running on http://127.0.0.1:8090` |
| 17 | Default-deny egress | PASS | runtime_evidence `egress`: default deny, empty allowlist, example.com DNS+HTTPS DENIED, direct IPv4 1.1.1.1 & IPv6 DENIED, nft policy drop + drop 853 |
| 18 | Provider-neutral evidence | PASS | runtime_evidence `output_digest_proof.no_provider_field_leak` true; `authority.founder_acceptance_field` = absent; unit test_19 (no provider-specific leak) passes |
| 19 | Sandbox teardown | PASS | ledger P6-007 `command_summary` = `DELETE 204/GET 404 …`; transcript l.38 `DELETE … → 204; GET → 404` |
| 20 | Source-snapshot deletion | PASS | `ls /tmp/foundergate-public-repo-phase6-p6run20260717` → No such file or directory |
| 21 | VM destruction | PASS | `limactl list` → "No instance found"; no `foundergate-opensandbox-phase6` |
| 22 | M1 non-contact | PASS | runtime_evidence `cross_machine.m1_contacted` false, `m1_state_source` = `FOUNDER_RELAY`; no SSH/ping evidence |
| 23 | Remote main unchanged during spike | PASS | recovery-state checkpoints preflight/post_acquisition/post_vm_destruction all `e1ca1989…`; live `git ls-remote` now still `e1ca1989…` |
| 24 | No self-hosted runner automation | PASS | `gh api repos/yosiwizman/foundergate/actions/runners` → `total_count: 0` |
| 25 | Prototype tests 36 OK | PASS | `python3 -m unittest test_contract -v` → `Ran 36 tests … OK` |
| 26 | Digest recompute of exported evidence | PASS | `shasum -a 256` of verifier_result.json = `9a73ce99…`, config.toml = `6ff7334e…`, orchestrate_result.json = `42b45b60…`, server.stderr.log = `40c51a35…` — all equal runtime_evidence `evidence_export_sha256` |
| 27 | No adoption/production/"secure"/customer-execution claim | PASS | RESULT.md + RUNTIME_EVIDENCE scan: every match is an explicit NEGATION/disclaimer ("Not called 'secure'", "not customer use… adoption, production integration", `*_AUTHORIZED: NO`, `secure_runtime: NOT configured`) |

## Falsification attempts

- **(a) Could repository code have executed?** FALSIFICATION FAILED (good). Full read of `runtime_driver.py`: the only repo-touching execution is `subprocess.run([sys.executable, "-m", "compileall", "-q", src])` (l.135); byte-compilation does not import/run modules. The other `bash -c` calls (l.206/212) run `docker ps` / `docker inspect` for the port-binding guard on the VM, not repo code. In-sandbox `run()` invocations are `mkdir`, `sha256sum`, and `python3 runtime_driver.py verify` (harness). No setup.py/pip/build/pytest/tox/entry_point/Makefile/CI touched. `github_public_provider.py` only resolves the commit, downloads the tarball over a host-allowlisted opener, inspects members, and safely extracts to disk — it never executes repo contents.
- **(b) Is the manifest match real?** FALSIFICATION FAILED (good). `649ecb02…` appears identically in acquisition evidence (`canonical_manifest_sha256`), in the in-sandbox `manifest_recompute.sha256`, in `post_cleanup_manifest`, and in the orchestrate `insandbox_upload_digests` `sha256sum` line — independently recomputed inside the sandbox and proven equal to the Pro manifest, and still equal after compile + bytecode cleanup. (The Pro-side source is deleted, so I could not re-derive the manifest from raw files; the in-sandbox independent recompute is the substituting cross-check.)
- **(c) Loopback real or NAT?** FALSIFICATION FAILED (good). orchestrate_result shows `HostIp: 127.0.0.1` for every governed sidecar port (18080/44772/8080), zero `0.0.0.0`; server bound `127.0.0.1:8090`; lima `portForwards: []`; `vm_destruction.mac_forwards` 0. Binding is genuinely loopback, not a 0.0.0.0-plus-NAT arrangement.
- **(d) Was the snapshot actually deleted?** FALSIFICATION FAILED (good). `stat`/`ls` of `/tmp/foundergate-public-repo-phase6-p6run20260717` returns absent.
- **(e) Was the VM destroyed?** FALSIFICATION FAILED (good). `limactl list` reports no instance; no `foundergate-opensandbox-phase6` present.

## Findings

- **F-1 (LOW / INFO).** `prototypes/customer_repository_intake/__pycache__/` is present as an untracked artifact and is not one of the 15 enumerated allowed files. It is transient Python bytecode (not a source change); running the allowed prototype tests also regenerates it. No source-content impact. Recommend adding to `.gitignore` / not committing.
- **F-2 (INFO).** `docs/status/OPEN_SANDBOX_PHASE6_DECISION_PACKET.md` does not exist yet (only phases 2/3/4/4.1/5 packets are present). This is within the "decision packet may not exist yet — note it" allowance; not a defect.
- **F-3 (INFO).** Phase-6 branch HEAD equals the base commit `e1147c5`; all deliverables (lane, coordination, research docs, new prototype files, test_contract edit) are uncommitted working-tree changes (`M`/`??`), not commits. Durable evidence is on disk and reproducible; nothing is committed to the branch tip. Expected for an evidence-capture spike; noted for the record.

No CHECKER-REJECT conditions were found: no repository code executed (compileall only), no governed port on 0.0.0.0, snapshot and VM both provably gone, main unchanged.

## VERDICT: CHECKER-CLEAN
