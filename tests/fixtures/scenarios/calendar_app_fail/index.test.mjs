const ev=[{t:9,d:3},{t:11,d:1}]; const clash=ev.some((a,i)=>ev.some((b,j)=>i!==j&&a.t<b.t+b.d&&b.t<a.t+a.d));
if(clash){console.error('0/3 failing: overlapping synthetic events');process.exit(1)}
