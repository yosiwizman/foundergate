// FounderGate Evidence Packet v1 — deterministic, zero-dependency validator.
// A Safety Check produces one of these per checked project. LOCAL / synthetic-or-self-owned only.
// No network, no fs side effects here (pure validation). Decision never SHIP.

export const EVIDENCE_PACKET_VERSION = 'v1';
export const VERDICTS = ['PASS_WITH_LIMITS', 'HOLD', 'REPAIR', 'REFUSED'];
export const OWNER_DECISIONS = ['CONTINUE_LOCAL_ONLY', 'REPAIR_BEFORE_SHOWING', 'STOP_NEEDS_FOUNDER_GATE', 'EXPERT_REVIEW'];

// required top-level fields for a valid packet
const REQUIRED = [
  'packet_version', 'task_intent', 'agent_identity', 'source_snapshot', 'files_touched',
  'protected_files', 'sensitivity_ruling', 'checks', 'risk_findings', 'checker_verdict',
  'owner_gate', 'next_safe_action', 'limitations', 'blocked_actions',
];
// content that must NOT appear (synthetic/self-owned only; never real customer/private/production data)
const FORBIDDEN_CONTENT = /customer_data|production_secret|private_key|-----BEGIN|prod(uction)? database|real customer/i;

function isNonEmptyString(v) { return typeof v === 'string' && v.trim() !== ''; }
function isArray(v) { return Array.isArray(v); }

// validateEvidencePacket(packet) -> { valid, errors: string[] }
export function validateEvidencePacket(packet) {
  const errors = [];
  const add = (m) => errors.push(m);
  if (typeof packet !== 'object' || packet === null) return { valid: false, errors: ['packet is not an object'] };

  for (const k of REQUIRED) if (!(k in packet)) add(`missing required field: ${k}`);
  if (packet.packet_version !== EVIDENCE_PACKET_VERSION) add(`packet_version must be "${EVIDENCE_PACKET_VERSION}"`);
  if (!isNonEmptyString(packet.task_intent)) add('task_intent must be a non-empty string');
  if (!isNonEmptyString(packet.agent_identity)) add('agent_identity must be a non-empty string');
  if (typeof packet.source_snapshot !== 'object') add('source_snapshot must be an object');
  else {
    if (!isNonEmptyString(packet.source_snapshot.kind)) add('source_snapshot.kind required (repo/folder/demo)');
    if (packet.source_snapshot.self_owned !== true) add('source_snapshot.self_owned must be true (self-owned only)');
    if (packet.source_snapshot.contains_customer_or_production_data !== false) add('source_snapshot.contains_customer_or_production_data must be false');
  }
  if (!isArray(packet.files_touched)) add('files_touched must be an array');
  if (!isArray(packet.protected_files)) add('protected_files must be an array');
  if (typeof packet.sensitivity_ruling !== 'object' || !isNonEmptyString(packet.sensitivity_ruling.ruling)) add('sensitivity_ruling.ruling required');
  if (!isArray(packet.checks)) add('checks must be an array');
  if (!isArray(packet.risk_findings)) add('risk_findings must be an array');
  if (!VERDICTS.includes(packet.checker_verdict)) add(`checker_verdict must be one of ${VERDICTS.join('|')}`);
  if (typeof packet.owner_gate !== 'object' || !OWNER_DECISIONS.includes(packet.owner_gate.decision)) add(`owner_gate.decision must be one of ${OWNER_DECISIONS.join('|')}`);
  if (packet.owner_gate && packet.owner_gate.never_ship !== true) add('owner_gate.never_ship must be true (decision can never be SHIP)');
  if (!isNonEmptyString(packet.next_safe_action)) add('next_safe_action must be a non-empty string');
  if (!isArray(packet.limitations) || packet.limitations.length === 0) add('limitations must be a non-empty array');
  if (!isArray(packet.blocked_actions)) add('blocked_actions must be an array');

  // synthetic-only content guard
  try { if (FORBIDDEN_CONTENT.test(JSON.stringify(packet))) add('packet contains forbidden real customer/production/secret content'); } catch { add('packet not serializable'); }

  return { valid: errors.length === 0, errors };
}

// build_identity is optional but recorded when available (never a real secret)
export function summarize(packet) {
  return {
    verdict: packet.checker_verdict, decision: packet.owner_gate && packet.owner_gate.decision,
    never_ship: true, checks: (packet.checks || []).length, risks: (packet.risk_findings || []).length,
    build: packet.build_identity || null,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // CLI self-test entrypoint (validates files passed as args)
  import('node:fs').then(({ readFileSync }) => {
    let fail = 0;
    for (const f of process.argv.slice(2)) {
      const r = validateEvidencePacket(JSON.parse(readFileSync(f, 'utf8')));
      console.log(`${r.valid ? 'VALID  ' : 'INVALID'} ${f}${r.valid ? '' : ' :: ' + r.errors.join('; ')}`);
      if (!r.valid) fail++;
    }
    process.exit(fail === 0 ? 0 : 1);
  });
}
