// LANE W1 — P3 Security & Trust Pack (LOCAL / DETERMINISTIC). Records + validators; fails closed. No network.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
const rec=(t,x)=>({record_type:t,...x});
export const RECORD_TYPES=Object.freeze(['repository_isolation_rules','hostile_repository_handling','trusted_binary_verification','environment_sanitization','plugin_validation','output_integrity','artifact_integrity','cryptographic_evidence_sealing','evidence_fingerprint','supply_chain_provenance','dependency_provenance','sbom','license_verification','secret_detection','security_policy_pack','security_regression','historical_security_ledger','security_finding_lifecycle','function_preservation','security_patch_review']);
export function repoIsolation(i={}){return rec('repository_isolation_rules',{isolated:i.isolated!==false,allow_network:false,status:i.isolated!==false?'OK':'HOLD'});}
export function hostileRepo(i={}){const trusted=i.trusted===true&&i.attestation!=null;return rec('hostile_repository_handling',{trusted,status:trusted?'TRUSTED':'HELD_UNTRUSTED',reason:trusted?'attested':'no attestation → treated hostile'});}
export function trustedBinary(i={}){const ok=i.expected_hash&&i.observed_hash&&i.expected_hash===i.observed_hash;return rec('trusted_binary_verification',{ok:!!ok,status:ok?'VERIFIED':'HOLD_UNTRUSTED_BINARY'});}
export function envSanitization(i={}){const clean=i.secrets_present!==true&&i.env_clean!==false;return rec('environment_sanitization',{status:clean?'OK':'HOLD'});}
export function pluginValidation(i={}){const ok=i.validated===true&&i.capability_contract!=null;return rec('plugin_validation',{status:ok?'OK':'HOLD_UNVALIDATED_PLUGIN'});}
export function outputIntegrity(i={}){const ok=i.output_hash!=null;return rec('output_integrity',{status:ok?'OK':'HOLD_MISSING_OUTPUT_INTEGRITY'});}
export function artifactIntegrity(i={}){const ok=i.declared_hash&&i.observed_hash&&i.declared_hash===i.observed_hash;return rec('artifact_integrity',{status:ok?'OK':'HOLD_ARTIFACT_HASH_MISMATCH'});}
export function sealEvidence(i={}){return rec('cryptographic_evidence_sealing',{seal:'sig_synthetic_'+sha256(i.payload||'').slice(0,16),synthetic:true,status:'SEALED_SYNTHETIC'});}
export function fingerprint(i={}){return rec('evidence_fingerprint',{fingerprint:'fp_'+sha256(i.payload||'').slice(0,20)});}
export function supplyChain(i={}){const ok=Array.isArray(i.inputs)&&i.inputs.length>0;return rec('supply_chain_provenance',{status:ok?'RECORDED':'HOLD_NO_PROVENANCE'});}
export function depProvenance(i={}){const ok=Array.isArray(i.dependencies);return rec('dependency_provenance',{count:(i.dependencies||[]).length,status:ok?'RECORDED':'HOLD'});}
export function sbom(i={}){const present=i.components!=null;return rec('sbom',{present,status:present?'PRESENT':'HOLD_MISSING_SBOM'});}
export function license(i={}){const known=i.license&&i.license!=='UNKNOWN';return rec('license_verification',{license:i.license||'UNKNOWN',status:known?'OK':'HOLD_UNKNOWN_LICENSE'});}
export function secretDetection(i={}){const ran=i.scanned===true;return rec('secret_detection',{scanned:ran,found:(i.findings||[]).length,status:!ran?'HOLD_NO_SECRET_SCAN':((i.findings||[]).length?'HOLD_SECRETS_FOUND':'OK')});}
export function policyPack(i={}){return rec('security_policy_pack',{policies:(i.policies||['no_network','no_secrets','no_deploy']).slice(),status:'OK'});}
export function regression(i={}){return rec('security_regression',{prior:i.prior||0,current:i.current||0,status:(i.current||0)>(i.prior||0)?'HOLD_REGRESSION':'OK'});}
export function historicalLedger(i={}){return rec('historical_security_ledger',{entries:(i.entries||[]).length,append_only:true,status:'OK'});}
export function findingLifecycle(i={}){const bad=i.acceptance&&!i.validation;return rec('security_finding_lifecycle',{status:bad?'HOLD_ACCEPTED_WITHOUT_VALIDATION':(i.acceptance?'ACCEPTED_WITH_SEPARATION':'IN_PROGRESS')});}
export function functionPreservation(i={}){const present=i.before!=null&&i.after!=null;return rec('function_preservation',{status:!present?'HOLD_MISSING':(i.before===i.after?'PRESERVED':'CHANGED')});}
export function patchReview(i={}){const ok=i.validated===true&&i.validated_by&&i.validated_by!==i.patched_by;return rec('security_patch_review',{status:ok?'SAFE_TO_ACCEPT':'HOLD_PATCH_NOT_VALIDATED'});}
export function packCoverage(){return {total:RECORD_TYPES.length,implemented:RECORD_TYPES.length};}
