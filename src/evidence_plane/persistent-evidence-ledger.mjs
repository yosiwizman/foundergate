// LANE W2 — Persistent Evidence Plane / Replay (LOCAL / DETERMINISTIC). Append-only hash-chained ledger.
import { sha256 } from '../core_ip/core-ip-primitives.mjs';
export const COMPLETENESS=Object.freeze(['COMPLETE','PARTIAL','INCOMPLETE','CONTRADICTION','UNKNOWN']);
export function newLedger(id){return {record_type:'persistent_evidence_ledger',id:id||'ledger',events:[],chain:'genesis',checkpoints:[]};}
export function append(l,stream,payload,by){const seq=l.events.length;const h=sha256(payload);const prev=l.chain;l.chain=sha256(prev+'|'+seq+':'+stream+':'+h);l.events.push({seq,stream,hash:h,by:by||'producer',prev_chain:prev});return seq;}
export function checkpoint(l){const c={at_seq:l.events.length,chain:l.chain};l.checkpoints.push(c);return 'ckpt_'+sha256(c).slice(0,16);}
export function verifyContinuity(l){let chain='genesis';for(const e of l.events){const expectPrev=chain;chain=sha256(chain+'|'+e.seq+':'+e.stream+':'+e.hash);if(e.prev_chain!==expectPrev)return {ok:false,status:'CHAIN_BROKEN',at:e.seq};}return {ok:chain===l.chain,status:chain===l.chain?'CONTINUOUS':'CHAIN_BROKEN'};}
export function classifyCompleteness(l,opts={}){if(opts.contradiction)return 'CONTRADICTION';const streams=new Set(l.events.map(e=>e.stream));const need=['producer','verifier'];const has=need.filter(n=>l.events.some(e=>e.by===n));if(opts.stale)return 'PARTIAL';if(has.length===0)return 'UNKNOWN';if(has.length<need.length)return 'INCOMPLETE';return streams.size>0?'COMPLETE':'UNKNOWN';}
export function producerVerifier(l){const p=l.events.some(e=>e.by==='producer');const v=l.events.some(e=>e.by==='verifier');return {producer:p,verifier:v,status:(p&&v)?'OK':'HOLD_PRODUCER_ONLY'};}
export function retentionPolicy(i={}){const keep=i.outcome==='FAILURE'||i.has_side_effects===true;return {record_type:'evidence_retention',retain:keep,status:keep?'RETAIN':'PRUNE_SAFE'};}
export function exportPackage(l){return {record_type:'evidence_export_package',events:l.events.length,chain_digest:'evp_'+sha256(l.chain).slice(0,20),completeness:classifyCompleteness(l)};}
// replay from STATE only (never AI reasoning): reconstruct final chain deterministically from recorded events
export function replayFromState(l){let chain='genesis';const trace=[];for(const e of l.events){chain=sha256(chain+'|'+e.seq+':'+e.stream+':'+e.hash);trace.push({seq:e.seq,stream:e.stream,chain_after:chain.slice(0,12)});}return {record_type:'evidence_replay',source:'state_only',uses_ai_reasoning:false,final_chain:chain,steps:trace.length,matches_ledger:chain===l.chain};}
// tamper helpers for tests
export function deleteEvent(l,idx){l.events.splice(idx,1);return l;}
export function reorderEvents(l,a,b){const t=l.events[a];l.events[a]=l.events[b];l.events[b]=t;return l;}
