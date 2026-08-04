// W4 — Exact Commit / Snapshot / Manifest Binder (LOCAL / SYNTHETIC). No command execution. Synthetic archives only.
import { sha256 } from './private_repo_authority_model.mjs';
export const LIMITS=Object.freeze({max_files:5000,max_bytes:50*1024*1024});
export function bindSnapshot(input={}){
  const files=input.files||[]; const commit=input.commit;
  const problems=[];
  if(!commit || !/^[0-9a-f]{7,40}$/.test(String(commit))) problems.push('exact commit sha required');
  if(files.length>LIMITS.max_files) problems.push('file count '+files.length+' > '+LIMITS.max_files);
  const totalBytes=files.reduce((a,f)=>a+(f.bytes||0),0);
  if(totalBytes>LIMITS.max_bytes) problems.push('archive bytes '+totalBytes+' > '+LIMITS.max_bytes);
  const symlinks=files.filter(f=>f.symlink===true).map(f=>f.path);
  const traversal=files.filter(f=>/(^|\/)\.\.(\/|$)/.test(f.path)||f.path.startsWith('/')).map(f=>f.path);
  const unsafeNames=files.filter(f=>/[\x00-\x1f]|[<>:"|?*]/.test(f.path)).map(f=>f.path);
  const submodules=files.filter(f=>f.type==='submodule');
  const lfs=files.filter(f=>f.lfs===true);
  const binaries=files.filter(f=>f.binary===true).map(f=>f.path);
  if(symlinks.length) problems.push('symlinks present: '+symlinks.length);
  if(traversal.length) problems.push('path traversal: '+traversal.length);
  if(unsafeNames.length) problems.push('unsafe filenames: '+unsafeNames.length);
  if(submodules.length && input.resolve_submodules!==true) problems.push('submodules unresolved → hold');
  if(lfs.length && input.resolve_lfs!==true) problems.push('git-lfs unresolved → hold');
  const manifest=files.map(f=>({path:f.path,bytes:f.bytes||0,hash:sha256(f.path+':'+(f.content_hash||f.bytes||0))})).sort((a,b)=>a.path<b.path?-1:1);
  return {record_type:'snapshot_binding',commit:commit||null,file_count:files.length,total_bytes:totalBytes,
    archive_digest:'arc_'+sha256(manifest.map(m=>m.hash).join('|')).slice(0,24),
    manifest_digest:'man_'+sha256(manifest).slice(0,24), binary_inventory:binaries,
    symlinks,traversal,unsafe_names:unsafeNames,submodules:submodules.length,lfs:lfs.length,
    no_command_execution:true, status:problems.length?'HELD':'BOUND_SYNTHETIC', problems, manifest};
}
