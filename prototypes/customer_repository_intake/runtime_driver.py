"""FounderGate Phase-6 runtime driver (dual mode). NO repository code is executed except
the single harness-owned `python -m compileall` step inside the disposable sandbox.

Modes:
  verify      — runs INSIDE the disposable sandbox (python:3.11-slim). Self-contained,
                stdlib only. Re-validates the transferred archive, extracts to
                /workspace/repository, recomputes the canonical manifest and proves it
                matches the Pro manifest, checks license + pyproject.toml (tomllib) + src,
                runs ONLY `python -m compileall -q .../src`, then deletes bytecode and
                proves the snapshot still matches. Writes /workspace/verifier_result.json.
  orchestrate — runs in the VM host. Drives the FounderGate OpenSandbox adapter
                (build_create_body / build_upload_parts / parse_command_stream /
                assert_no_public_port_binding) over the native loopback proxy to create a
                governed sandbox, upload {archive, manifest, this driver}, exec the verifier,
                and download results. Never executes repository code on the host.
"""
from __future__ import annotations
import hashlib, json, os, re, subprocess, sys, tarfile

MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_EXPANDED = 20 * 1024 * 1024
MAX_FILE_COUNT = 1000


def _sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


# ----------------------------- verify mode ------------------------------ #
def _inspect(tar_path):
    unsafe, seen, seen_ci = [], set(), set()
    total = 0
    with tarfile.open(tar_path, "r:gz") as tf:
        members = tf.getmembers()
        for m in members:
            name = m.name
            base = name.split("/", 1)[1] if "/" in name else name
            if "\x00" in name or name.startswith("/") or re.match(r"^[A-Za-z]:[\\/]", name):
                unsafe.append(f"absolute/nul: {name}")
            if ".." in name.replace("\\", "/").split("/"):
                unsafe.append(f"traversal: {name}")
            if m.issym() or m.islnk():
                unsafe.append(f"link: {name}")
            if m.ischr() or m.isblk() or m.isfifo():
                unsafe.append(f"device: {name}")
            if m.isfile():
                if m.size > MAX_FILE_SIZE:
                    unsafe.append(f"too large: {name}")
                total += m.size
                if base in seen:
                    unsafe.append(f"dup: {name}")
                if base.lower() in seen_ci and base not in seen:
                    unsafe.append(f"case: {name}")
                seen.add(base); seen_ci.add(base.lower())
        if total > MAX_EXPANDED:
            unsafe.append("expanded too large")
        if len(members) > MAX_FILE_COUNT:
            unsafe.append("too many entries")
    return unsafe


def _extract(tar_path, out):
    os.makedirs(out, exist_ok=True)
    with tarfile.open(tar_path, "r:gz") as tf:
        for m in tf.getmembers():
            if not (m.isfile() or m.isdir()):
                continue
            rel = m.name.split("/", 1)[1] if "/" in m.name else ""
            if not rel:
                continue
            target = os.path.join(out, rel)
            if not os.path.realpath(target).startswith(os.path.realpath(out) + os.sep):
                raise RuntimeError(f"escape blocked: {rel}")
            if m.isdir():
                os.makedirs(target, exist_ok=True)
            else:
                os.makedirs(os.path.dirname(target), exist_ok=True)
                with tf.extractfile(m) as s, open(target, "wb") as d:
                    d.write(s.read())
    return out


def _manifest(root):
    items = []
    for dp, _dirs, files in os.walk(root):
        for fn in sorted(files):
            full = os.path.join(dp, fn)
            if os.path.islink(full):
                continue
            rel = os.path.relpath(full, root).replace("\\", "/")
            data = open(full, "rb").read()
            st = os.stat(full)
            items.append({"path": rel, "size": st.st_size, "sha256": _sha(data),
                          "executable": bool(st.st_mode & 0o111), "type": "file"})
    items.sort(key=lambda x: x["path"])
    return items, _sha(json.dumps(items, separators=(",", ":"), sort_keys=True).encode())


def verify(upload_dir="/workspace/upload", work="/workspace"):
    res = {"mode": "verify", "steps": {}}
    tar = os.path.join(upload_dir, "repo.tar.gz")
    expected = json.load(open(os.path.join(upload_dir, "canonical_manifest.json")))
    expected_sha = _sha(json.dumps(expected, separators=(",", ":"), sort_keys=True).encode())

    unsafe = _inspect(tar)
    res["steps"]["archive_revalidation"] = {"unsafe": unsafe, "ok": not unsafe}
    if unsafe:
        res["classification"] = "REJECTED_UNSAFE_ARCHIVE"; _emit(res, work); return res

    repo = _extract(tar, os.path.join(work, "repository"))
    items, man_sha = _manifest(repo)
    res["steps"]["manifest_recompute"] = {"file_count": len(items), "sha256": man_sha,
        "matches_pro_manifest": man_sha == expected_sha}
    paths = {i["path"] for i in items}
    res["steps"]["license_present"] = any(p.lower().startswith("license") or p.lower() == "license.txt" for p in paths)
    # pyproject.toml parse via tomllib (stdlib 3.11); observation only
    pyproj = os.path.join(repo, "pyproject.toml")
    meta = {}
    if os.path.exists(pyproj):
        try:
            import tomllib
            meta = tomllib.load(open(pyproj, "rb"))
            res["steps"]["pyproject_parseable"] = True
            res["steps"]["project_metadata"] = {"name": meta.get("project", {}).get("name"),
                "has_build_system": "build-system" in meta}
        except Exception as e:
            res["steps"]["pyproject_parseable"] = False; res["steps"]["pyproject_error"] = str(e)[:80]
    else:
        res["steps"]["pyproject_parseable"] = None
    src = os.path.join(repo, "src")
    res["steps"]["src_dir_exists"] = os.path.isdir(src)

    # THE ONLY repository-touching execution: byte-compile the src tree (no imports run)
    if os.path.isdir(src):
        cp = subprocess.run([sys.executable, "-m", "compileall", "-q", src], capture_output=True, text=True)
        res["steps"]["compileall"] = {"exit_code": cp.returncode,
            "stdout": cp.stdout[-400:], "stderr": cp.stderr[-400:]}
        pyc = []
        for dp, _d, fs in os.walk(src):
            for fn in fs:
                if fn.endswith(".pyc"):
                    full = os.path.join(dp, fn)
                    pyc.append({"path": os.path.relpath(full, repo), "sha256": _sha(open(full, "rb").read())})
        res["steps"]["generated_bytecode"] = pyc
        # delete generated bytecode, then prove snapshot still matches
        for dp, dirs, fs in os.walk(src):
            for fn in fs:
                if fn.endswith(".pyc"):
                    os.remove(os.path.join(dp, fn))
            for d in list(dirs):
                if d == "__pycache__":
                    p = os.path.join(dp, d)
                    for f2 in os.listdir(p):
                        os.remove(os.path.join(p, f2))
                    os.rmdir(p)
        items2, man_sha2 = _manifest(repo)
        res["steps"]["post_cleanup_manifest"] = {"sha256": man_sha2,
            "still_matches_pro_manifest": man_sha2 == expected_sha}
    res["classification"] = "COMPILEABILITY_OBSERVED"
    res["not_claimed"] = ["APPLICATION_WORKS", "BUILD_PASSED", "TESTS_PASSED", "SAFE", "PRODUCTION_READY"]
    _emit(res, work)
    return res


def _emit(res, work):
    json.dump(res, open(os.path.join(work, "verifier_result.json"), "w"), indent=2)
    print(json.dumps(res))


# --------------------------- orchestrate mode --------------------------- #
def orchestrate():
    """Runs in the VM. Uses the FounderGate adapter serializers over the loopback proxy."""
    sys.path.insert(0, os.environ.get("ADAPTER_DIR", "/tmp/foundergate-opensandbox-phase6/adapter"))
    import urllib.request, uuid
    from opensandbox_provider import (OpenSandboxProvider, OpenSandboxConfig,
                                       assert_no_public_port_binding)
    from contract import (CreateSessionRequest, EgressPolicy, ResourceLimits, RunMode)
    SERVER = "http://127.0.0.1:8090"
    RT = os.environ["PHASE6_RT"]
    IMG = os.environ["WORKLOAD_IMG"]
    adapter = OpenSandboxProvider(OpenSandboxConfig(lifecycle_endpoint=SERVER, execd_endpoint=SERVER,
                                                    mode=RunMode.GOVERNED, enabled=True))
    out = {"mode": "orchestrate", "server": SERVER, "steps": {}}

    def req(method, url, data=None, headers=None, t=90):
        assert "127.0.0.1" in url
        r = urllib.request.Request(url, data=data, method=method, headers=headers or {})
        try:
            with urllib.request.urlopen(r, timeout=t) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    # create governed sandbox (default-deny egress, NO allowed domains)
    r = CreateSessionRequest(run_id="phase6", workload_image_ref=IMG, entrypoint=("sleep", "infinity"),
                             timeout_s=600, resource_limits=ResourceLimits(),
                             egress_policy=EgressPolicy("deny", (), "dns+nft"))
    body = json.dumps(adapter.build_create_body(r)).encode()
    st, raw = req("POST", f"{SERVER}/v1/sandboxes", body, {"content-type": "application/json"})
    sid = adapter.parse_create_response(json.loads(raw.decode())).session_id
    out["steps"]["create"] = {"http": st, "sid": sid}
    import time; time.sleep(3)

    # port-binding guard (governed ports must be 127.0.0.1 only)
    def docker_ports(sid):
        names = subprocess.run(["bash", "-c",
            f"sg docker -c \"docker ps --format '{{{{.ID}}}} {{{{.Names}}}}'\" | grep {sid[:12]}"],
            capture_output=True, text=True).stdout.splitlines()
        combined, per = {}, {}
        for ln in names:
            cid = ln.split()[0]
            pj = subprocess.run(["bash", "-c",
                f"sg docker -c \"docker inspect {cid} --format '{{{{json .NetworkSettings.Ports}}}}'\""],
                capture_output=True, text=True).stdout.strip()
            try: p = json.loads(pj) or {}
            except Exception: p = {}
            per[ln] = p; combined.update(p)
        return combined, per
    ports, per = docker_ports(sid)
    try:
        assert_no_public_port_binding(ports); guard = "GUARD_PASS"
    except Exception as e:
        guard = f"GUARD_REJECT: {e}"
    out["steps"]["port_binding"] = {"guard": guard, "per_container": per}

    def proxy(path): return f"{SERVER}/v1/sandboxes/{sid}/proxy/44772/{path}"

    def upload(dest, data: bytes):
        parts = adapter.build_upload_parts(dest, data)
        boundary = "----fg" + uuid.uuid4().hex
        b = b""
        for name, (fn, d, ct) in parts:
            b += f"--{boundary}\r\n".encode()
            disp = f'form-data; name="{name}"' + (f'; filename="{fn}"' if fn else "")
            b += f"Content-Disposition: {disp}\r\nContent-Type: {ct}\r\n\r\n".encode()
            b += (d if isinstance(d, bytes) else d.encode()) + b"\r\n"
        b += f"--{boundary}--\r\n".encode()
        return req("POST", proxy("files/upload"), b, {"content-type": f"multipart/form-data; boundary={boundary}"})[0]

    def run(cmd, cwd="/workspace"):
        body = json.dumps({"command": cmd, "cwd": cwd, "timeout": 60000}).encode()
        st, raw = req("POST", proxy("command"), body, {"content-type": "application/json"})
        return adapter.parse_command_stream(raw.decode()), raw.decode()

    run("mkdir -p /workspace/upload", cwd="/")
    for local, dest in ((f"{RT}/repo.tar.gz", "/workspace/upload/repo.tar.gz"),
                        (f"{RT}/canonical_manifest.json", "/workspace/upload/canonical_manifest.json"),
                        (f"{RT}/runtime_driver.py", "/workspace/runtime_driver.py")):
        out["steps"].setdefault("upload", {})[dest] = upload(dest, open(local, "rb").read())
    # verify in-sandbox digests of the uploaded archive+manifest
    _, dig = run("sha256sum upload/repo.tar.gz upload/canonical_manifest.json")
    out["steps"]["insandbox_upload_digests"] = dig
    # exec the harness verifier
    _, vout = run("python3 /workspace/runtime_driver.py verify 2>&1 | tail -1")
    out["steps"]["verify_raw_tail"] = vout[-1500:]
    # download the verifier result
    st, raw = req("GET", proxy("files/download?path=/workspace/verifier_result.json"))
    out["steps"]["verifier_result_download"] = {"http": st, "sha256": _sha(raw), "bytes": len(raw)}
    open(f"{RT}/verifier_result.json", "wb").write(raw)
    out["sid"] = sid
    json.dump(out, open(f"{RT}/orchestrate_result.json", "w"), indent=2, default=str)
    print("ORCH_DONE sid=" + sid + " guard=" + guard)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "verify"
    if mode == "orchestrate":
        orchestrate()
    else:
        verify()
