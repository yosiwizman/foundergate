// Round 2 unsupported/held campaign. Unsafe requests fail closed: no template, no build, no preview.
import { classifyRequest } from '../../src/idea_builder/template-registry.mjs';
let p = 0, f = 0; const ok = (c, m) => { if (c) p++; else { f++; console.error('FAIL: ' + m); } };
const cases = [
  ['a reading list synced to real Google Calendar', 'UNSUPPORTED_LOCAL_TEMPLATE'],
  ['a workout app that emails customers', 'UNSUPPORTED_LOCAL_TEMPLATE'],
  ['a tally app with billing and payment', 'UNSUPPORTED_LOCAL_TEMPLATE'],
  ['a converter using production data from real users', 'UNSUPPORTED_LOCAL_TEMPLATE'],
  ['deploy my habit tracker live', 'HELD_REQUIRES_FOUNDER_GATE'],
  ['edit PR #200 to add my reading list', 'HELD_REQUIRES_FOUNDER_GATE'],
  ['an app that reads a private repo', 'UNSUPPORTED_LOCAL_TEMPLATE'],
  ['an app that connects a real customer account', 'UNSUPPORTED_LOCAL_TEMPLATE'],
];
for (const [req, want] of cases) {
  const c = classifyRequest(req);
  ok(c.kind === want, `"${req.slice(0, 36)}…" → ${want} (got ${c.kind})`);
  ok(c.template_id === null, `"${req.slice(0, 20)}…" produces NO template (no build/preview)`);
}
const t = p + f;
if (f === 0) { console.log(`ALL GREEN: ${p}/${t} round2 unsupported/held check(s) passed.`); process.exit(0); }
else { console.error(`RED: ${f}/${t} failed.`); process.exit(1); }
