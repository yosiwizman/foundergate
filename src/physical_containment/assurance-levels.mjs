// FounderGate — Physical Containment Assurance Levels (LOCAL / SYNTHETIC / DETERMINISTIC).
// Three levels are NEVER equivalent. This module refuses level-inflation and refuses absolute-security claims.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';

export const LEVELS = Object.freeze({
  1: {
    id: 1, name: 'Software-Isolated Execution',
    architecture: ['OS/VM/container isolation', 'software policy enforcement', 'no hardware root of trust required'],
    allowed_claims: ['software isolation enforced (local synthetic)', 'boundary policy applied'],
    forbidden_claims: ['hardware-assisted containment', 'physically severed execution', 'escape impossible', 'unhackable'],
    evidence_requirements: ['policy config', 'runtime observation', 'boundary challenge records'],
    limitations: ['shares a kernel/hypervisor/host; software escape is in-scope', 'NOT a hardware or physical guarantee'],
    required_controls: ['outer controller', 'boundary challenges', 'evidence plane'],
    failure_states: ['software escape', 'policy bypass', 'monitoring loss'],
  },
  2: {
    id: 2, name: 'Hardware-Assisted Containment',
    architecture: ['hardware root of trust', 'measured boot', 'hardware supervisor / capability gate', 'controlled egress'],
    allowed_claims: ['hardware-gated capability (local synthetic model)', 'measured identity recorded'],
    forbidden_claims: ['physically severed execution', 'escape impossible', 'unhackable', 'absolutely secure', 'all covert channels absent'],
    evidence_requirements: ['measured boot records', 'signed capability grants', 'supervisor health', 'relay/power records'],
    limitations: ['hardware/firmware may have vulnerabilities; covert channels possible', 'measured boot proves identity/integrity, NOT vulnerability-free firmware'],
    required_controls: ['capability gate', 'hardware supervisor', 'path inventory', 'evidence channel'],
    failure_states: ['supervisor compromise', 'capability replay', 'alternate ungoverned path', 'hardware state mismatch'],
  },
  3: {
    id: 3, name: 'Physically Severed Execution',
    architecture: ['no powered network interfaces', 'physical air-gap / severed links', 'one-way evidence channel', 'independent power control'],
    allowed_claims: ['declared physical paths recorded absent/disabled/governed (local synthetic model)'],
    forbidden_claims: ['escape impossible', 'unhackable', 'absolutely secure', 'physically impossible escape', 'full isolation proven', 'all covert channels absent'],
    evidence_requirements: ['path inventory ABSENT/DISABLED/GOVERNED for ALL paths', 'relay+power measured states', 'one-way evidence channel', 'continuous sensor health'],
    limitations: ['covert side channels (acoustic/EM/thermal/supply-chain) remain out of scope', 'a physical model is NOT a proof of no escape'],
    required_controls: ['full path inventory', 'relay/power proof', 'one-way evidence channel', 'physical assumption register'],
    failure_states: ['present-ungoverned path', 'unknown path', 'relay/power mismatch', 'evidence channel drift'],
  },
});

// classify a claimed level given evidence; NEVER inflates. Returns the SUPPORTED level (may be lower than claimed).
export function classifyLevel(input = {}) {
  const claimed = input.claimed_level;
  const problems = [];
  // inflation guards
  if (claimed >= 2 && input.hardware_root_of_trust !== true) problems.push('Level >=2 requires a hardware root of trust (absent) — cannot label Level 1 as Level 2/3');
  if (claimed === 3 && input.all_paths_governed !== true) problems.push('Level 3 requires ALL physical paths absent/disabled/governed — cannot label Level 2 as Level 3');
  if (claimed === 3 && input.one_way_evidence_channel !== true) problems.push('Level 3 requires a one-way evidence channel');
  // single-path-test inference guard
  if (input.inferred_all_paths_from_one_test === true) problems.push('one successful path test does not imply all paths blocked');
  // absolute-claim guard
  if (input.absolute_claim) problems.push('absolute security claim (impossible/unhackable/absolutely secure) is forbidden');

  let supported_level = 1;
  if (input.hardware_root_of_trust === true) supported_level = 2;
  if (input.all_paths_governed === true && input.one_way_evidence_channel === true && input.hardware_root_of_trust === true) supported_level = 3;
  const level_confusion = claimed != null && claimed > supported_level;
  return {
    record_type: 'assurance_level_classification',
    claimed_level: claimed ?? null, supported_level, level_confusion,
    status: (problems.length || level_confusion) ? 'HOLD_LEVEL_NOT_SUPPORTED' : 'OK',
    problems,
    note: 'levels are never equivalent; supported_level reflects evidence, not the claim',
    hash: sha256({ claimed, supported_level, problems }),
  };
}

export function levelSpec(n) { return LEVELS[n] || null; }
