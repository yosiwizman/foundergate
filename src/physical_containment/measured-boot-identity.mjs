// FounderGate — Measured Boot / Device Identity Records (LOCAL / SYNTHETIC).
// Measured boot is identity/integrity evidence — it is NOT proof of vulnerability-free firmware.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
export function makeMeasuredBoot(input={}){
  const r={
    record_type:'measured_boot_identity',
    physical_device_identity: input.physical_device_identity||'device_local_synth',
    firmware_measurement: input.firmware_measurement||'fw_'+sha256('fw').slice(0,16),
    bootloader_measurement: input.bootloader_measurement||'bl_'+sha256('bl').slice(0,16),
    kernel_hypervisor_measurement: input.kernel_hypervisor_measurement||'kh_'+sha256('kh').slice(0,16),
    execution_image_digest: input.execution_image_digest||'img_'+sha256('local_img').slice(0,16),
    supervisor_version: input.supervisor_version||'hwsup@0.1-synth',
    evidence_recorder_identity: input.evidence_recorder_identity||'recorder_local_synth',
    proves: 'identity_and_integrity_only',
    does_not_prove: 'vulnerability_free_firmware', // explicit non-claim
  };
  r.identity_hash='mbi_'+sha256(r).slice(0,20);
  return r;
}
export function measuredBootImpliesVulnerabilityFree(){ return false; } // structural non-claim
