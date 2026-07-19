// FounderGate V8-B VB2 — GitHub INTEGRATION CARDS surface (read-only, NON-EXECUTING).
//
// Plain English: FounderGate already has a READ-ONLY GitHub collector
// (src/collectors/github/github-collector.mjs) that turns the local, already-authenticated
// `gh` session into a normalized, redacted, truth-labelled bundle — the open PRs of a repo
// with their branch, head SHA, changed files, CI rollup, Copilot review state, and
// mergeability. What the founder still lacked — and what the V8-B completion matrix names as
// **"GitHub links / integration cards" = NOT BUILT, missing "read-only repo/PR/branch/file
// cards"** — is a founder-readable SURFACE over that bundle: one page that shows the repo,
// each PR, its branch, and its files as cards, each carrying the canonical GitHub link.
//
// This module is that surface — and NOTHING ELSE:
//   - It is PURE and read-only: every function takes the collector's normalized bundle (the
//     data the caller supplies) and RETURNS a plain object or a STRING. It never shells `gh`,
//     never opens the network, never touches the disk, never acts, approves, merges, or runs
//     anything. The disk/network reading already happened in the collector; this surface only
//     PRESENTS the data it is handed.
//   - NO side effects: no fs, no net, no child_process, no clock, no randomness. Same bundle
//     in → byte-identical page out.
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>,
//     <form>, <button>, <input>, or on* handler. Everything the collector CAN do to GitHub is
//     read-only by construction; this surface adds no edge of its own. The act edge (merge /
//     approve / dispatch) stays frozen — it is not wired here.
//
// THE LINK STANCE — the honest heart of a "links" surface:
//   The requirement is literally "GitHub links", yet every FounderGate surface is observably
//   read-only: it carries NO navigable link (no <a href>) so there is nothing an interaction
//   can ride. We honour BOTH: this surface DERIVES the exact canonical github.com URL for the
//   repo, each PR, each branch, each commit, and each file — and shows it as COPYABLE TEXT,
//   never as a clickable anchor. The founder can see and copy the precise link; the page
//   itself navigates nowhere and clicks nothing. "Here is the link" — not "let me take you
//   there".
//
// NEVER INVENT A LINK (Law 54): a URL is derived ONLY from clean components. If the repo is
// not in `owner/name` form, or a branch / SHA / file path is missing, redacted, or malformed,
// the surface says "no canonical link" out loud rather than fabricate a URL that could 404 or
// mislead. A guessed link is a lie with a domain name on it.
//
// TRUTH LABELLING: the collector stamps every bundle `source: "live-gh"` or `"fixture"` and
// never conflates the two. This surface carries that label to the top of the page — a founder
// always knows whether they are looking at a live GitHub read or a committed sample.

import { UNKNOWN } from "./cto-queue.mjs";

export const GITHUB_CARDS_VERSION = "1.0.0";
export const GITHUB_HOST = "https://github.com";

// The redaction marker the collector substitutes for secret-shaped leaves. If it survives into
// a URL component we refuse to build a link from it (a redacted branch/path is not navigable).
const REDACTED_MARK = "[REDACTED]";

// GitHub identity shapes. Owners are [A-Za-z0-9-] (start alnum, ≤39); repos add . and _.
const SAFE_OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const SAFE_REPO = /^[A-Za-z0-9._-]{1,100}$/;
// A git object id: 7–40 hex chars. NOT a secret (see collectors/github/redact.mjs).
const SHA_RE = /^[0-9a-f]{7,40}$/i;
// A conservative ref/path charset: alnum plus . _ - /. Anything outside → no link (honest).
const SAFE_PATH = /^[A-Za-z0-9._/-]+$/;

// A trimmed string, or "" — never a coerced object/number pretending to be text.
function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

// A non-negative integer, or null when it cannot be read. null means "not declared", said out
// loud — it is NEVER guessed to be 0 (Law 54).
function intOrNull(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

// repoSlug(repo) -> { owner, name, slug } for a clean "owner/name", else null. A repo that is
// not in owner/name form is not linkable and we say so rather than invent a URL.
export function repoSlug(repo) {
  const s = str(repo);
  const m = s.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!m) return null;
  const owner = m[1], name = m[2];
  if (!SAFE_OWNER.test(owner) || !SAFE_REPO.test(name)) return null;
  return { owner, name, slug: `${owner}/${name}` };
}

// A ref/path is safe when it is present, not redacted, has no traversal, and stays within the
// conservative charset. Segments are encoded but the "/" structure is preserved.
function isSafePath(ref) {
  return (
    typeof ref === "string" && ref !== "" &&
    !ref.includes(REDACTED_MARK) && !ref.includes("..") &&
    !ref.startsWith("/") && !ref.endsWith("/") &&
    SAFE_PATH.test(ref)
  );
}
function encodePath(ref) {
  return ref.split("/").map(encodeURIComponent).join("/");
}

// ── Canonical URL builders. Each returns a string URL or null. null == "no canonical link"
// (an honest absence), never a fabricated URL. All are pure. ────────────────────────────────
function repoUrlOf(slug) {
  return slug ? `${GITHUB_HOST}/${slug.owner}/${slug.name}` : null;
}
function pullUrlOf(slug, number) {
  return slug && Number.isInteger(number) && number > 0
    ? `${repoUrlOf(slug)}/pull/${number}`
    : null;
}
function branchUrlOf(slug, ref) {
  return slug && isSafePath(ref) ? `${repoUrlOf(slug)}/tree/${encodePath(ref)}` : null;
}
function commitUrlOf(slug, sha) {
  return slug && SHA_RE.test(str(sha)) ? `${repoUrlOf(slug)}/commit/${str(sha)}` : null;
}
// A file's blob URL, pinned to the head SHA when available (a stable link that survives new
// commits), else pinned to the branch. null when nothing clean is available to pin to.
function fileUrlOf(slug, sha, branch, path) {
  if (!slug || !isSafePath(path)) return null;
  if (SHA_RE.test(str(sha))) return `${repoUrlOf(slug)}/blob/${str(sha)}/${encodePath(path)}`;
  if (isSafePath(branch)) return `${repoUrlOf(slug)}/blob/${encodePath(branch)}/${encodePath(path)}`;
  return null;
}

// The known merge-state vocabulary, so an unexpected value is shown verbatim (escaped) rather
// than mapped to something it is not.
const MERGEABLE_TONE = Object.freeze({
  MERGEABLE: "ok",
  CONFLICTING: "warn",
  UNKNOWN: "muted",
});
const CI_TONE = Object.freeze({
  passing: "ok",
  failing: "bad",
  pending: "info",
  none: "muted",
});

// deriveCards(bundle) -> a PURE, frozen view over the collector's normalized bundle. It never
// mutates the input, never invents a field, and derives every link honestly (null when it
// cannot be built cleanly). Non-object / missing input degrades to an empty, honest view.
export function deriveCards(bundle) {
  const b = bundle && typeof bundle === "object" ? bundle : {};
  const source = b.source === "live-gh" ? "live-gh" : b.source === "fixture" ? "fixture" : UNKNOWN;
  const slug = repoSlug(b.repo);
  const repo = Object.freeze({
    slug: slug ? slug.slug : str(b.repo) || UNKNOWN,
    url: repoUrlOf(slug),
    linkable: slug !== null,
  });

  const rawPrs = Array.isArray(b.pullRequests) ? b.pullRequests : [];
  const prs = rawPrs.map((pr) => {
    const p = pr && typeof pr === "object" ? pr : {};
    const number = Number.isInteger(p.number) ? p.number : null;
    const branch = str(p.branch);
    const headSha = str(p.headSha);
    const ciRaw = p.ci && typeof p.ci === "object" ? p.ci : {};
    const ci = Object.freeze({
      state: str(ciRaw.state) || "none",
      total: intOrNull(ciRaw.total) ?? 0,
      passed: intOrNull(ciRaw.passed) ?? 0,
      failed: intOrNull(ciRaw.failed) ?? 0,
      pending: intOrNull(ciRaw.pending) ?? 0,
    });
    const rawFiles = Array.isArray(p.filesChanged) ? p.filesChanged : [];
    const files = rawFiles.map((f) => {
      const fname = str(f && f.filename) || UNKNOWN;
      return Object.freeze({
        filename: fname,
        status: str(f && f.status) || UNKNOWN,
        additions: intOrNull(f && f.additions),
        deletions: intOrNull(f && f.deletions),
        url: fileUrlOf(slug, headSha, branch, fname),
      });
    });
    return Object.freeze({
      number,
      title: str(p.title) || UNKNOWN,
      branch: branch || UNKNOWN,
      headSha: SHA_RE.test(headSha) ? headSha : (headSha || UNKNOWN),
      headShaShort: SHA_RE.test(headSha) ? headSha.slice(0, 7) : null,
      isDraft: p.isDraft === true,
      mergeable: str(p.mergeable) || UNKNOWN,
      mergeStateStatus: str(p.mergeStateStatus) || null,
      ci,
      copilotReviewed: p.copilotReviewed === true,
      copilotBoundToHead: p.copilotBoundToHead === true,
      unresolvedReviewThreads: intOrNull(p.unresolvedReviewThreads),
      unresolvedByCopilot: intOrNull(p.unresolvedByCopilot),
      filesChangedCount: intOrNull(p.filesChangedCount) ?? files.length,
      files: Object.freeze(files),
      links: Object.freeze({
        pr: pullUrlOf(slug, number),
        branch: branchUrlOf(slug, branch),
        commit: commitUrlOf(slug, headSha),
      }),
    });
  });

  return Object.freeze({
    source,
    collectedAt: str(b.collectedAt) || null,
    readOnly: true,
    repo,
    openPrCount: intOrNull(b.openPrCount) ?? prs.length,
    prs: Object.freeze(prs),
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const SOURCE_LABEL = Object.freeze({
  "live-gh": "Live GitHub read",
  fixture: "Fixture (committed sample — not live)",
  [UNKNOWN]: "Unknown source",
});

// ── Plain-text rendering (terminal/log + tests that assert content without HTML) ─────────────

// A link line: the label, then the URL as copyable text, or an honest "(no canonical link)".
function linkLine(label, url) {
  return `  ${label}: ${url ? url : "(no canonical link)"}`;
}

// renderCardsText(bundle) -> founder-readable plain text of the whole surface. Pure.
export function renderCardsText(bundle) {
  const v = deriveCards(bundle);
  const lines = [
    `GITHUB INTEGRATION CARDS — read-only; shows links, opens nothing, merges nothing`,
    `Source: ${SOURCE_LABEL[v.source]}`,
  ];
  if (v.collectedAt) lines.push(`Collected at: ${v.collectedAt}`);
  lines.push(`Repository: ${v.repo.slug}`);
  lines.push(linkLine("Repo link", v.repo.url));
  if (!v.repo.linkable) lines.push(`  (repo is not in owner/name form — no canonical GitHub link can be built)`);
  lines.push(`Open PRs: ${v.openPrCount}`);
  lines.push("");
  if (v.prs.length === 0) {
    lines.push("(no open pull requests in this bundle)");
    return lines.join("\n");
  }
  for (const pr of v.prs) {
    lines.push(`PR ${pr.number === null ? "(unnumbered)" : `#${pr.number}`} — ${pr.title}${pr.isDraft ? "  [DRAFT]" : ""}`);
    lines.push(`  Branch: ${pr.branch}   Head: ${pr.headShaShort || pr.headSha}`);
    lines.push(`  Mergeable: ${pr.mergeable}${pr.mergeStateStatus ? ` (${pr.mergeStateStatus})` : ""}`);
    lines.push(`  CI: ${pr.ci.state} — ${pr.ci.passed} passed · ${pr.ci.failed} failed · ${pr.ci.pending} pending (of ${pr.ci.total})`);
    lines.push(`  Copilot: ${pr.copilotReviewed ? (pr.copilotBoundToHead ? "reviewed, bound to current head" : "reviewed, NOT bound to current head (stale)") : "no Copilot review"}`);
    if (pr.unresolvedReviewThreads !== null) {
      lines.push(`  Unresolved review threads: ${pr.unresolvedReviewThreads}${pr.unresolvedByCopilot !== null ? ` (${pr.unresolvedByCopilot} from Copilot)` : ""}`);
    }
    lines.push(linkLine("PR link", pr.links.pr));
    lines.push(linkLine("Branch link", pr.links.branch));
    lines.push(linkLine("Head commit link", pr.links.commit));
    lines.push(`  Files changed (${pr.filesChangedCount}):`);
    if (pr.files.length === 0) {
      lines.push(`    (no files listed)`);
    } else {
      for (const f of pr.files) {
        const delta = `+${f.additions === null ? "?" : f.additions}/-${f.deletions === null ? "?" : f.deletions}`;
        lines.push(`    ${f.status}  ${f.filename}  ${delta}`);
        lines.push(`      ${f.url ? f.url : "(no canonical link)"}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n").replace(/\n+$/, "");
}

// ── HTML rendering (pure display; no behaviour) ──────────────────────────────────────────────

// A URL shown as copyable text — a <code> element, NOT an anchor. There is deliberately no
// href here: the founder can select and copy the exact link; the page navigates nowhere.
function urlCode(url) {
  return url
    ? `<code class="fg-url">${escapeHtml(url)}</code>`
    : `<span class="fg-nolink">no canonical link</span>`;
}

function chip(text, tone) {
  return `<span class="fg-chip fg-tone-${escapeHtml(tone)}">${escapeHtml(text)}</span>`;
}

function renderRepoHtml(v) {
  return [
    `  <section class="fg-repo" aria-readonly="true">`,
    `    <div class="fg-head-row">`,
    `      ${chip(SOURCE_LABEL[v.source], v.source === "live-gh" ? "info" : v.source === "fixture" ? "muted" : "warn")}`,
    v.collectedAt ? `      <span class="fg-collected">collected ${escapeHtml(v.collectedAt)}</span>` : ``,
    `    </div>`,
    `    <h2 class="fg-repo-name">${escapeHtml(v.repo.slug)}</h2>`,
    `    <div class="fg-link-row"><span class="fg-link-label">Repository</span>${urlCode(v.repo.url)}</div>`,
    v.repo.linkable ? `` : `    <p class="fg-note">This repository is not in <code>owner/name</code> form, so no canonical GitHub link can be built for it.</p>`,
    `    <p class="fg-note">Links below are shown as text you can copy. This surface opens nothing, clicks nothing, and merges nothing — it only shows you where each thing lives on GitHub.</p>`,
    `    <div class="fg-stat-row">`,
    `      <div class="fg-stat"><span class="fg-stat-value">${escapeHtml(v.openPrCount)}</span><span class="fg-stat-label">Open PRs</span></div>`,
    `    </div>`,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

function renderFileHtml(f) {
  const delta = `+${f.additions === null ? "?" : f.additions} / -${f.deletions === null ? "?" : f.deletions}`;
  return [
    `        <li class="fg-file">`,
    `          <div class="fg-file-head"><span class="fg-file-status">${escapeHtml(f.status)}</span><span class="fg-file-name">${escapeHtml(f.filename)}</span><span class="fg-file-delta">${escapeHtml(delta)}</span></div>`,
    `          <div class="fg-file-link">${urlCode(f.url)}</div>`,
    `        </li>`,
  ].join("\n");
}

function renderPrHtml(pr) {
  const ciText = `CI ${pr.ci.state} · ${pr.ci.passed}✓ ${pr.ci.failed}✗ ${pr.ci.pending}…`;
  const copilot = pr.copilotReviewed
    ? (pr.copilotBoundToHead ? "Copilot: bound to head" : "Copilot: stale (not on head)")
    : "Copilot: none";
  const copilotTone = pr.copilotReviewed ? (pr.copilotBoundToHead ? "ok" : "warn") : "muted";
  const badges = [
    pr.isDraft ? chip("Draft", "muted") : "",
    chip(pr.mergeable + (pr.mergeStateStatus ? ` · ${pr.mergeStateStatus}` : ""), MERGEABLE_TONE[pr.mergeable] || "muted"),
    chip(ciText, CI_TONE[pr.ci.state] || "muted"),
    chip(copilot, copilotTone),
  ].filter(Boolean);
  const threads =
    pr.unresolvedReviewThreads !== null
      ? `      <div class="fg-note">Unresolved review threads: ${escapeHtml(pr.unresolvedReviewThreads)}${pr.unresolvedByCopilot !== null ? ` (${escapeHtml(pr.unresolvedByCopilot)} from Copilot)` : ""}</div>`
      : ``;
  const files =
    pr.files.length === 0
      ? `      <p class="fg-empty">No files listed for this PR.</p>`
      : [`      <ul class="fg-file-list">`, ...pr.files.map(renderFileHtml), `      </ul>`].join("\n");
  return [
    `  <section class="fg-pr" aria-readonly="true">`,
    `    <div class="fg-pr-head">`,
    `      <span class="fg-pr-num">${pr.number === null ? "PR" : `#${escapeHtml(pr.number)}`}</span>`,
    `      <span class="fg-pr-title">${escapeHtml(pr.title)}</span>`,
    `    </div>`,
    `    <div class="fg-badges">${badges.join("")}</div>`,
    `    <div class="fg-link-row"><span class="fg-link-label">Pull request</span>${urlCode(pr.links.pr)}</div>`,
    `    <div class="fg-link-row"><span class="fg-link-label">Branch <code>${escapeHtml(pr.branch)}</code></span>${urlCode(pr.links.branch)}</div>`,
    `    <div class="fg-link-row"><span class="fg-link-label">Head commit ${pr.headShaShort ? `<code>${escapeHtml(pr.headShaShort)}</code>` : ""}</span>${urlCode(pr.links.commit)}</div>`,
    threads,
    `    <h3>Files changed (${escapeHtml(pr.filesChangedCount)})</h3>`,
    files,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

// renderCardsHtml(bundle) -> the composed card body (repo card + one card per PR) as an HTML
// fragment. Pure display; no <script>/form/button/input/on*/href.
export function renderCardsHtml(bundle) {
  const v = deriveCards(bundle);
  const parts = [renderRepoHtml(v)];
  if (v.prs.length === 0) {
    parts.push(`  <section aria-readonly="true"><p class="fg-empty">No open pull requests in this bundle.</p></section>`);
  } else {
    for (const pr of v.prs) parts.push(renderPrHtml(pr));
  }
  return parts.join("\n");
}

// The self-contained style. Inlined so the rendered page is a PORTABLE evidence artifact that
// stands alone, using the shared founder palette for visual kinship. Style only — no behaviour.
// Colour law: red is reserved for genuine problems (failing CI); routine states stay calm.
const SURFACE_STYLE = `
    :root{
      --bg:#0d1117;--panel:#161c26;--panel2:#1b2230;--line:#2a3344;
      --text:#e6ebf2;--muted:#93a0b4;--dim:#6b7789;
      --blue:#3b82f6;--green:#22c55e;--amber:#f5b83d;--purple:#a78bfa;--red:#f26d6d;--radius:12px;
    }
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);
      font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
    .fg-wrap{max-width:920px;margin:0 auto;padding:32px 20px 56px}
    .fg-eyebrow{color:var(--purple);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600}
    h1{font-size:27px;margin:.2em 0 .1em}
    h2{font-size:16px;margin:0 0 .4em}
    h3{font-size:13.5px;margin:16px 0 .3em;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
    .fg-sub{color:var(--muted);margin:0 0 24px}
    .fg-note{color:var(--muted);font-size:12.5px;margin:.1em 0 10px}
    section{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
      padding:18px 20px;margin:0 0 20px}
    .fg-head-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
    .fg-collected{color:var(--dim);font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .fg-repo-name{font-size:19px;word-break:break-all}
    .fg-stat-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px}
    .fg-stat{background:var(--panel2);border:1px solid var(--line);border-radius:10px;
      padding:12px 16px;display:flex;flex-direction:column;gap:2px}
    .fg-stat-value{font-size:24px;font-weight:700}
    .fg-stat-label{color:var(--muted);font-size:12.5px}
    .fg-pr-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
    .fg-pr-num{font-weight:700;color:var(--purple);font-size:16px}
    .fg-pr-title{font-weight:600;flex:1 1 auto}
    .fg-badges{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px}
    .fg-chip{font-size:11.5px;border-radius:999px;padding:1px 9px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
    .fg-tone-ok{color:var(--green);border-color:rgba(34,197,94,.4)}
    .fg-tone-bad{color:var(--red);border-color:rgba(242,109,109,.5)}
    .fg-tone-warn{color:var(--amber);border-color:rgba(245,184,61,.45)}
    .fg-tone-info{color:var(--blue);border-color:rgba(59,130,246,.4)}
    .fg-tone-muted{color:var(--muted)}
    .fg-link-row{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin:0 0 6px}
    .fg-link-label{color:var(--muted);font-size:12.5px;min-width:130px}
    .fg-url{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--text);
      background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:1px 7px;word-break:break-all;user-select:all}
    .fg-nolink{color:var(--dim);font-size:12px;font-style:italic}
    .fg-file-list{list-style:none;margin:0;padding:0}
    .fg-file{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:0 0 8px;background:var(--panel2)}
    .fg-file-head{display:flex;align-items:baseline;gap:8px}
    .fg-file-status{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);
      border:1px solid var(--line);border-radius:999px;padding:0 7px}
    .fg-file-name{font-weight:600;flex:1 1 auto;word-break:break-all}
    .fg-file-delta{color:var(--dim);font-size:12px;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .fg-file-link{margin-top:5px}
    .fg-empty{color:var(--muted)}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--text)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

// renderSurfaceHtml(bundle) -> a COMPLETE, self-contained founder-readable page. Pure: same
// bundle in, byte-identical page out (no clock, no randomness). It carries NO <script>, <form>,
// <button>, <input>, on* handler, or navigable link (<a href>) — observably read-only.
export function renderSurfaceHtml(bundle) {
  const v = deriveCards(bundle);
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>GitHub Integration Cards — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>GitHub Integration Cards</h1>`,
    `    <p class="fg-sub">The repository, each open pull request, its branch, and its changed files — each with the exact GitHub link, shown as text you can copy. This surface reads the collector's already-gathered, redacted data; it opens no network, clicks nothing, and merges nothing.</p>`,
    renderCardsHtml(bundle),
    `    <p class="fg-foot">Read-only view · every link is shown as copyable text, never a clickable anchor · the act edge (merge / approve / dispatch) is not wired here.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

// renderSurfaceText(bundle) -> plain-text dedicated surface. Pure. Convenience alias so callers
// have a symmetric {Html,Text} pair like the other VB2 surfaces.
export function renderSurfaceText(bundle) {
  return renderCardsText(bundle);
}
