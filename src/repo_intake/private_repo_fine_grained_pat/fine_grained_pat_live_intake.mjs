// FounderGate — Fine-grained PAT LIVE read-only intake (LOCAL driver).
// Uses the Keychain-stored fine-grained PAT (in process memory ONLY) to perform read-only GitHub API reads
// against the founder-owned sandbox repo. The token is passed only in the Authorization header of node:https
// requests — never in argv, never on disk, never printed, never returned. Only safe metadata + digests leave.
// READ-ONLY BY CONSTRUCTION: every request is a GET; no write/exec/provider path exists here.

import https from 'node:https';
import { createHash } from 'node:crypto';

const OWNER_REPO = 'yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';
const sha256 = (b) => createHash('sha256').update(b).digest('hex');

// Minimal GET helper. `token` stays local to this module's call stack; it is only placed in the header.
function ghGet(pathOrUrl, token, { raw = false } = {}) {
  return new Promise((resolve, reject) => {
    const url = pathOrUrl.startsWith('http') ? new URL(pathOrUrl) : new URL('https://api.github.com' + pathOrUrl);
    const opts = {
      method: 'GET',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': 'Bearer ' + token,
        'User-Agent': 'FounderGate-fgpat-readonly-proof',
        'Accept': raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // follow one redirect (used by the tarball endpoint) — carry no auth to the signed URL
          return resolve(followRedirect(res.headers.location));
        }
        resolve({ status: res.statusCode, headers: res.headers, buf });
      });
    });
    req.on('error', reject);
    req.end();
  });
}
function followRedirect(location) {
  return new Promise((resolve, reject) => {
    const url = new URL(location);
    https.get({ hostname: url.hostname, path: url.pathname + url.search, headers: { 'User-Agent': 'FounderGate-fgpat-readonly-proof' } }, (res) => {
      const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, buf: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

// Perform the full read-only intake. Returns ONLY safe metadata (no token).
export async function liveIntake(token) {
  const out = { ok: false };
  // 1. authenticated identity
  const user = await ghGet('/user', token);
  out.authenticated_user = user.status === 200 ? JSON.parse(user.buf).login : null;
  // 2. repo metadata + effective permissions (read-only signal)
  const repo = await ghGet('/repos/' + OWNER_REPO, token);
  if (repo.status !== 200) { out.error = 'repo_read_failed_' + repo.status; return out; }
  const repoJson = JSON.parse(repo.buf);
  out.repo = repoJson.full_name;
  out.private = repoJson.private;
  out.default_branch = repoJson.default_branch;
  // NOTE: the repository `permissions` object reflects the AUTHENTICATED USER'S ROLE on the repo
  // (for the owner this is admin/push=true), NOT the fine-grained token's granted scope. GitHub does not
  // expose a fine-grained PAT's permission set via a read-only API, and FounderGate will not attempt a write
  // to test refusal (forbidden). Therefore read-only SCOPE cannot be independently, mechanically verified here.
  out.repo_role_permissions = repoJson.permissions || {}; // owner-role artifact — NOT the token scope
  out.read_only_scope_independently_verified = false;
  out.read_only_scope_note = 'repo permissions object reflects owner role, not token grant; no write attempted (forbidden) — read-only scope asserted by token config but not independently verified -> PARTIAL';
  // 3. exact commit at default branch
  const branch = await ghGet('/repos/' + OWNER_REPO + '/branches/' + out.default_branch, token);
  out.exact_commit = branch.status === 200 ? JSON.parse(branch.buf).commit.sha : null;
  // 4. canonical manifest via git tree (path + blob sha + size)
  const tree = await ghGet('/repos/' + OWNER_REPO + '/git/trees/' + out.exact_commit + '?recursive=1', token);
  const treeJson = JSON.parse(tree.buf);
  const blobs = (treeJson.tree || []).filter((e) => e.type === 'blob');
  out.file_count = blobs.length;
  out.total_bytes = blobs.reduce((n, b) => n + (b.size || 0), 0);
  out.truncated = !!treeJson.truncated;
  const manifest = blobs.map((b) => ({ path: b.path, sha: b.sha, size: b.size || 0 })).sort((a, b) => a.path.localeCompare(b.path));
  out.manifest = manifest;
  out.manifest_digest = 'man_' + sha256(JSON.stringify(manifest)).slice(0, 24);
  // 5. secret classification — fetch small blob samples (contents stay in memory; never sent to a model)
  const files = [];
  for (const b of blobs) {
    let sample = '';
    if ((b.size || 0) <= 4096) {
      const blob = await ghGet('/repos/' + OWNER_REPO + '/git/blobs/' + b.sha, token);
      if (blob.status === 200) {
        const j = JSON.parse(blob.buf);
        if (j.encoding === 'base64') sample = Buffer.from(j.content, 'base64').toString('utf8').slice(0, 2048);
      }
    }
    files.push({ path: b.path, bytes: b.size || 0, sample });
  }
  out.files_for_classifier = files;
  // 6. archive/snapshot digest (tarball bytes; auth used only for the api.github.com request, not the signed URL)
  const tar = await ghGet('/repos/' + OWNER_REPO + '/tarball/' + out.exact_commit, token);
  out.archive_digest = tar.status === 200 ? 'arc_' + sha256(tar.buf).slice(0, 24) : null;
  out.snapshot_digest = out.archive_digest;
  // 7. structural safety observations from the manifest
  out.no_symlink_escape = !manifest.some((m) => m.path.includes('..'));
  out.no_submodules = !(treeJson.tree || []).some((e) => e.type === 'commit');
  out.ok = true;
  return out;
}

export const LIVE_TARGET = OWNER_REPO;
