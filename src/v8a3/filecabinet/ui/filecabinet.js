// FounderGate V8-A3 — File Cabinet frontend (vanilla ES module).
//
// Renders the tree grouped by category with a data-class badge on EVERY file, and
// previews/copies/downloads a file only when the server (cabinet.mjs) allows it —
// SECRET/UNKNOWN/PRODUCTION_DATA show a warm, honest "blocked" note instead of
// content. Plain language; no scary words; the raw class token is shown verbatim
// with a plain companion.

const $ = (id) => document.getElementById(id);

// Raw data-class token -> { plain companion, badge kind }. Token kept verbatim.
const CLASS_INFO = {
  PUBLIC_SAFE: { plain: "safe to read", kind: "ok" },
  PROJECT_INTERNAL: { plain: "project file", kind: "" },
  PRIVATE_FOUNDER_DATA: { plain: "your private notes", kind: "" },
  DO_NOT_EXPORT: { plain: "view only — don't export", kind: "warn" },
  PRODUCTION_DATA: { plain: "needs a gate", kind: "lock" },
  SECRET: { plain: "protected — hidden", kind: "lock" },
  UNKNOWN: { plain: "not sorted yet", kind: "lock" },
};
function badgeEl(dataClass) {
  const info = CLASS_INFO[dataClass] || { plain: "unknown", kind: "lock" };
  const s = document.createElement("span");
  s.className = "badge " + info.kind;
  s.textContent = `${dataClass} · ${info.plain}`;
  s.dataset.class = dataClass;
  return s;
}

async function api(path) { return await (await fetch(path)).json(); }

let currentTree = null;

function renderTree(tree) {
  const root = $("tree");
  root.innerHTML = "";
  const cats = Object.keys(tree.categories).sort();
  for (const cat of cats) {
    const h = document.createElement("button");
    h.className = "cathead";
    h.type = "button";
    h.setAttribute("aria-expanded", "true");
    h.innerHTML = `<span class="caret">▾</span> ${cat} <span class="count">${tree.categories[cat].length}</span>`;
    const group = document.createElement("div");
    group.className = "catgroup";
    h.addEventListener("click", () => {
      const open = group.hidden;
      group.hidden = !open;
      h.setAttribute("aria-expanded", String(open));
      h.querySelector(".caret").textContent = open ? "▾" : "▸";
    });
    root.appendChild(h);
    root.appendChild(group);
    for (const f of tree.categories[cat]) {
      const row = document.createElement("div");
      row.className = "filerow" + (f.access.preview ? "" : " locked");
      row.dataset.path = f.path;
      row.setAttribute("data-class", f.data_class);
      const nm = document.createElement("span");
      nm.className = "filename";
      nm.textContent = (f.access.preview ? "" : "🔒 ") + f.path;
      row.append(nm, badgeEl(f.data_class));
      row.addEventListener("click", () => openFile(f));
      group.appendChild(row);
    }
  }
}

async function openFile(f) {
  $("viewer-empty").hidden = true;
  $("viewer-head").hidden = false;
  $("viewer-name").textContent = f.path;
  $("viewer-badge").replaceWith(Object.assign(badgeEl(f.data_class), { id: "viewer-badge" }));
  $("action-result").textContent = "";
  const body = $("viewer-body"), blocked = $("viewer-blocked");
  const copyBtn = $("copy-btn"), dlBtn = $("download-btn");

  const r = await api(`/api/cabinet/file?action=preview&path=${encodeURIComponent(f.path)}`);
  if (r.allowed) {
    body.hidden = false; blocked.hidden = true;
    body.textContent = r.content;
    copyBtn.hidden = !f.access.copy;
    dlBtn.hidden = !f.access.download;
  } else {
    body.hidden = true; blocked.hidden = false;
    blocked.textContent = r.reason || "This file can't be shown.";
    copyBtn.hidden = true; dlBtn.hidden = true;
  }
  document.body.dataset.opened = f.data_class;

  copyBtn.onclick = async () => {
    const c = await api(`/api/cabinet/file?action=copy&path=${encodeURIComponent(f.path)}`);
    $("action-result").textContent = c.allowed ? "Copied text is ready." : c.reason;
  };
  dlBtn.onclick = async () => {
    const d = await api(`/api/cabinet/file?action=download&path=${encodeURIComponent(f.path)}`);
    $("action-result").textContent = d.allowed ? "This file is allowed to download." : d.reason;
  };
}

$("pause-button").addEventListener("click", () => {
  $("pause-button").textContent = "✓ Paused — help is on the way";
});

(async () => {
  currentTree = await api("/api/cabinet/tree");
  renderTree(currentTree);
  document.body.dataset.rendered = "true";
})();
