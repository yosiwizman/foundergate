import { PACKAGES } from '../package-index.mjs';
import { assertReadOnly, CAPABILITIES } from '../readonly-model.mjs';
window.addEventListener('DOMContentLoaded', () => {
  assertReadOnly(CAPABILITIES); // hard guard: no mutation capabilities on this surface
  const tbody = document.getElementById('pkg-rows');
  document.getElementById('pkg-count').textContent = String(PACKAGES.length);
  for (const p of PACKAGES) {
    const tr = document.createElement('tr');
    const short = p.sha256.slice(0, 16) + '…';
    tr.innerHTML = `<td class="val">${p.name}</td><td class="val">${short}</td><td class="val">${p.bytes}</td>`;
    tbody.appendChild(tr);
  }
});
