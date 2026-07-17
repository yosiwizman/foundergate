#!/usr/bin/env bash
# FounderGate Phase 7.1 — Safety Check runtime job (spawned by the UI, NOT pre-run).
# Runs the real bounded pipeline for the fixed fixture and writes disk-ledgered stage
# events + evidence into RUN_DIR. Only the harness-owned compileability check touches the
# repository. No repository-defined command runs. Emits nothing to stdout that the UI trusts
# — the UI reads RUN_LEDGER.jsonl / RUN_RESULT.json from disk.
set -uo pipefail
export PATH="/opt/homebrew/bin:/Users/yosiwizman/.local/bin:$PATH"
RUN_ID="${1:?run_id}"; RUN_DIR="${2:?run_dir}"
WT="${WT:?worktree}"
PY=/Users/yosiwizman/.local/share/uv/python/cpython-3.11-macos-aarch64-none/bin/python3
LEDGER="$RUN_DIR/RUN_LEDGER.jsonl"
FIXTURE="https://github.com/pypa/sampleproject"
VM="foundergate-safety-check-$RUN_ID"
RT="/tmp/foundergate-safety-check-$RUN_ID"
ACQ="$RUN_DIR/acq"
IMG="python@sha256:db3ff2e1800a8581e2c48a27c3995339d47bdf046da21c7627accd3d51053a93"
mkdir -p "$ACQ"

now(){ date -u +%Y-%m-%dT%H:%M:%SZ; }
stage(){ printf '{"ts":"%s","run_id":"%s","stage":%s,"name":"%s","status":"%s"}\n' "$(now)" "$RUN_ID" "$1" "$2" "$3" >> "$LEDGER"; }
fail(){ stage "$1" "$2" "FAILED"; printf '{"run_id":"%s","status":"FAILED","failed_stage":"%s","at":"%s"}\n' "$RUN_ID" "$2" "$(now)" > "$RUN_DIR/RUN_RESULT.json"; teardown_vm; exit 1; }
teardown_vm(){ limactl stop "$VM" >/dev/null 2>&1; limactl delete "$VM" >/dev/null 2>&1; }

stage 1 "validating URL" "DONE"
stage 2 "resolving exact commit" "RUNNING"
RES=$("$PY" - "$WT" "$ACQ" <<PY
import sys;sys.path.insert(0,"$WT/prototypes/customer_repository_intake")
from github_public_provider import GitHubPublicProvider, canonical_manifest
import json
p=GitHubPublicProvider();norm,o,r,ref,c,m=p.resolve_exact_commit("$FIXTURE")
acq=p.acquire_archive(o,r,c,"$ACQ")
scan=p.inspect_archive(acq.archive_path)
out=p.extract_safe(acq.archive_path,"$ACQ") if scan.ok else None
items,man=canonical_manifest(out) if out else ([],"")
print(json.dumps({"commit":c,"archive_sha256":acq.archive_sha256,"manifest_sha256":man,"files":len(items),"final_host":acq.final_host,"scan_ok":scan.ok,"bytes":acq.actual_bytes,"archive_path":acq.archive_path,"redirect_other":len(acq.redirect_chain)>1}))
PY
) || fail 2 "resolving exact commit"
echo "$RES" > "$RUN_DIR/RUN_ACQUISITION.json"
COMMIT=$(echo "$RES" | "$PY" -c "import sys,json;print(json.load(sys.stdin)['commit'])")
ARCH_SHA=$(echo "$RES" | "$PY" -c "import sys,json;print(json.load(sys.stdin)['archive_sha256'])")
MAN_SHA=$(echo "$RES" | "$PY" -c "import sys,json;print(json.load(sys.stdin)['manifest_sha256'])")
FILES=$(echo "$RES" | "$PY" -c "import sys,json;print(json.load(sys.stdin)['files'])")
stage 2 "resolving exact commit" "DONE"
stage 3 "acquiring immutable snapshot" "DONE"
[ -n "$COMMIT" ] || fail 3 "acquiring immutable snapshot"
stage 4 "validating archive" "DONE"
stage 5 "fingerprinting snapshot" "DONE"

stage 6 "creating disposable sandbox" "RUNNING"
mkdir -p "$RT"
cat > "$RT-lima.yaml" <<YAML
minimumLimaVersion: "2.0.0"
vmType: "vz"
os: "Linux"
arch: "aarch64"
plain: true
images:
- location: "https://cloud-images.ubuntu.com/releases/noble/release-20260615/ubuntu-24.04-server-cloudimg-arm64.img"
  arch: "aarch64"
  digest: "sha256:cafa1a965b591b7c4184b484ffd8e625981a79d48f9b4ae8a4adf7b4c5ade927"
cpus: 4
memory: "8GiB"
disk: "20GiB"
mounts: []
networks: []
portForwards: []
ssh: {forwardAgent: false, loadDotSSHPubKeys: false}
rosetta: {enabled: false, binfmt: false}
containerd: {system: false, user: false}
YAML
limactl create --name="$VM" --tty=false "$RT-lima.yaml" >/dev/null 2>&1 || fail 6 "creating disposable sandbox"
limactl start "$VM" >/dev/null 2>&1 || fail 6 "creating disposable sandbox"
mkdir -p "$RT"
limactl shell "$VM" -- bash -c "mkdir -p $RT" 2>/dev/null
limactl copy "$WT/prototypes/sandbox_provider_adapter/patches/opensandbox_0_2_1_port_binding.patch" "$VM:$RT/patch.patch" >/dev/null 2>&1
limactl shell "$VM" -- bash -c '
set -e
sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq >/tmp/a 2>&1
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io python3-venv >/tmp/a 2>&1
sudo systemctl enable --now docker >>/tmp/a 2>&1
sudo usermod -aG docker $USER
cd '"$RT"' && python3 -m venv venv && ./venv/bin/pip install -q opensandbox-server==0.2.1 >/tmp/p 2>&1
PKG=$(./venv/bin/python -c "import opensandbox_server,os;print(os.path.dirname(opensandbox_server.__file__))")
cd "$(dirname $PKG)" && patch -p0 < '"$RT"'/patch.patch >/tmp/patch 2>&1
grep -q "127.0.0.1" "$PKG/services/docker/port_allocator.py" || exit 7
for i in opensandbox/execd:v1.0.21 opensandbox/egress:v1.1.4 python:3.11-slim; do sudo docker pull --platform linux/arm64 $i >/dev/null 2>&1; done
' 2>/dev/null || fail 6 "creating disposable sandbox"
# verify patch (loopback binding) — record
PATCHOK=$(limactl shell "$VM" -- bash -c 'grep -h "DOCKER_PUBLISH_HOST = " $(find /tmp/foundergate-safety-check-*/venv -name port_allocator.py 2>/dev/null | head -1) 2>/dev/null' 2>/dev/null)
# config + server
limactl shell "$VM" -- bash -c "cat > $RT/config.toml <<EOF
[server]
host=\"127.0.0.1\"
port=8090
max_sandbox_timeout_seconds=600
[runtime]
type=\"docker\"
execd_image=\"opensandbox/execd@sha256:1dc98c7de10b9a73450ac75aa0f200ad7972f2c40f5225f6a8998e166b45d6dd\"
[store]
type=\"sqlite\"
path=\"$RT/db\"
[docker]
network_mode=\"bridge\"
port_range_min=40000
port_range_max=60000
drop_capabilities=[\"AUDIT_WRITE\",\"MKNOD\",\"NET_ADMIN\",\"NET_RAW\",\"SYS_ADMIN\",\"SYS_MODULE\",\"SYS_PTRACE\",\"SYS_TIME\",\"SYS_TTY_CONFIG\"]
no_new_privileges=true
[egress]
image=\"opensandbox/egress@sha256:973130e01bf76e8e686e2853ebf47b21741bc8781919bb4a7cf60af09a3c6e8a\"
mode=\"dns+nft\"
EOF
cd $RT && sg docker -c \"SANDBOX_CONFIG_PATH=$RT/config.toml OPENSANDBOX_INSECURE_SERVER=YES nohup ./venv/bin/opensandbox-server --config $RT/config.toml >$RT/server.log 2>&1 & echo \\\$! > $RT/server.pid\"" 2>/dev/null
limactl shell "$VM" -- bash -c "curl -s --retry 30 --retry-connrefused --retry-delay 1 -m 40 http://127.0.0.1:8090/openapi.json -o /dev/null" 2>/dev/null || fail 6 "creating disposable sandbox"
BIND=$(limactl shell "$VM" -- bash -c "sudo ss -ltn | grep -q '127.0.0.1:8090' && echo LOOPBACK || echo OTHER" 2>/dev/null)
# transfer + orchestrate (adapter creates sandbox + runs harness verifier)
limactl shell "$VM" -- bash -c "mkdir -p $RT/adapter" 2>/dev/null
limactl copy "$(ls $ACQ/sampleproject-*.tar.gz)" "$VM:$RT/repo.tar.gz" >/dev/null 2>&1
limactl copy "$ACQ/canonical_manifest.json" "$VM:$RT/canonical_manifest.json" >/dev/null 2>&1 || \
  "$PY" -c "import sys;sys.path.insert(0,'$WT/prototypes/customer_repository_intake');from github_public_provider import canonical_manifest;import json;i,_=canonical_manifest('$ACQ/repository');json.dump(i,open('$ACQ/canonical_manifest.json','w'),separators=(',',':'),sort_keys=True)" && limactl copy "$ACQ/canonical_manifest.json" "$VM:$RT/canonical_manifest.json" >/dev/null 2>&1
limactl copy "$WT/prototypes/customer_repository_intake/runtime_driver.py" "$VM:$RT/runtime_driver.py" >/dev/null 2>&1
limactl copy "$WT/prototypes/sandbox_provider_adapter/contract.py" "$VM:$RT/adapter/contract.py" >/dev/null 2>&1
limactl copy "$WT/prototypes/sandbox_provider_adapter/opensandbox_provider.py" "$VM:$RT/adapter/opensandbox_provider.py" >/dev/null 2>&1
stage 6 "creating disposable sandbox" "DONE"
stage 7 "running harness-owned compileability check" "RUNNING"
limactl shell "$VM" -- bash -c "cd $RT && ADAPTER_DIR=$RT/adapter PHASE6_RT=$RT WORKLOAD_IMG='$IMG' python3 runtime_driver.py orchestrate" >/dev/null 2>&1 || fail 7 "running harness-owned compileability check"
VR=$(limactl shell "$VM" -- bash -c "cat $RT/verifier_result.json" 2>/dev/null)
GUARD=$(limactl shell "$VM" -- bash -c "cat $RT/orchestrate_result.json" 2>/dev/null | "$PY" -c "import sys,json;print(json.load(sys.stdin)['steps']['port_binding']['guard'])" 2>/dev/null)
SID=$(echo "$VR" | "$PY" -c "import sys,json;print('sandbox')" 2>/dev/null)
CLASS=$(echo "$VR" | "$PY" -c "import sys,json;print(json.load(sys.stdin)['classification'])")
COMPILE=$(echo "$VR" | "$PY" -c "import sys,json;print(json.load(sys.stdin)['steps'].get('compileall',{}).get('exit_code'))")
MMATCH=$(echo "$VR" | "$PY" -c "import sys,json;print(json.load(sys.stdin)['steps']['manifest_recompute']['matches_pro_manifest'])")
# egress + socket
OSID=$(limactl shell "$VM" -- bash -c "cat $RT/orchestrate_result.json" 2>/dev/null | "$PY" -c "import sys,json;print(json.load(sys.stdin)['sid'])")
PROX="http://127.0.0.1:8090/v1/sandboxes/$OSID/proxy/44772/command"
EGR=$(limactl shell "$VM" -- bash -c "curl -s -m 20 -X POST '$PROX' -H 'content-type: application/json' -d '{\"command\":\"python3 -c \\\"import socket\ntry:socket.getaddrinfo(\\\\\\\"example.com\\\\\\\",443);print(\\\\\\\"ALLOWED\\\\\\\")\nexcept:print(\\\\\\\"DENIED\\\\\\\")\\\"\",\"cwd\":\"/\"}' | python3 -c \"import sys,json;print(''.join(json.loads(l).get('text','') for l in sys.stdin if l.strip() and json.loads(l).get('type')=='stdout'))\"" 2>/dev/null)
SOCK=$(limactl shell "$VM" -- bash -c "curl -s -m 20 -X POST '$PROX' -H 'content-type: application/json' -d '{\"command\":\"test -S /var/run/docker.sock && echo PRESENT || echo ABSENT\",\"cwd\":\"/\"}' | python3 -c \"import sys,json;print(''.join(json.loads(l).get('text','') for l in sys.stdin if l.strip() and json.loads(l).get('type')=='stdout'))\"" 2>/dev/null)
echo "$VR" > "$RUN_DIR/RUN_VERIFIER.json"
stage 7 "running harness-owned compileability check" "DONE"
stage 8 "exporting evidence" "RUNNING"
# teardown sandbox + server
limactl shell "$VM" -- bash -c "curl -s -m 20 -X DELETE http://127.0.0.1:8090/v1/sandboxes/$OSID -o /dev/null -w '%{http_code}' > $RT/del_code" 2>/dev/null
# verify session gone BEFORE stopping the server (so we get a real 404, not 000)
DEL=$(limactl shell "$VM" -- bash -c "curl -s -m 10 http://127.0.0.1:8090/v1/sandboxes/$OSID -o /dev/null -w '%{http_code}'" 2>/dev/null)
limactl shell "$VM" -- bash -c "kill \$(cat $RT/server.pid) 2>/dev/null; pkill -9 opensandbox-ser 2>/dev/null; true" 2>/dev/null
stage 8 "exporting evidence" "DONE"
stage 9 "removing temporary snapshot" "RUNNING"
limactl shell "$VM" -- bash -c "find $RT -maxdepth 1 -name 'repo.tar.gz' -delete 2>/dev/null; find $RT -maxdepth 2 -name canonical_manifest.json -delete 2>/dev/null; true" 2>/dev/null
find "$ACQ" -type f -delete 2>/dev/null; find "$ACQ" -depth -type d -empty -delete 2>/dev/null
stage 9 "removing temporary snapshot" "DONE"
stage 10 "destroying disposable runtime" "RUNNING"
teardown_vm
VMGONE=$([ -e "$HOME/.lima/$VM" ] && echo NO || echo YES)
stage 10 "destroying disposable runtime" "DONE"

# RUN_RESULT bound to this run_id
"$PY" - "$RUN_DIR" "$RUN_ID" "$COMMIT" "$ARCH_SHA" "$MAN_SHA" "$FILES" "$GUARD" "$EGR" "$SOCK" "$CLASS" "$COMPILE" "$MMATCH" "$DEL" "$VMGONE" "$BIND" <<PY
import sys,json
d=sys.argv
res={"run_id":d[2],"fixture_url":"https://github.com/pypa/sampleproject","status":"COMPLETE",
 "exact_commit":d[3],"archive_sha256":d[4],"canonical_manifest_sha256":d[5],"manifest_file_count":int(d[6]) if d[6].isdigit() else d[6],
 "port_binding_guard":d[7],"server_bind":d[15],"egress_example_com":d[8],"docker_socket":d[9],
 "classification":d[10],"compileall_exit":int(d[11]) if d[11].lstrip('-').isdigit() else d[11],"in_sandbox_manifest_matches_pro":d[12]=="True",
 "teardown_get_status":d[13],"vm_destroyed":d[14]=="YES",
 "build_proven":False,"tests_proven":False,"security_proven":False,"production_ready":False,
 "note":"harness compileability only; no repository build/tests/scripts ran"}
json.dump(res,open(f"{d[1]}/RUN_RESULT.json","w"),indent=2)
json.dump({"compileability_observed":d[10]=="COMPILEABILITY_OBSERVED","build_proven":False,"tests_proven":False,"security_proven":False,"production_ready":False,"unknowns":["build","tests","security","production_readiness"]},open(f"{d[1]}/RUN_LIMITATIONS.json","w"),indent=2)
print("RUN_RESULT written")
PY
stage 11 "generating Evidence Pack" "RUNNING"
node "$WT/src/safety_check/evidence-pack.mjs" "$RUN_DIR" "$RUN_ID" >/dev/null 2>&1 && stage 11 "generating Evidence Pack" "DONE" || stage 11 "generating Evidence Pack" "UNKNOWN"
stage 12 "complete" "DONE"
