// FounderGate — Physical Path Inventory + Alternate Route Verifier (LOCAL / SYNTHETIC).
// Any PRESENT_UNGOVERNED or UNKNOWN path blocks a physical-isolation claim. Relay proof only counts if all
// alternate paths are ABSENT/DISABLED/GOVERNED.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
export const PATHS = Object.freeze(['wifi','bluetooth','cellular','ethernet','second_ethernet','usb_ethernet','thunderbolt_networking','host_bridge','virtual_proxy','package_mirror','shared_host_service','cloud_metadata_route','debug_interface','serial_management_network']);
export const STATUS = Object.freeze(['ABSENT','DISABLED','GOVERNED','PRESENT_UNGOVERNED','UNKNOWN']);

export function inventory(observations={}){
  const rows = PATHS.map(p=>{
    const s = observations[p];
    const status = STATUS.includes(s) ? s : 'UNKNOWN';
    return { path:p, status, blocks_isolation: status==='PRESENT_UNGOVERNED'||status==='UNKNOWN' };
  });
  const blocking = rows.filter(r=>r.blocks_isolation);
  const all_governed = blocking.length===0;
  return {
    record_type:'physical_path_inventory', rows,
    present_ungoverned: rows.filter(r=>r.status==='PRESENT_UNGOVERNED').map(r=>r.path),
    unknown: rows.filter(r=>r.status==='UNKNOWN').map(r=>r.path),
    all_paths_governed: all_governed,
    isolation_claim_status: all_governed ? 'VERIFIED_PHYSICAL_PATHS_ABSENT' : (rows.some(r=>r.status==='PRESENT_UNGOVERNED') ? 'ALTERNATE_PATH_DETECTED' : 'UNKNOWN'),
    inventory_hash: sha256(rows.map(r=>r.path+':'+r.status).join('|')),
  };
}
export function allGovernedObservations(){ const o={}; for(const p of PATHS) o[p]='ABSENT'; return o; }
