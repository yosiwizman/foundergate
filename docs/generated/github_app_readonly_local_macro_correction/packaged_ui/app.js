const $=(id)=>document.getElementById(id);
function setPill(el,txt,cls){if(!el)return;el.textContent=txt;el.className='pill '+(cls||'');}
async function load(){
  try{
    const r=await fetch('github_app_readonly_index.json',{cache:'no-store'});
    if(!r.ok) throw new Error('status '+r.status);
    const d=await r.json();
    setPill($('ghapp-status'),d.status||'UNKNOWN',/READY_WITH_LIMITS/.test(d.status)?'live':'hold');
    setPill($('ghapp-mode'),d.local_only_vs_live||d.mode,'hold');
    setPill($('ghapp-repo'),(d.repo||'—')+' · private: '+(d.private?'YES':'NO'),d.private?'live':'refuse');
    setPill($('ghapp-perms'),d.permissions_required||'—','live');
    setPill($('ghapp-installed'),d.github_app_installed||'NO',/YES/.test(d.github_app_installed||'')?'hold':'live');
    setPill($('ghapp-secrets'),'private key: '+(d.private_key_exposed||'NO')+' · token: '+(d.installation_token_exposed||'NO'),'live');
    setPill($('ghapp-commit'),d.exact_commit||'NOT ASSERTED',/NOT ASSERTED/.test(d.exact_commit||'')?'hold':'live');
    const rm=d.refusal_matrix||{};
    setPill($('ghapp-refusal'),rm.total?(rm.total+' held · '+(rm.executable_refusal_paths||0)+' executable + '+(rm.catalog_only_policy_assertions||0)+' catalog'):'UNKNOWN',(rm&&rm.all_held)?'live':'refuse');
    setPill($('ghapp-evidence'),d.evidence_status||'UNKNOWN',/VERIFIED/.test(d.evidence_status)?'live':'hold');
    setPill($('ghapp-safety'),'existing/customer: '+((d.existing_valuable_repo_touched||d.customer_repo_touched)?'⚠YES':'NO')+' · code exec: '+(d.code_execution?'⚠YES':'NO')+' · provider: '+(d.provider_call?'⚠YES':'NO'),(d.existing_valuable_repo_touched||d.customer_repo_touched||d.code_execution||d.provider_call)?'refuse':'live');
    setPill($('ghapp-next'),d.next_founder_gate||'—','hold');
    if($('ghapp-proven')) $('ghapp-proven').innerHTML='<b>Proven:</b> '+(d.proven||[]).join(' · ')+'<br><b>NOT proven:</b> '+(d.not_proven||[]).join(' · ');
  }catch(e){
    setPill($('ghapp-status'),'UNKNOWN / NOT AVAILABLE','hold');
    if($('ghapp-proven')) $('ghapp-proven').textContent='UNKNOWN — could not load route index (no invented state).';
  }
}
$('load').addEventListener('click',load);
