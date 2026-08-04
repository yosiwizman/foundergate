import { makeMockPrivateRepo } from '../../../src/repo_intake/private_repo_readonly/mock_private_repo_adapter.mjs';
import { assertReadOnly, FORBIDDEN_METHODS } from '../../../src/repo_intake/private_repo_readonly/private_repo_readonly_adapter_contract.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const a=makeMockPrivateRepo();
const c=assertReadOnly(a);
ok(c.is_read_only===true && c.has_write_path===false && c.status==='READ_ONLY_OK','mock adapter is read-only (no write path)');
ok(FORBIDDEN_METHODS.every(m=>typeof a[m]!=='function'),'no forbidden methods exist (push/commit/write/exec/provider/merge)');
ok(a.getRepoMetadata().synthetic===true && a.getArchiveManifest().commit==='a1b2c3d4e5f6','read-only metadata + manifest returned (synthetic)');
// a write-path adapter must be caught
ok(assertReadOnly({getRepoMetadata:()=>({}),push:()=>{}}).status==='HOLD_WRITE_PATH_PRESENT','adapter with push → HOLD_WRITE_PATH_PRESENT');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
