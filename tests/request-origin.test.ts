import assert from 'node:assert/strict';
import {sameRequestOrigin} from '../lib/request-origin';
const request=(origin:string,host='solvex-solar.vercel.app')=>new Request('http://localhost:3014/api/quotes',{headers:{Origin:origin,Host:host}});
assert.equal(sameRequestOrigin(request('https://solvex-solar.vercel.app'),true),true);
assert.equal(sameRequestOrigin(request('http://127.0.0.1:3014','127.0.0.1:3014')),true);
for(const origin of ['null','https://other.example','https://solvex-solar.vercel.app.evil.example','https://solvex-solar.vercel.app/path','http://solvex-solar.vercel.app'])assert.equal(sameRequestOrigin(request(origin),true),false);
assert.equal(sameRequestOrigin(new Request('https://solvex-solar.vercel.app')),false);
console.log('Origen: host público, proxy interno, localhost y rechazo de solicitudes ajenas: OK');
