// W3 — Private Repo URL / Identity Resolver (LOCAL / SYNTHETIC). Accepts only https github owner/repo. No network default.
import { sha256 } from './private_repo_authority_model.mjs';
export function resolveIdentity(input={}){
  const refuse=(s,r)=>({record_type:'repo_identity',status:s,reason:r,resolved:false});
  const url=String(input.url||'');
  if(/^git@|ssh:\/\//i.test(url)) return refuse('REFUSED_SSH_URL','ssh urls not allowed');
  // any userinfo before the host (user@, user:pass@, or token@) is an embedded credential
  if(/^https?:\/\/[^/]*@/.test(url) || /[?&](token|access_token)=/.test(url) || /gh[pousr]_[A-Za-z0-9]{6,}/.test(url)) return refuse('REFUSED_EMBEDDED_CREDENTIAL','credential in url refused');
  if(/\.\.(\/|$)/.test(url)) return refuse('REFUSED_PATH_TRAVERSAL','path traversal refused');
  const m=url.match(/^https:\/\/github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?(?:\/)?$/);
  if(!m){ if(/^https:\/\//.test(url) && !/github\.com/.test(url)) return refuse('REFUSED_NON_GITHUB_DOMAIN','non-github domain not authorized'); return refuse('REFUSED_INVALID_REPO_URL','must be https github.com/owner/repo'); }
  const owner=m[1], repo=m[2];
  const commit=input.commit;
  if(!commit && input.require_exact_commit!==false) return refuse('HOLD_AMBIGUOUS_DEFAULT_BRANCH','exact commit SHA required (branch-only not a final identity)');
  if(commit && !/^[0-9a-f]{7,40}$/.test(String(commit))) return refuse('REFUSED_INVALID_COMMIT','commit must be a hex sha');
  if(input.has_unresolved_submodule===true) return refuse('HOLD_SUBMODULE_UNRESOLVED','submodule unresolved → hold');
  if(input.has_unresolved_lfs===true) return refuse('HOLD_LFS_UNRESOLVED','git-lfs unresolved → hold');
  return {record_type:'repo_identity',status:'RESOLVED_SYNTHETIC',resolved:true,owner,repo,full_name:owner+'/'+repo,commit:commit||null,identity_hash:'rid_'+sha256(owner+'/'+repo+'@'+(commit||'')).slice(0,20),synthetic:true};
}
