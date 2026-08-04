import { scanClaimText, validateClaim, isAllowedStatus, ALLOWED_STATUSES } from '../../src/physical_containment/physical-claim-blocker.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 16 forbidden claims blocked
ok(scanClaimText('this system is unhackable').clean===false,'16a "unhackable" blocked');
ok(scanClaimText('escape impossible here').clean===false,'16b "escape impossible" blocked');
ok(scanClaimText('a VM equals physically severed machine').clean===false,'16c VM=severed blocked');
// honest negation passes
ok(scanClaimText('This is NOT unhackable and does not claim escape impossible').clean===true,'honest negated disclaimer passes');
// allowed statuses
ok(isAllowedStatus('VERIFIED_WITHIN_DECLARED_BOUNDARIES')&&!isAllowedStatus('ABSOLUTELY_SECURE'),'allowed vocabulary enforced');
ok(validateClaim({status:'ESCAPE_IMPOSSIBLE'}).valid===false,'forbidden status rejected');
ok(validateClaim({status:'VERIFIED_WITHIN_DECLARED_BOUNDARIES'}).valid===true,'allowed status accepted');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
