// FounderGate V8-A3 — File Cabinet frontend (vanilla ES module).
//
// Renders the classified file tree with a data-class badge on EVERY file, and
// previews/copies/downloads a file ONLY when the server (cabinet.mjs) allows it —
// SECRET/UNKNOWN/PRODUCTION_DATA show a warm, honest "blocked" note instead of
// content. L3 (Run-5 readability): a LIST/READING view toggle, sort controls, a
// filename search, and a dimmed shared path-prefix so similar names scan fast.
//
// READ-ONLY: no upload, no paste-a-folder, no rearrange-on-disk. Sort/search/view
// are PURE PRESENTATION — they never fetch content; the ONLY content request is in
// openFile(), and the server decides access. Blocked files keep the calm-lock
// treatment in every view.

const $ = (id) => document.getElementById(id);

// Raw data-class token -> { plain companion, badge kind, blocked }. Token kept verbatim.
const CLASS_INFO = {
  PUBLIC_SAFE: { plain: "safe to read", kind: "ok", blocked: false, rank: 0 },
  PROJECT_INTERNAL: { plain: "project file", kind: "", blocked: false, rank: 1 },
  PRIVATE_FOUNDER_DATA: { plain: "your private notes", kind: "", blocked: false, rank: 2 },
  DO_NOT_EXPORT: { plain: "view only — don't export", kind: "warn", blocked: false, rank: 3 },
  PRODUCTION_DATA: { plain: "needs a gate", kind: "lock", blocked: true, rank: 4 },
  SECRET: { plain: "protected — hidden", kind: "secret", blocked: true, rank: 5 },
  UNKNOWN: { plain: "not sorted yet", kind: "lock", blocked: true, rank: 6 },
};
const LOCK_GLYPH = "🔒";
const isBlockedClass = (dc) => { const i = CLASS_INFO[dc]; return i ? !!i.blocked : true; }; // unknown -> blocked (fail-safe)

function badgeEl(dataClass) {
  const info = CLASS_INFO[dataClass] || { plain: "unknown", kind: "lock", blocked: true };
  const s = document.createElement("span");
  s.className = "badge " + info.kind + (info.blocked ? " blocked" : "");
  s.textContent = (info.blocked ? LOCK_GLYPH + " " : "") + `${dataClass} · ${info.plain}`;
  s.dataset.class = dataClass;
  return s;
}

// (d) de-emphasise the shared path prefix (e.g. ".foundergate/") so the distinctive
// tail is what your eye lands on.
function splitPath(p) { const i = p.lastIndexOf("/"); return i < 0 ? ["", p] : [p.slice(0, i + 1), p.slice(i + 1)]; }
function fileNameEl(path) {
  const [prefix, tail] = splitPath(path);
  const wrap = document.createElement("span");
  wrap.className = "filename";
  if (prefix) { const p = document.createElement("span"); p.className = "path-prefix"; p.textContent = prefix; wrap.appendChild(p); }
  const t = document.createElement("span"); t.className = "path-tail"; t.textContent = tail; wrap.appendChild(t);
  return wrap;
}

async function api(path) { return await (await fetch(path)).json(); }

const state = { tree: null, view: "list", sort: "category", search: "", blockedOnly: false };

function matches(f) {
  if (!state.search) return true;
  const q = state.search.toLowerCase();
  const [, tail] = splitPath(f.path);
  return tail.toLowerCase().includes(q) || f.path.toLowerCase().includes(q); // matches the distinctive tail
}
function passesBlocked(f) { return !state.blockedOnly || isBlockedClass(f.data_class); }

function rowEl(f) {
  const blockedFile = isBlockedClass(f.data_class);
  const row = document.createElement("div");
  row.className = "filerow" + (f.access.preview ? "" : " locked") + (blockedFile ? " blocked" : "");
  row.dataset.path = f.path;
  if (blockedFile) row.dataset.blocked = "true";
  row.setAttribute("data-class", f.data_class);
  const left = document.createElement("span");
  left.className = "fileleft";
  if (blockedFile) { const m = document.createElement("span"); m.className = "row-lock"; m.textContent = LOCK_GLYPH; m.setAttribute("aria-hidden", "true"); left.appendChild(m); }
  left.appendChild(fileNameEl(f.path));
  row.append(left, badgeEl(f.data_class));
  row.addEventListener("click", () => openFile(f));
  return row;
}

function allFiles() { return state.tree.files.filter((f) => matches(f) && passesBlocked(f)); }

function renderGrouped() {
  const root = $("tree"); root.innerHTML = "";
  const cats = Object.keys(state.tree.categories).sort();
  for (const cat of cats) {
    const files = state.tree.categories[cat].filter((f) => matches(f) && passesBlocked(f)).sort((a, b) => a.path.localeCompare(b.path));
    if (!files.length) continue;
    const h = document.createElement("button");
    h.className = "cathead"; h.type = "button"; h.setAttribute("aria-expanded", "true");
    h.innerHTML = `<span class="caret">▾</span> ${cat} <span class="count">${files.length}</span>`;
    const group = document.createElement("div"); group.className = "catgroup";
    h.addEventListener("click", () => { const open = group.hidden; group.hidden = !open; h.setAttribute("aria-expanded", String(open)); h.querySelector(".caret").textContent = open ? "▾" : "▸"; });
    root.append(h, group);
    for (const f of files) group.appendChild(rowEl(f));
  }
  emptyNote(root);
}

function renderFlat() {
  const root = $("tree"); root.innerHTML = "";
  const files = allFiles().slice();
  const byName = (a, b) => splitPath(a.path)[1].localeCompare(splitPath(b.path)[1]);
  if (state.sort === "name") files.sort(byName);
  else if (state.sort === "class") files.sort((a, b) => ((CLASS_INFO[b.data_class]?.rank ?? 9) - (CLASS_INFO[a.data_class]?.rank ?? 9)) || byName(a, b));
  else if (state.sort === "changed") files.sort((a, b) => (b.mtime || 0) - (a.mtime || 0) || byName(a, b));
  const list = document.createElement("div"); list.className = "catgroup flat";
  for (const f of files) list.appendChild(rowEl(f));
  root.appendChild(list);
  emptyNote(root);
}

function emptyNote(root) {
  if (!root.querySelector(".filerow")) {
    const e = document.createElement("p"); e.className = "hint"; e.style.padding = "10px";
    e.textContent = state.search ? `No file names match “${state.search}”.` : "Nothing to show.";
    root.appendChild(e);
  }
}

function render() {
  $("cabinet").className = "cabinet view-" + state.view;
  if (state.sort === "category") renderGrouped(); else renderFlat();
}

async function openFile(f) {
  $("viewer-empty").hidden = true;
  $("viewer-head").hidden = false;
  $("viewer-name").textContent = f.path;
  $("viewer-badge").replaceWith(Object.assign(badgeEl(f.data_class), { id: "viewer-badge" }));
  $("action-result").textContent = "";
  const body = $("viewer-body"), blocked = $("viewer-blocked");
  const copyBtn = $("copy-btn"), dlBtn = $("download-btn");

  // The ONLY content request — the server (cabinet.mjs) decides access.
  const r = await api(`/api/cabinet/file?action=preview&path=${encodeURIComponent(f.path)}`);
  if (r.allowed) {
    body.hidden = false; blocked.hidden = true; body.textContent = r.content;
    copyBtn.hidden = !f.access.copy; dlBtn.hidden = !f.access.download;
  } else {
    body.hidden = true; blocked.hidden = false; blocked.textContent = r.reason || "This file can't be shown.";
    copyBtn.hidden = true; dlBtn.hidden = true;
  }
  document.body.dataset.opened = f.data_class;

  copyBtn.onclick = async () => { const c = await api(`/api/cabinet/file?action=copy&path=${encodeURIComponent(f.path)}`); $("action-result").textContent = c.allowed ? "Copied text is ready." : c.reason; };
  dlBtn.onclick = async () => { const d = await api(`/api/cabinet/file?action=download&path=${encodeURIComponent(f.path)}`); $("action-result").textContent = d.allowed ? "This file is allowed to download." : d.reason; };
}

// ---- controls (all pure presentation) ----
function setView(v) {
  state.view = v; render();
  $("view-list-btn").classList.toggle("active", v === "list");
  $("view-gallery-btn").classList.toggle("active", v === "gallery");
  $("view-list-btn").setAttribute("aria-pressed", String(v === "list"));
  $("view-gallery-btn").setAttribute("aria-pressed", String(v === "gallery"));
}
$("view-list-btn").addEventListener("click", () => setView("list"));
$("view-gallery-btn").addEventListener("click", () => setView("gallery"));
$("sort-select").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
$("search-box").addEventListener("input", (e) => { state.search = e.target.value.trim(); render(); });
$("show-blocked-btn").addEventListener("click", () => {
  state.blockedOnly = !state.blockedOnly; render();
  const btn = $("show-blocked-btn");
  btn.setAttribute("aria-pressed", String(state.blockedOnly));
  btn.textContent = state.blockedOnly ? "↩ Show all files" : "🔒 Only protected & blocked";
});
$("pause-button").addEventListener("click", () => { $("pause-button").textContent = "✓ Paused — help is on the way"; });

// Do-not-touch banner — the FULL list, relocated from the dashboard. Built from the
// server's read-only locks list (Law 54); DOM-built (no innerHTML) for safety.
function renderDoNotTouch(list) {
  const el = document.getElementById("dnt-list");
  if (!el) return;
  el.textContent = "";
  if (!list || !list.length) { el.textContent = "none recorded — the harness will list protected files here."; return; }
  list.forEach((d, i) => {
    if (i) el.append(" · ");
    const b = document.createElement("b"); b.textContent = d.path;
    el.append(b, document.createTextNode(` — ${d.reason}`));
  });
  el.append(document.createTextNode(" They keep your project safe."));
}

(async () => {
  state.tree = await api("/api/cabinet/tree");
  renderDoNotTouch(state.tree.doNotTouch);
  render();
  document.body.dataset.rendered = "true";
})();
