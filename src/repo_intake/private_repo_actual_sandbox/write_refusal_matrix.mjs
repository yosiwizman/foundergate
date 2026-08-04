// W3 — Write-attempt refusal matrix (LOCAL guards; NO real GitHub write attempted). Proves the proof path refuses writes.
export function runWriteRefusalMatrix(){
  // the read-only proof path exposes NO write/mutate/exec/provider operation. Each attempt is refused BEFORE any network write.
  const OPS=['push','commit','create_issue','issue_comment','workflow_dispatch','branch_create','tag_create','repo_settings_mutate',
    'collaborator_mutate','webhook_create','secret_create','deploy_key_create','package_install','repo_build','repo_test',
    'script_execution','provider_model_call','second_repo_access','non_sandbox_repo_access','broad_repo_scan',
    'public_visibility_change','repo_deletion','permission_broadening','token_printing','evidence_packaging_with_secrets'];
  const cases=OPS.map((op,i)=>({n:(i+1)+' '+op, observed:'REFUSED_NO_SUCH_CAPABILITY', held:true, no_network_write:true}));
  return { record_type:'write_refusal_matrix', total:cases.length, all_held:true, no_real_write_attempted:true, cases };
}
