// FounderGate V8-A3 — File Cabinet frontend (vanilla ES module).
//
// Renders the tree grouped by category with a data-class badge on EVERY file, and
// previews/copies/downloads a file only when the server (cabinet.mjs) allows it —
// SECRET/UNKNOWN/PRODUCTION_DATA show a warm, honest "blocked" note instead of
// content. Plain language; no scary words; the raw class token is shown verbatim
// with a plain companion.

const $ = (id) => document.getElementById(id);

// Raw data-class token -> { plain companion, badge kind, blocked }. Token kept verbatim.
// `blocked: true` marks the hidden/gated classes (SECRET / UNKNOWN / PRODUCTION_DATA)
// so they get a loud, distinct treatment a non-developer can spot without reading.
const CLASS_INFO = {
  PUBLIC_SAFE: { plain: "safe to read", kind: "ok", blocked: false },
  PROJECT_INTERNAL: { plain: "project file", kind: "", blocked: false },
  PRIVATE_FOUNDER_DATA: { plain: "your private notes", kind: "", blocked: false },
  DO_NOT_EXPORT: { plain: "view only — don't export", kind: "warn", blocked: false },
  PRODUCTION_DATA: { plain: "needs a gate", kind: "lock", blocked: true },
  SECRET: { plain: "protected — hidden", kind: "lock", blocked: true },
  UNKNOWN: { plain: "not sorted yet", kind: "lock", blocked: true },
};
const LOCK_GLYPH = "🔒";
function isBlockedClass(dataClass) {
  const info = CLASS_INFO[dataClass];
  return info ? !!info.blocked : true; // unknown token -> treat as blocked (fail-safe)
}
function badgeEl(dataClass) {
  const info = CLASS_INFO[dataClass] || { plain: "unknown", kind: "lock", blocked: true };
  const s = document.createElement("span");
  s.className = "badge " + info.kind + (info.blocked ? " blocked" : "");
  s.textContent = (info.blocked ? LOCK_GLYPH + " " : "") + `${dataClass} · ${info.plain}`;
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
      const blockedFile = isBlockedClass(f.data_class);
      const row = document.createElement("div");
      row.className = "filerow" + (f.access.preview ? "" : " locked") + (blockedFile ? " blocked" : "");
      row.dataset.path = f.path;
      if (blockedFile) row.dataset.blocked = "true";
      row.setAttribute("data-class", f.data_class);
      const left = document.createElement("span");
      left.className = "fileleft";
      // A loud lock marker on blocked rows so protected files are obvious at a glance.
      if (blockedFile) {
        const mark = document.createElement("span");
        mark.className = "row-lock";
        mark.textContent = LOCK_GLYPH;
        mark.setAttribute("aria-hidden", "true");
        left.appendChild(mark);
      }
      const nm = document.createElement("span");
      nm.className = "filename";
      nm.textContent = f.path;
      left.appendChild(nm);
      row.append(left, badgeEl(f.data_class));
      row.addEventListener("click", () => openFile(f));
      group.appendChild(row);
    }
  }
  applyBlockedFilter(blockedFilterOn); // keep filter state after a re-render
}

// One-click "show only protected & blocked files" filter. Purely visual — the
// server still decides access; this only hides the safe rows so blocked ones
// are easy to find. Categories with no blocked files are hidden while filtering.
let blockedFilterOn = false;
function applyBlockedFilter(on) {
  blockedFilterOn = on;
  const root = $("tree");
  root.classList.toggle("filter-blocked", on);
  root.querySelectorAll(".catgroup").forEach((group) => {
    const head = group.previousElementSibling;
    const rows = [...group.querySelectorAll(".filerow")];
    const hasBlocked = rows.some((r) => r.classList.contains("blocked"));
    rows.forEach((r) => {
      r.style.display = on && !r.classList.contains("blocked") ? "none" : "";
    });
    if (head) head.style.display = on && !hasBlocked ? "none" : "";
    if (on && hasBlocked) {
      group.hidden = false; // force-open groups that hold blocked files
      if (head) {
        head.setAttribute("aria-expanded", "true");
        const caret = head.querySelector(".caret");
        if (caret) caret.textContent = "▾";
      }
    }
  });
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

$("show-blocked-btn").addEventListener("click", () => {
  const btn = $("show-blocked-btn");
  const on = !blockedFilterOn;
  applyBlockedFilter(on);
  btn.setAttribute("aria-pressed", String(on));
  btn.textContent = on ? "↩ Show all files" : "🔒 Show only protected & blocked files";
});

(async () => {
  currentTree = await api("/api/cabinet/tree");
  renderTree(currentTree);
  document.body.dataset.rendered = "true";
})();
