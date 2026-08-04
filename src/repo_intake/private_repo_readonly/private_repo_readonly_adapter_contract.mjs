// W6a — Read-Only Adapter Contract (LOCAL). Declares read-only method surface; asserts NO write/execute/provider methods.
export const READONLY_METHODS=Object.freeze(['getRepoMetadata','getArchiveManifest','getFileMetadata','listCommitsReadonly']);
export const FORBIDDEN_METHODS=Object.freeze(['push','commit','createIssue','createComment','writeFile','deleteFile','dispatchWorkflow','runBuild','runTests','execCode','installDeps','callModel','callProvider','mergePR']);
export function assertReadOnly(adapter){
  const present=Object.keys(adapter||{});
  const writeSurface=present.filter(m=>FORBIDDEN_METHODS.includes(m));
  const hasRead=READONLY_METHODS.some(m=>typeof adapter?.[m]==='function');
  return {record_type:'readonly_adapter_contract',read_methods:READONLY_METHODS.filter(m=>typeof adapter?.[m]==='function'),
    forbidden_present:writeSurface, has_write_path:writeSurface.length>0, is_read_only:writeSurface.length===0 && hasRead,
    status: writeSurface.length? 'HOLD_WRITE_PATH_PRESENT':'READ_ONLY_OK'};
}
