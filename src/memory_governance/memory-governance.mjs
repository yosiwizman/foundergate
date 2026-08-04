// LANE W5b — Memory Governance (LOCAL / DETERMINISTIC).
export const CLASSES=Object.freeze(['session','semantic','episodic','persistent']);
export function classify(i={}){const c=i.class;const ok=CLASSES.includes(c);return {record_type:'memory_classification',class:c||null,status:ok?'OK':'HOLD_UNCLASSIFIED_MEMORY'};}
export function govern(i={}){const persistentOk=i.class!=='persistent'||CLASSES.includes(i.class);return {record_type:'memory_governance',status:persistentOk&&CLASSES.includes(i.class)?'OK':'HOLD'};}
export function compression(i={}){const ok=i.provenance!=null;return {record_type:'memory_compression',status:ok?'OK':'HOLD_COMPRESSED_WITHOUT_PROVENANCE'};}
export function provenance(i={}){return {record_type:'memory_provenance',status:i.source!=null?'OK':'HOLD'};}
export function freshness(i={}){const stale=i.age_index!=null&&i.max_age!=null&&i.age_index>i.max_age;return {record_type:'memory_freshness',status:stale?'STALE':'FRESH'};}
export function expiration(i={}){return {record_type:'memory_expiration',expires_at:i.expires_at??null,status:i.expires_at!=null?'OK':'HOLD_NO_EXPIRATION'};}
