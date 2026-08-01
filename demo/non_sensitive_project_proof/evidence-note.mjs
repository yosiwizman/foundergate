// FounderGate Evidence Note — pure, dependency-free note builder + renderer.
// No network, no DB, no secrets. Never fabricates values: missing/empty
// fields become "UNKNOWN" and are recorded in note.unknowns.

const SCALAR_FIELDS = [
  'project_name',
  'objective',
  'evaluated_sha',
  'tests',
  'checker_verdict',
  'advisor_verdict',
  'decision',
];

// Strip control/ANSI-escape characters and HTML-escape everything else so
// hostile input (script tags, ANSI terminal escapes, etc.) can never act as
// markup or terminal control codes — it only ever appears as inert text.
function sanitize(str) {
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeScalar(value, fieldName, unknowns) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return sanitize(value.trim());
  }
  unknowns.push(fieldName);
  return 'UNKNOWN';
}

export function buildEvidenceNote(input) {
  const src = input && typeof input === 'object' ? input : {};
  const unknowns = [];

  const fields = {};
  for (const name of SCALAR_FIELDS) {
    fields[name] = normalizeScalar(src[name], name, unknowns);
  }

  let limitations = [];
  if (Array.isArray(src.limitations) && src.limitations.length > 0) {
    limitations = src.limitations
      .filter((item) => typeof item === 'string' && item.trim().length > 0)
      .map((item) => sanitize(item.trim()));
  }
  if (limitations.length === 0) {
    unknowns.push('limitations');
  }

  const shipApproved = fields.decision === 'SHIP' && limitations.length > 0;

  return {
    project_name: fields.project_name,
    objective: fields.objective,
    evaluated_sha: fields.evaluated_sha,
    tests: fields.tests,
    checker_verdict: fields.checker_verdict,
    advisor_verdict: fields.advisor_verdict,
    decision: fields.decision,
    limitations,
    shipApproved,
    unknowns,
  };
}

export function renderEvidenceNoteText(note) {
  const lines = [];
  lines.push('FOUNDERGATE EVIDENCE NOTE');
  lines.push('=========================');
  lines.push(`Project:            ${note.project_name}`);
  lines.push(`Objective:          ${note.objective}`);
  lines.push(`Evaluated commit:   ${note.evaluated_sha}`);
  lines.push(`Tests:              ${note.tests}`);
  lines.push(`Checker verdict:    ${note.checker_verdict}`);
  lines.push(`Advisor verdict:    ${note.advisor_verdict}`);
  lines.push('');
  lines.push('Limitations:');
  if (note.limitations.length > 0) {
    for (const item of note.limitations) {
      lines.push(`  - ${item}`);
    }
  } else {
    lines.push('  (none documented)');
  }
  lines.push('');
  if (note.shipApproved) {
    lines.push('DECISION: SHIP — approved for release (see limitations above)');
  } else {
    lines.push(`DECISION: ${note.decision}`);
  }
  lines.push('');
  if (note.unknowns.length > 0) {
    lines.push(`Unknown/missing fields (not fabricated): ${note.unknowns.join(', ')}`);
  } else {
    lines.push('All fields were provided; nothing was unknown.');
  }
  lines.push('');
  lines.push('This is a local, non-sensitive demo note. It reflects only the fields');
  lines.push('given as input and performs no independent verification.');
  return lines.join('\n');
}
