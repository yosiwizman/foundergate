// Dependency-free self-test for evidence-note.mjs. No network, no framework.
import { buildEvidenceNote, renderEvidenceNoteText } from './evidence-note.mjs';

let total = 0;
let passed = 0;

function check(name, condition) {
  total++;
  if (condition) {
    passed++;
  } else {
    console.error(`FAIL: ${name}`);
  }
}

const fullInput = {
  project_name: 'Demo Project',
  objective: 'Prove local evidence note generation works honestly.',
  evaluated_sha: 'abc1234',
  tests: '10/10 unit tests passed',
  checker_verdict: 'PASS',
  advisor_verdict: 'PASS',
  limitations: ['Not independently verified', 'No production data used'],
  decision: 'SAFE_TO_CONTINUE_INTERNAL_ONLY',
};

// 1. Full input renders all sections, with no unknowns.
const fullNote = buildEvidenceNote(fullInput);
const fullText = renderEvidenceNoteText(fullNote);
check('full input: no unknowns', fullNote.unknowns.length === 0);
check('full input: contains project name', fullText.includes('Demo Project'));
check('full input: contains objective', fullText.includes('Prove local evidence note generation works honestly.'));
check('full input: contains evaluated sha', fullText.includes('abc1234'));
check('full input: contains tests', fullText.includes('10/10 unit tests passed'));
check('full input: contains checker verdict', fullText.includes('Checker verdict:    PASS'));
check('full input: contains advisor verdict', fullText.includes('Advisor verdict:    PASS'));
check('full input: contains limitations', fullText.includes('Not independently verified'));
check('full input: contains decision', fullText.includes('SAFE_TO_CONTINUE_INTERNAL_ONLY'));

// 2. Missing/empty field becomes UNKNOWN and is listed in unknowns.
const missingNote = buildEvidenceNote({ ...fullInput, objective: '' });
check('missing field normalized to UNKNOWN', missingNote.objective === 'UNKNOWN');
check('missing field listed in unknowns', missingNote.unknowns.includes('objective'));
const missingText = renderEvidenceNoteText(missingNote);
check('missing field shows UNKNOWN in rendered text', missingText.includes('Objective:          UNKNOWN'));
check('missing field noted as not fabricated', missingText.includes('Unknown/missing fields (not fabricated): objective'));

const missingLimitationsNote = buildEvidenceNote({ ...fullInput, limitations: [] });
check('missing limitations normalized to empty array', missingLimitationsNote.limitations.length === 0);
check('missing limitations listed in unknowns', missingLimitationsNote.unknowns.includes('limitations'));

// 3. Forbidden claims never appear, in any of the notes rendered above.
const FORBIDDEN = ['production-ready', 'customer-ready', 'final-beta', 'secure', 'compliant'];
const shipGoodNote = buildEvidenceNote({ ...fullInput, decision: 'SHIP', limitations: ['minor known issue'] });
const shipGoodText = renderEvidenceNoteText(shipGoodNote);
for (const phrase of FORBIDDEN) {
  check(`forbidden claim absent (full note): ${phrase}`, !fullText.toLowerCase().includes(phrase));
  check(`forbidden claim absent (ship note): ${phrase}`, !shipGoodText.toLowerCase().includes(phrase));
}

// 4. SHIP line only appears under the permitted condition.
check('SHIP approved when decision=SHIP and limitations non-empty', shipGoodNote.shipApproved === true);
check('SHIP note renders the SHIP decision line', shipGoodText.includes('DECISION: SHIP'));

const shipNoLimitations = buildEvidenceNote({ ...fullInput, decision: 'SHIP', limitations: [] });
check('SHIP not approved without limitations', shipNoLimitations.shipApproved === false);

const shipMissingLimitations = buildEvidenceNote({ ...fullInput, decision: 'SHIP', limitations: undefined });
check('SHIP not approved when limitations missing', shipMissingLimitations.shipApproved === false);

const doNotShipNote = buildEvidenceNote({ ...fullInput, decision: 'DO_NOT_SHIP' });
const doNotShipText = renderEvidenceNoteText(doNotShipNote);
check('non-SHIP decision shown verbatim', doNotShipText.includes('DECISION: DO_NOT_SHIP'));
check('non-SHIP decision not marked approved', doNotShipNote.shipApproved === false);

// 5. Hostile/injection input renders inert (escaped/stripped), never executes or breaks structure.
const hostileNote = buildEvidenceNote({
  ...fullInput,
  objective: '<script>alert(1)</script>',
  advisor_verdict: '\x1b[31mFAKE PASS\x1b[0m',
  limitations: ['<img src=x onerror=alert(1)>'],
});
const hostileText = renderEvidenceNoteText(hostileNote);
check('script tag not present verbatim', !hostileText.includes('<script>'));
check('script tag rendered inert via HTML-escaping', hostileText.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
check('ansi escape sequence stripped', !hostileText.includes('\x1b'));
check('img/onerror payload not present verbatim', !hostileText.includes('<img src=x onerror=alert(1)>'));
check('img/onerror payload rendered inert', hostileText.includes('&lt;img src=x onerror=alert(1)&gt;'));

console.log(`PASSED ${passed}/${total}`);
if (passed !== total) {
  process.exit(1);
}
process.exit(0);
