"""Live public GitHub source provider (Phase 6 — bounded runtime spike).

PUBLIC GitHub HTTPS only. NO authentication, NO token, NO SSH, NO private repos, NO
credential storage. Resolves an exact commit, downloads ONE exact-commit archive over a
host-allowlisted transport, validates every archive entry BEFORE extraction, extracts
safely into a bounded temp root, and builds a canonical manifest. Returns observations;
never a founder acceptance; never executes repository code.

Unit tests must not hit the network — the network functions are only invoked by the
runtime driver, never at import or in unit tests.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
import subprocess
import tarfile
import urllib.request
from urllib.parse import urlsplit
from dataclasses import dataclass, field
from typing import Optional

from contract import ValidationError, normalize_github_url

ALLOWED_HOSTS = frozenset({"github.com", "www.github.com", "api.github.com", "codeload.github.com"})
_SHA1_RE = re.compile(r"^[0-9a-f]{40}$")

# bounded limits (Phase 4/5)
MAX_COMPRESSED = 10 * 1024 * 1024
MAX_EXPANDED = 20 * 1024 * 1024
MAX_FILE_COUNT = 1000
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_PATH_LEN = 240

_SECRET_NAMES = ("id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", ".pem", ".key", ".p12",
                 "credentials", ".npmrc", ".pypirc", "secrets", ".env")
_LICENSE_NAMES = ("license", "license.txt", "license.md", "copying", "licence")


def _sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


class _HostAllowlistRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, chain):
        self.chain = chain
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        host = (urlsplit(newurl).hostname or "").lower()
        self.chain.append(newurl)
        if host not in ALLOWED_HOSTS:
            raise ValidationError(f"redirect to non-allowlisted host: {host!r}")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


@dataclass
class AcquisitionResult:
    normalized_url: object
    owner: str
    repository: str
    default_ref: str
    exact_commit: str
    resolution_method: str
    archive_url: str
    redirect_chain: list
    final_host: str
    http_status: int
    content_type: str
    content_length: Optional[int]
    actual_bytes: int
    archive_sha256: str
    archive_path: str
    is_private: bool = False


@dataclass
class ArchiveScan:
    entries: int = 0
    total_size: int = 0
    unsafe: list = field(default_factory=list)
    secret_like: list = field(default_factory=list)
    submodules: list = field(default_factory=list)
    lfs: list = field(default_factory=list)
    license_files: list = field(default_factory=list)
    ok: bool = True


class GitHubPublicProvider:
    name = "github-public"
    version = "0.1.0-phase6"

    def resolve_exact_commit(self, url: str) -> tuple:
        """Resolve the default HEAD to one exact 40-hex commit via `git ls-remote HEAD`
        (no auth). Returns (normalized, owner, repo, default_ref, commit, method)."""
        norm = normalize_github_url(url)
        r = subprocess.run(["git", "ls-remote", f"https://{norm.host}/{norm.owner}/{norm.repository}.git", "HEAD"],
                           capture_output=True, text=True, timeout=60)
        if r.returncode != 0 or not r.stdout.strip():
            raise ValidationError(f"could not resolve HEAD: {r.stderr[:120]}")
        sha = r.stdout.split()[0].strip().lower()
        if not _SHA1_RE.match(sha):
            raise ValidationError(f"resolved HEAD is not a 40-hex commit: {sha!r}")
        return norm, norm.owner, norm.repository, "HEAD", sha, "git ls-remote HEAD"

    def acquire_archive(self, owner: str, repo: str, commit: str, dest_dir: str) -> AcquisitionResult:
        """Download exactly the commit tarball from codeload (host-allowlisted, bounded)."""
        if not _SHA1_RE.match(commit):
            raise ValidationError("refusing to acquire without an exact 40-hex commit")
        url = f"https://codeload.github.com/{owner}/{repo}/tar.gz/{commit}"
        chain = [url]
        opener = urllib.request.build_opener(_HostAllowlistRedirect(chain))
        req = urllib.request.Request(url, headers={"User-Agent": "foundergate-phase6-intake"})
        path = os.path.join(dest_dir, f"{repo}-{commit}.tar.gz")
        buf = bytearray()
        with opener.open(req, timeout=90) as resp:
            status = resp.status
            ctype = resp.headers.get("Content-Type", "")
            clen = resp.headers.get("Content-Length")
            final_host = resp.url.split("://", 1)[1].split("/", 1)[0].lower()
            if final_host not in ALLOWED_HOSTS:
                raise ValidationError(f"final host not allowlisted: {final_host}")
            while True:
                chunk = resp.read(65536)
                if not chunk:
                    break
                buf.extend(chunk)
                if len(buf) > MAX_COMPRESSED:
                    raise ValidationError(f"compressed archive exceeds {MAX_COMPRESSED} bytes")
        with open(path, "wb") as f:
            f.write(buf)
        return AcquisitionResult(
            normalized_url=normalize_github_url(f"https://github.com/{owner}/{repo}"),
            owner=owner, repository=repo, default_ref="HEAD", exact_commit=commit,
            resolution_method="git ls-remote HEAD", archive_url=url, redirect_chain=chain,
            final_host=final_host, http_status=status, content_type=ctype,
            content_length=int(clen) if clen else None, actual_bytes=len(buf),
            archive_sha256=_sha256_bytes(bytes(buf)), archive_path=path)

    def inspect_archive(self, tar_path: str) -> ArchiveScan:
        """Reject unsafe entries BEFORE extraction; classify indicators. No extraction here."""
        scan = ArchiveScan()
        seen, seen_ci = set(), set()
        with tarfile.open(tar_path, "r:gz") as tf:
            for m in tf.getmembers():
                name = m.name
                scan.entries += 1
                base = name.split("/", 1)[1] if "/" in name else name   # strip top-level dir
                low = base.lower()
                # structural safety
                if "\x00" in name:
                    scan.unsafe.append(f"NUL in name")
                if name.startswith("/") or re.match(r"^[A-Za-z]:[\\/]", name):
                    scan.unsafe.append(f"absolute: {name}")
                if ".." in name.replace("\\", "/").split("/"):
                    scan.unsafe.append(f"traversal: {name}")
                if len(name) > MAX_PATH_LEN:
                    scan.unsafe.append(f"path too long: {name[:40]}...")
                if m.issym():
                    scan.unsafe.append(f"symlink: {name}")
                if m.islnk():
                    scan.unsafe.append(f"hardlink: {name}")
                if m.ischr() or m.isblk() or m.isfifo():
                    scan.unsafe.append(f"device/fifo: {name}")
                if m.isfile():
                    if m.size > MAX_FILE_SIZE:
                        scan.unsafe.append(f"file too large: {name}")
                    scan.total_size += m.size
                    norm = base
                    if norm in seen:
                        scan.unsafe.append(f"duplicate path: {name}")
                    if norm.lower() in seen_ci and norm not in seen:
                        scan.unsafe.append(f"case collision: {name}")
                    seen.add(norm); seen_ci.add(norm.lower())
                # indicators
                bn = os.path.basename(low)
                if bn == ".gitmodules":
                    scan.submodules.append(base)
                if any(s in low for s in _SECRET_NAMES):
                    scan.secret_like.append(base)
                if bn in _LICENSE_NAMES:
                    scan.license_files.append(base)
        if scan.total_size > MAX_EXPANDED:
            scan.unsafe.append(f"expanded size {scan.total_size} exceeds {MAX_EXPANDED}")
        if scan.entries > MAX_FILE_COUNT:
            scan.unsafe.append(f"entry count {scan.entries} exceeds {MAX_FILE_COUNT}")
        scan.ok = not scan.unsafe
        return scan

    def extract_safe(self, tar_path: str, dest_root: str) -> str:
        """Extract into dest_root ONLY after inspect_archive passed. Strips the top-level dir."""
        scan = self.inspect_archive(tar_path)
        if not scan.ok:
            raise ValidationError(f"unsafe archive, refusing extraction: {scan.unsafe[:3]}")
        out = os.path.join(dest_root, "repository")
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
                    raise ValidationError(f"extraction escape blocked: {rel}")
                if m.isdir():
                    os.makedirs(target, exist_ok=True)
                else:
                    os.makedirs(os.path.dirname(target), exist_ok=True)
                    with tf.extractfile(m) as src, open(target, "wb") as dst:
                        dst.write(src.read())
        return out


def canonical_manifest(root: str) -> tuple:
    """Deterministic manifest for every regular file. Returns (manifest_list, manifest_sha256)."""
    items = []
    for dirpath, _dirs, files in os.walk(root):
        for fn in sorted(files):
            full = os.path.join(dirpath, fn)
            if os.path.islink(full):
                continue
            rel = os.path.relpath(full, root).replace("\\", "/")
            data = open(full, "rb").read()
            st = os.stat(full)
            items.append({
                "path": rel, "size": st.st_size, "sha256": _sha256_bytes(data),
                "executable": bool(st.st_mode & 0o111), "type": "file",
            })
    items.sort(key=lambda x: x["path"])
    blob = json.dumps(items, separators=(",", ":"), sort_keys=True).encode()
    return items, _sha256_bytes(blob)
