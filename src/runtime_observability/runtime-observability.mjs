// LANE W3 — Runtime Observability / Operational Ledger (LOCAL / DETERMINISTIC). Fails closed; UNKNOWN first-class.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
export const TRACES=Object.freeze(['request','tool_invocation','context','retrieval','memory','planning','evaluation','correction']);
export const CLASSES=Object.freeze(['FAILURE','TIMEOUT','RETRY','UNKNOWN','STALE','PARTIAL','RECOVERY']);
export function newRun(id){return {record_type:'runtime_observability',run_id:id||'run',traces:{},timeline:[],decisions:[],transitions:[]};}
export function trace(r,kind,payload){if(!TRACES.includes(kind))return {status:'HOLD_UNKNOWN_TRACE_KIND'};(r.traces[kind]=r.traces[kind]||[]).push({hash:sha256(payload),at:r.timeline.length});r.timeline.push({kind,at:r.timeline.length});return {status:'OK'};}
export function decision(r,name,evidence){r.decisions.push({name,evidence_present:evidence!=null,at:r.timeline.length});return r;}
export function transition(r,from,to){r.transitions.push({from,to});return r;}
export function classify(i={}){const m=String(i.message||'').toLowerCase();let c='UNKNOWN';if(/timeout|deadline/.test(m))c='TIMEOUT';else if(i.retry)c='RETRY';else if(i.partial)c='PARTIAL';else if(i.stale)c='STALE';else if(/fail|error/.test(m))c='FAILURE';return {record_type:'runtime_classification',classification:c,first_class_unknown:c==='UNKNOWN'};}
export function operationalLedger(r){const missingReq=!r.traces.request||r.traces.request.length===0;const missingDecision=r.decisions.length===0;let status='OK';if(missingReq)status='HOLD_MISSING_REQUEST_TRACE';else if(missingDecision)status='HOLD_MISSING_DECISION_TIMELINE';return {record_type:'operational_evidence_ledger',traces:Object.keys(r.traces).length,decisions:r.decisions.length,transitions:r.transitions.length,status,ledger_hash:'obs_'+sha256(r).slice(0,16)};}
export function reportComplete(i={}){if(i.partial===true)return {status:'HOLD_PARTIAL_REPORTED_COMPLETE',complete:false};return {status:'OK',complete:true};}
export function retryRecord(i={}){const classified=i.classification!=null;return {record_type:'retry',status:classified?'OK':'HOLD_RETRY_UNCLASSIFIED'};}
