// Renders the founder-operator panel view-model to accessible, self-contained HTML.
// Founder mode: plain-English, semantic, NO full SHAs. Developer mode: technical.
import { buildPanel } from './panel.mjs';
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const li = (arr) => (arr && arr.length ? arr : ['UNKNOWN']).map(x => `<li>${esc(x)}</li>`).join('');

export function founderHtml(snapshot) {
  const vm = buildPanel(snapshot);
  const c = vm.chips;
  const zip = vm.evidenceZip.available
    ? `<button id="download-evidence" type="button">${esc(vm.evidenceZip.label)}</button>`
    : `<button id="download-evidence" type="button" disabled aria-disabled="true">Download evidence ZIP — unavailable (${esc(vm.evidenceZip.reason)})</button>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FounderGate — Founder View</title></head>
<body>
<header><h1>FounderGate — Founder View</h1></header>
<main>
<p id="status-line" role="status">${esc(vm.statusLine)}</p>
<section aria-labelledby="checks-h"><h2 id="checks-h">Checks</h2>
<ul id="chips">
<li id="chip-freshness">Evidence freshness: ${esc(c.freshness)}</li>
<li id="chip-tests">Tests: ${esc(c.tests)}</li>
<li id="chip-checker">Independent Checker: ${esc(c.checker)}</li>
<li id="chip-gate">Gate Advisor: ${esc(c.gate)}</li>
<li id="chip-beta">Accepted beta slice: ${esc(c.beta)}</li>
${c.buildLabel !== 'UNKNOWN' ? `<li id="chip-build">Build: ${esc(c.buildLabel)}</li>` : ''}
</ul></section>
<section aria-labelledby="proves-h"><h2 id="proves-h">What this proves</h2><ul id="proves">${li(vm.panels.proves)}</ul></section>
<section aria-labelledby="notproves-h"><h2 id="notproves-h">What this does NOT prove</h2><ul id="not-proves">${li(vm.panels.notProves)}</ul></section>
<section aria-labelledby="next-h"><h2 id="next-h">Next safe action</h2><p id="next-action">${esc(vm.panels.nextAction)}</p></section>
<section aria-labelledby="gated-h"><h2 id="gated-h">Still founder-gated</h2><ul id="founder-gated">${li(vm.panels.founderGated)}</ul></section>
<section aria-labelledby="export-h"><h2 id="export-h">Evidence</h2>${zip}</section>
</main>
<footer>Local, internal demo. Never “ship”. Not production, not secure, not a customer/SaaS product.</footer>
</body></html>`;
}

export function developerHtml(snapshot) {
  const vm = buildPanel(snapshot);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FounderGate — Developer View</title></head>
<body><header><h1>FounderGate — Developer/Reviewer View</h1></header><main>
<pre id="dev">head_sha=${esc(vm._dev.headSha||'n/a')}
branch=${esc(vm._dev.branch||'n/a')}
chips=${esc(JSON.stringify(vm.chips))}
guard_outputs=${esc(JSON.stringify(vm._dev.guardOutputs))}
unknowns=${esc(JSON.stringify(vm.unknowns))}</pre>
</main></body></html>`;
}
