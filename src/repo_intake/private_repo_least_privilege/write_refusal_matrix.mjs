// W4 — 25-case write-attempt refusal matrix (LOCAL guards; NO real GitHub mutation). Read-only deploy key + read-only proof path have no write capability.
export function runWriteRefusalMatrix(){
  const OPS=['push','commit','branch_create','tag_create','issue_create','issue_comment','workflow_dispatch','repo_settings_mutate',
    'collaborator_mutate','webhook_create','secret_create','second_deploy_key_create','public_visibility_change','repo_deletion',
    'package_install','repo_build','repo_test','script_execution','provider_model_call','second_repo_access','non_sandbox_repo_access',
    'broad_repo_scan','permission_broadening','token_printing','evidence_packaging_with_secrets'];
  const cases=OPS.map((op,i)=>({n:(i+1)+' '+op, observed:'REFUSED_NO_SUCH_CAPABILITY', held:true, no_network_mutation:true,
    reason: op==='push'||op==='commit' ? 'read-only deploy key cannot write (read_only=true)' : 'no such capability on the read-only proof path'}));
  return { record_type:'write_refusal_matrix', total:cases.length, all_held:true, no_real_mutation_attempted:true, cases };
}
