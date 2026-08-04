import { runPatProof } from '../../../src/repo_intake/private_repo_fine_grained_pat/fine_grained_pat_runner.mjs';
import { SCOPE } from '../../../src/repo_intake/private_repo_fine_grained_pat/pat_authority_model.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const SB='yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET';
// Live absent path (no Keychain PAT): must be gate-required, read-only by construction
const live=runPatProof({account:SB});
ok(live.status==='TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED' && live.token_present===false,'live: no Keychain PAT → TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED');
ok(live.evidence.intake_occurred===false && live.evidence.not_asserted && /no safe Keychain PAT/.test(live.evidence.not_asserted),'live: intake NOT asserted (honest not-asserted note)');
ok(live.evidence.broad_gh_auth_used_for_intake===false && live.evidence.deploy_key_used_for_intake===false && live.evidence.provider_call===false,'live: no broad-auth/deploy-key/provider intake');
// Simulated present + accepted read-only + intake (injected token; synthetic intakeFn) → verified-with-scope-limits
const fakePat='github_pat_'+'B'.repeat(30);
const intakeFn=(tok)=> ({exact_commit:'fb54698d5cbba4b55ef5aac2b189615154efc76e',manifest_digest:'m_abc',snapshot_digest:'arc_def',file_count:9,total_bytes:1104,held_fake_secret_files:5,redaction_summary:{held:5}});
const sim=runPatProof({account:SB,injectSecret:fakePat,intakeFn,scope:SCOPE.REPO_SCOPED_READONLY,metadata_sufficient:false});
ok(sim.status==='FINE_GRAINED_PAT_INTAKE_PROVEN_WITH_SCOPE_LIMITS','sim: accepted read-only + partial metadata → INTAKE_PROVEN_WITH_SCOPE_LIMITS');
ok(sim.evidence.exact_commit==='fb54698d5cbba4b55ef5aac2b189615154efc76e' && sim.evidence.intake_occurred===true,'sim: exact commit bound; intake occurred');
ok(sim.evidence.token_fingerprint_redacted && JSON.stringify(sim).indexOf(fakePat)===-1,'sim: fingerprint present; raw token NOT in result');
const simFull=runPatProof({account:SB,injectSecret:fakePat,intakeFn,scope:SCOPE.REPO_SCOPED_READONLY,metadata_sufficient:true});
ok(simFull.status==='FINE_GRAINED_PAT_PROOF_READY_WITH_LIMITS','sim: accepted + sufficient metadata → READY_WITH_LIMITS');
// write-scoped injected token → HOLD
const simBad=runPatProof({account:SB,injectSecret:fakePat,intakeFn,scope:SCOPE.WRITE_SCOPED});
ok(simBad.status==='HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS','sim: write-scoped → HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
