import { pad } from './node_modules/leftpad/index.mjs';
if(pad(7,3)!=='007'){console.error('FAIL');process.exit(1)} console.log('1/1 passing')
