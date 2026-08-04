// FounderGate — Physical Status Vocabulary + Claim Blocker (LOCAL / DETERMINISTIC).
// Allowed bounded statuses only. Forbidden absolute/physical-overclaim phrases are rejected wherever they appear.
export const ALLOWED_STATUSES = Object.freeze([
  'VERIFIED_PHYSICAL_PATHS_ABSENT', 'VERIFIED_HARDWARE_GATED_CAPABILITY', 'VERIFIED_WITHIN_DECLARED_BOUNDARIES',
  'BOUNDARY_VIOLATION_DETECTED_AND_STOPPED', 'BOUNDARY_VIOLATION_DETECTED_STOP_UNCONFIRMED', 'ALTERNATE_PATH_DETECTED',
  'MONITORING_LOST', 'EVIDENCE_INCOMPLETE', 'HARDWARE_STATE_MISMATCH', 'SUPERVISOR_UNAVAILABLE',
  'AUTHORIZATION_INVALID', 'AUTHORIZATION_EXPIRED', 'UNKNOWN', 'NOT_PASSED',
]);

// forbidden claim phrases (case-insensitive). Each is a phrase FounderGate must never assert as its own claim.
export const FORBIDDEN_PHRASES = Object.freeze([
  'escape impossible', 'escape is impossible', 'physically impossible escape', 'impossible to escape',
  'unhackable', 'absolutely secure', 'absolute security', 'secure sandbox', 'fully secure',
  'full isolation proven', 'fully isolated', 'all covert channels absent', 'no covert channels',
  'measured boot proves no vulnerabilities', 'vulnerability-free', 'vm equals physically severed', 'vm is physically severed',
  'guaranteed containment', 'cannot be breached', 'proven secure',
]);

export function isAllowedStatus(s) { return ALLOWED_STATUSES.includes(s); }

// scan arbitrary text (a generated claim/doc). A same-line explicit negation ("NOT"/"never"/"cannot"/"forbidden"/
// "blocked"/"is not") neutralizes a forbidden phrase, so honest disclaimers ("NOT unhackable") pass.
export function scanClaimText(text) {
  const violations = [];
  const lines = String(text).split(/\r?\n/);
  lines.forEach((line, i) => {
    const low = line.toLowerCase();
    for (const ph of FORBIDDEN_PHRASES) {
      if (low.includes(ph)) {
        // a same-line negation/disallowance marker neutralizes the phrase (honest disclaimers pass; bare overclaims do not)
        const negated = /\b(not|never|cannot|can't|forbid|forbids|forbidden|prohibit|prohibits|prohibited|block|blocks|blocked|blocker|disallow|reject|refus|no claim|not permitted|is not|are not|no such|does not|permanently)\b/.test(low) || low.includes('not ' + ph) || low.includes('never ' + ph);
        if (!negated) violations.push({ line: i + 1, phrase: ph, text: line.trim().slice(0, 160) });
      }
    }
  });
  return { record_type: 'physical_claim_blocker', clean: violations.length === 0, violations };
}

// validate a proposed FounderGate status object
export function validateClaim(claim = {}) {
  const status = claim.status;
  const textScan = scanClaimText(JSON.stringify(claim));
  if (!isAllowedStatus(status)) return { record_type: 'physical_claim_validation', valid: false, status: 'NOT_PASSED', reason: `status "${status}" is not in the allowed bounded vocabulary`, blocker: textScan };
  if (!textScan.clean) return { record_type: 'physical_claim_validation', valid: false, status: 'NOT_PASSED', reason: 'forbidden physical/absolute claim present', blocker: textScan };
  return { record_type: 'physical_claim_validation', valid: true, status, blocker: textScan };
}
