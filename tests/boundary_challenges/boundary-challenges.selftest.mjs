import { runChallenges, allBlockedObservations, CHALLENGES } from '../../src/boundary_challenges/boundary-challenges.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 5 records behavior not config-only: no observation → UNKNOWN, not PASS
const none=runChallenges({}); ok(none.status==='UNKNOWN'&&none.passed===0,'5 no observed behavior → UNKNOWN (config alone is not PASS)');
// all blocked → all passed
const good=runChallenges(allBlockedObservations()); ok(good.status==='ALL_BLOCKED'&&good.passed===CHALLENGES.length,'all blocked → ALL_BLOCKED');
// 6 forbidden network fail-open → FAIL_OPEN + stop
const fo=runChallenges({...allBlockedObservations(), outbound_http:'open'}); ok(fo.status==='FAIL_OPEN'&&fo.stop_required===true,'6 forbidden network fail-open → FAIL_OPEN + stop');
// 7 dns/direct-ip/proxy/package detected
const net=runChallenges({...allBlockedObservations(), dns_resolution:'open', direct_ip:'open', proxy_path:'open', package_registry:'reachable'}); ok(net.fail_open>=4,'7 dns/direct-ip/proxy/package failures detected');
// 8 credential/docker/host/evidence detected
const exp=runChallenges({...allBlockedObservations(), credential_read:'open', docker_socket:'open', host_path:'open', evidence_write:'open'}); ok(exp.fail_open>=4,'8 credential/docker/host/evidence failures detected');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
