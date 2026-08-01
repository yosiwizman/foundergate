import { PACKAGES } from '../package-index.mjs';
import { PACKAGE_DETAILS } from '../package-details.mjs';
import { assertReadOnly, CAPABILITIES } from '../readonly-model.mjs';
window.addEventListener('DOMContentLoaded', () => {
  assertReadOnly(CAPABILITIES); // hard read-only guard
  document.getElementById('pkg-count').textContent = String(PACKAGES.length);
  const tbody = document.getElementById('pkg-rows');
  for (const p of PACKAGES) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="val">${p.name}</td><td class="val">${p.sha256.slice(0,16)}…</td><td class="val">${p.bytes}</td>`;
    tbody.appendChild(tr);
  }
  // openable drawers for packages we have real details for
  const host = document.getElementById('drawers');
  document.getElementById('detail-count').textContent = String(PACKAGE_DETAILS.length);
  for (const d of PACKAGE_DETAILS) {
    const det = document.createElement('details'); det.className = 'pkg-drawer'; det.setAttribute('data-testid','pkg-drawer');
    const files = d.manifest.map(f => `<li class="val">${f}</li>`).join('');
    const sample = d.sample_text ? `<h4>${d.sample_file} (read-only)</h4><pre>${d.sample_text.replace(/[<>&]/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>` : '<p>(no text sample)</p>';
    det.innerHTML = `<summary>${d.name}</summary><p class="val">SHA-256: ${d.sha256}</p><p><strong>Manifest (${d.manifest.length} files):</strong></p><ul>${files}</ul>${sample}`;
    host.appendChild(det);
  }
});
