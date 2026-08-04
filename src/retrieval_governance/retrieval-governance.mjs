// LANE W5c — Retrieval Governance (LOCAL / DETERMINISTIC). Stale retrieval cannot pass as fresh.
export function provenance(i={}){return {record_type:'retrieval_provenance',status:i.source!=null?'OK':'HOLD_NO_PROVENANCE'};}
export function freshness(i={}){const stale=i.age_index!=null&&i.max_age!=null&&i.age_index>i.max_age;return {record_type:'retrieval_freshness',status:stale?'STALE':(i.age_index==null?'UNKNOWN':'FRESH'),passes_as_fresh:i.age_index!=null&&!stale};}
export function sourceVersion(i={}){return {record_type:'knowledge_source_versioning',version:i.version||null,status:i.version!=null?'OK':'HOLD_UNVERSIONED_SOURCE'};}
export function cacheGovernance(i={}){const inval=i.invalidation_rule!=null;return {record_type:'cache_governance',status:inval?'OK':'HOLD_CACHE_WITHOUT_INVALIDATION'};}
export function cacheFreshness(i={}){const stale=i.age_index!=null&&i.ttl!=null&&i.age_index>i.ttl;return {record_type:'cache_freshness',status:stale?'STALE':'FRESH'};}
export function cacheProvenance(i={}){return {record_type:'cache_provenance',status:i.source!=null?'OK':'HOLD'};}
export function cacheInvalidation(i={}){return {record_type:'cache_invalidation',rule:i.rule||null,status:i.rule!=null?'OK':'HOLD_NO_INVALIDATION_RULE'};}
