// FounderGate — Physical Containment Evidence Package schema (LOCAL / SYNTHETIC). 20 required sections.
// Produces a sealed local package with an explicit bounded verdict + explicit non-claims. Never emits a forbidden claim.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
import { validateClaim, scanClaimText } from './physical-claim-blocker.mjs';

export const REQUIRED_SECTIONS = Object.freeze([
  'run_contract_and_digest', 'authorization_object_and_signature_result', 'execution_machine_identity_and_attestation',
  'execution_image_digest', 'hardware_supervisor_identity_and_version', 'evidence_recorder_identity_and_version',
  'physical_interface_inventory', 'relay_state_history', 'power_state_history', 'pre_run_challenge_results',
  'continuous_sensor_health_record', 'network_and_alternate_path_observations', 'capability_grant_history',
  'violation_events', 'stop_and_shutdown_timeline', 'termination_or_power_off_confirmation',
  'evidence_continuity_report', 'missing_stale_or_contradictory_evidence', 'final_bounded_verdict', 'explicit_non_claims_and_limitations',
]);

const NON_CLAIMS = [
  'This is a LOCAL / SYNTHETIC model. It is NOT real physical containment.',
  'This does NOT prove escape is impossible; it does NOT claim unhackable or absolutely secure.',
  'Measured boot records identity/integrity only; it does NOT prove vulnerability-free firmware.',
  'A VM on one host is NOT a physically severed machine.',
  'No real hardware, relay, power, radio, USB, data-diode, or network was controlled.',
];

export function buildEvidencePackage(sections = {}) {
  const filled = {};
  for (const s of REQUIRED_SECTIONS) filled[s] = sections[s] !== undefined ? sections[s] : null;
  // ensure explicit non-claims always present BEFORE computing missing (this section is always auto-filled)
  const providedNonClaims = Array.isArray(sections.explicit_non_claims_and_limitations)
    ? sections.explicit_non_claims_and_limitations
    : (sections.explicit_non_claims_and_limitations != null ? [String(sections.explicit_non_claims_and_limitations)] : []);
  filled.explicit_non_claims_and_limitations = providedNonClaims.concat(NON_CLAIMS);
  const missing = REQUIRED_SECTIONS.filter((s) => filled[s] === null);
  const verdict = sections.final_bounded_verdict || (missing.length ? 'EVIDENCE_INCOMPLETE' : 'VERIFIED_WITHIN_DECLARED_BOUNDARIES');
  filled.final_bounded_verdict = verdict;
  const pkg = {
    record_type: 'physical_evidence_package',
    sections: filled, section_count: REQUIRED_SECTIONS.length,
    missing_sections: missing, complete: missing.length === 0,
    final_bounded_verdict: verdict,
    package_digest: 'pep_' + sha256(filled).slice(0, 24),
  };
  // claim-blocker guard on the whole package
  const scan = scanClaimText(JSON.stringify({ ...pkg, sections: undefined }) + '\n' + JSON.stringify(filled.explicit_non_claims_and_limitations));
  pkg.claim_blocker_clean = scan.clean;
  pkg.status = (!scan.clean) ? 'NOT_PASSED' : (missing.length ? 'EVIDENCE_INCOMPLETE' : 'SEALED_WITH_LIMITS');
  return pkg;
}

export function hasAllSections(pkg) { return pkg && pkg.section_count === REQUIRED_SECTIONS.length && pkg.missing_sections.length === 0; }
