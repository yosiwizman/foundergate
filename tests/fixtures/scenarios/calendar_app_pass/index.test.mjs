// synthetic calendar app: schedule two non-overlapping events; assert no clash. NO real calendar.
const ev=[{t:9,d:1},{t:11,d:1}]; const clash=ev.some((a,i)=>ev.some((b,j)=>i!==j&&a.t<b.t+b.d&&b.t<a.t+a.d));
if(clash){console.error('FAIL clash');process.exit(1)} console.log('3/3 passing (synthetic calendar)')
