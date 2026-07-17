"""FounderGate OpenSandbox Phase-4 live Linux driver (runs INSIDE the disposable VM).

Drives the provider-neutral adapter (contract.py + opensandbox_provider.py) against a
live OpenSandbox server over LOOPBACK ONLY (127.0.0.1:8090), using the server's NATIVE
internal proxy path to reach execd (NOT a host-published execd port). Standard library
only. Emits a structured provider-neutral evidence JSON. It returns observations and
evidence — never a founder acceptance or release verdict.
"""
from __future__ import annotations

import hashlib, json, os, ssl, time, urllib.request, uuid
from contract import (
    CreateSessionRequest, EgressPolicy, EgressRule, ResourceLimits, RunMode,
    evaluate_run, ExecResult, EvidenceRef, Confidence, validate_governed_image_ref,
)
from opensandbox_provider import OpenSandboxProvider, OpenSandboxConfig

SERVER = "http://127.0.0.1:8090"          # loopback only
EXECD_PORT = 44772
RT = "/tmp/foundergate-opensandbox-phase4"
FG_SENTINEL = "/Users/yosiwizman/Projects/foundergate/OPEN_SANDBOX_PHASE4_FORBIDDEN_SENTINEL.txt"
IMG = "python@sha256:db3ff2e1800a8581e2c48a27c3995339d47bdf046da21c7627accd3d51053a93"
now = lambda: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
sha = lambda b: "sha256:" + hashlib.sha256(b).hexdigest()

adapter = OpenSandboxProvider(OpenSandboxConfig(
    lifecycle_endpoint=SERVER, execd_endpoint=SERVER, mode=RunMode.GOVERNED, enabled=True))
ev = {"schema": "phase4-linux-1", "server": SERVER, "seam": "native-proxy", "at": now(), "steps": {}}


def _req(method, url, data=None, headers=None, timeout=60):
    if "127.0.0.1" not in url:
        raise RuntimeError(f"refusing non-loopback target: {url}")
    r = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def proxy_url(sid, path):
    return f"{SERVER}/v1/sandboxes/{sid}/proxy/{EXECD_PORT}/{path}"


def run_cmd(sid, command, cwd="/workspace"):
    body = json.dumps({"command": command, "cwd": cwd, "timeout": 30000}).encode()
    st, raw = _req("POST", proxy_url(sid, "command"), body, {"content-type": "application/json"})
    exr = adapter.parse_command_stream(raw.decode())     # adapter translates NDJSON -> neutral
    # also surface raw stdout text for assertions
    out = []
    for line in raw.decode().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            e = json.loads(line)
        except Exception:
            continue
        if e.get("type") == "stdout":
            out.append(e.get("text", ""))
        if e.get("type") == "stderr":
            out.append("[stderr] " + e.get("text", ""))
    return exr, "\n".join(out), st


def upload(sid, dest, content):
    parts = adapter.build_upload_parts(dest, content)    # adapter builds multipart (F6 fix)
    boundary = "----fg" + uuid.uuid4().hex
    body = b""
    for name, (fname, data, ctype) in parts:
        body += f"--{boundary}\r\n".encode()
        disp = f'form-data; name="{name}"'
        if fname:
            disp += f'; filename="{fname}"'
        body += f"Content-Disposition: {disp}\r\nContent-Type: {ctype}\r\n\r\n".encode()
        body += (data if isinstance(data, bytes) else data.encode()) + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    st, raw = _req("POST", proxy_url(sid, "files/upload"), body,
                   {"content-type": f"multipart/form-data; boundary={boundary}"})
    return st, raw.decode()[:200]


def main():
    # image identity is validated by the adapter (governed => exact digest)
    validate_governed_image_ref(IMG)
    ev["image"] = IMG

    # trivial repo (in the VM)
    os.makedirs(f"{RT}/repo", exist_ok=True)
    open(f"{RT}/repo/README.md", "w").write(
        "This repository exists only for the bounded FounderGate OpenSandbox Phase 4 Linux adapter spike.\n")
    open(f"{RT}/repo/input.txt", "w").write("FOUNDERGATE_OPENSANDBOX_PHASE4_INPUT")
    open(f"{RT}/repo/builder.sh", "w").write(
        "#!/usr/bin/env bash\nset -euo pipefail\nIN=$(cat input.txt)\nmkdir -p output\n"
        "printf 'FOUNDERGATE_OPENSANDBOX_PHASE4_BUILDER_OK' > output/result.txt\n"
        "INDIG=$(sha256sum input.txt | awk '{print $1}')\n"
        "OUTDIG=$(sha256sum output/result.txt | awk '{print $1}')\n"
        "printf '{\"event\":\"builder_ok\",\"timestamp\":\"%s\",\"input_digest\":\"%s\","
        "\"output_digest\":\"%s\",\"uid\":\"%s\",\"working_directory\":\"%s\"}\\n' "
        "\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" \"$INDIG\" \"$OUTDIG\" \"$(id -u)\" \"$(pwd)\"\nexit 0\n")
    files = {f: open(f"{RT}/repo/{f}", "rb").read() for f in ("README.md", "input.txt", "builder.sh")}
    ev["preupload_digests"] = {f: sha(c) for f, c in files.items()}

    # 1. create_session via adapter
    req = CreateSessionRequest(
        run_id="phase4", workload_image_ref=IMG, entrypoint=("sleep", "infinity"),
        timeout_s=600, resource_limits=ResourceLimits(),
        egress_policy=EgressPolicy("deny", (EgressRule("allow", "example.com"),), "dns+nft"))
    body = json.dumps(adapter.build_create_body(req)).encode()
    st, raw = _req("POST", f"{SERVER}/v1/sandboxes", body, {"content-type": "application/json"})
    created = adapter.parse_create_response(json.loads(raw.decode()))
    sid = created.session_id
    ev["steps"]["create"] = {"http": st, "session_id": sid, "state": created.status,
                             "provider_meta_leak_check": type(created).__name__}
    time.sleep(3)

    # 2. upload + verify in-sandbox digests
    ev["steps"]["upload"] = {f: upload(sid, f"/workspace/{f}", c) for f, c in files.items()}
    _, dig_out, _ = run_cmd(sid, "sha256sum README.md input.txt builder.sh")
    ev["steps"]["insandbox_digests"] = dig_out

    # 3. execute builder.sh (capture stdout/stderr/exit/timestamps/elapsed)
    t0 = time.time()
    ev["steps"]["builder_start"] = now()
    exr, out, st = run_cmd(sid, "chmod +x builder.sh; bash builder.sh; echo __RC=$?")
    ev["steps"]["builder_end"] = now()
    ev["steps"]["builder"] = {"http": st, "exit_code": exr.exit_code, "stdout": out,
                              "elapsed_s": round(time.time() - t0, 3),
                              "stdout_digest": exr.stdout_ref.digest if exr.stdout_ref else None}
    _, res_out, _ = run_cmd(sid, "sha256sum output/result.txt; echo ---; cat output/result.txt")
    ev["steps"]["result"] = res_out

    # 4. download via native proxy + verify digest equals in-sandbox
    st, raw = _req("GET", proxy_url(sid, "files/download?path=/workspace/output/result.txt"))
    ev["steps"]["download"] = {"http": st, "downloaded_sha256": sha(raw), "bytes": len(raw)}

    # 5. Phase-7 trust-boundary: workload-local write to a FounderGate-looking host path
    _, b_out, _ = run_cmd(
        sid, f"mkdir -p $(dirname '{FG_SENTINEL}') 2>&1; echo BREACH > '{FG_SENTINEL}' 2>&1; "
             f"ls -l '{FG_SENTINEL}' 2>&1; echo wrote_rc=$?", cwd="/")
    ev["steps"]["boundary_attempt"] = b_out
    _, sock_out, _ = run_cmd(
        sid, "ls -l /var/run/docker.sock 2>&1; test -S /var/run/docker.sock && echo SOCKET_PRESENT || echo SOCKET_ABSENT; "
             "docker ps 2>&1 | head -1 || echo no-docker-cli", cwd="/")
    ev["steps"]["docker_socket"] = sock_out
    _, id_out, _ = run_cmd(
        sid, "id; echo HOST=$(hostname); echo ---; grep -iE 'docker.sock|/Users|foundergate|virtiofs|9p' /proc/mounts || echo no-host-mounts", cwd="/")
    ev["steps"]["identity"] = id_out

    ev["core_sid"] = sid
    json.dump(ev, open(f"{RT}/evidence-core.json", "w"), indent=2, default=str)
    print("CORE_DONE sid=" + sid)
    print(json.dumps(ev["steps"]["builder"], default=str))
    print("boundary:", b_out.replace("\n", " | "))
    print("socket:", sock_out.replace("\n", " | "))
    print("identity:", id_out.replace("\n", " | "))
    print("download:", ev["steps"]["download"])
    print("insandbox_digests:", dig_out.replace("\n", " | "))


if __name__ == "__main__":
    main()
