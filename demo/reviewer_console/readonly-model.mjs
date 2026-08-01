// Reviewer console capability model — strictly read-only.
export const CAPABILITIES = { view_commit:true, view_diff:true, view_test_log:true, view_checker:true, view_advisor:true, export_readonly:true,
  mutate:false, merge:false, mark_pr_ready:false, edit_files:false, delete:false, approve_gate:false };
export function assertReadOnly(caps){ for(const k of ['mutate','merge','mark_pr_ready','edit_files','delete','approve_gate']){ if(caps[k]) throw new Error(`forbidden mutation capability enabled: ${k}`);} return true; }
