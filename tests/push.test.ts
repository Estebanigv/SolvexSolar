import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import {allowedPushEndpoint,pushSubscriptionSchema} from '../lib/push-validation';
test('push delivery and validation',async()=>{
for(const url of ['http://localhost/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://fcmXgoogleapisXcom/x','https://fcm.googleapis.com:8443/x','https://user@web.push.apple.com/x','file:///x'])assert.equal(allowedPushEndpoint(url),false,url);
for(const url of ['https://fcm.googleapis.com/fcm/send/abc','https://web.push.apple.com/abc','https://updates.push.services.mozilla.com/wpush/v2/abc','https://wns2-something.notify.windows.com/x'])assert.equal(allowedPushEndpoint(url),true,url);
assert.equal(pushSubscriptionSchema.safeParse({endpoint:'https://fcm.googleapis.com/x',keys:{p256dh:'bad',auth:'bad'}}).success,false);
const receiver=createECDH('prime256v1');receiver.generateKeys();
const vapid=webpush.generateVAPIDKeys(),subscription={endpoint:'https://fcm.googleapis.com/test',keys:{p256dh:receiver.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
assert.equal(pushSubscriptionSchema.safeParse(subscription).success,true);
const payload=JSON.stringify({title:'Lead asignado',body:'Abre tu CRM.',id:'test'});
const req=webpush.generateRequestDetails(subscription,payload,{vapidDetails:{subject:'mailto:contacto@fogeli.cl',...vapid},TTL:3600});
assert.equal(req.method,'POST');assert.equal(req.headers['Content-Encoding'],'aes128gcm');
assert(!req.body?.toString().includes('Abre tu CRM.'));
const events:Record<string,(event:unknown)=>void>={},shown:{title:string;options:Record<string,unknown>}[]=[],opened:string[]=[];
runInNewContext(readFileSync('public/sw.js','utf8'),{URL,encodeURIComponent,self:{addEventListener:(name:string,handler:(event:unknown)=>void)=>{events[name]=handler},skipWaiting:()=>Promise.resolve(),location:{origin:'https://cotizador.solvexsolar.cl'},clients:{claim:()=>Promise.resolve(),openWindow:(url:string)=>{opened.push(url);return Promise.resolve()}},registration:{showNotification:(title:string,options:Record<string,unknown>)=>{shown.push({title,options});return Promise.resolve()}}}});
let pending:Promise<unknown>=Promise.resolve();
events.push({data:{json:()=>({title:'Lead asignado',id:'notice-1',url:'https://evil.test/'})},waitUntil:(p:Promise<unknown>)=>{pending=p}});
await pending;
assert.equal(shown.length,1);assert.equal(shown[0].options.tag,'notice-1');
events.notificationclick({notification:{close(){},data:shown[0].options.data},waitUntil:(p:Promise<unknown>)=>{pending=p}});
await pending;assert.equal(opened[0],'https://cotizador.solvexsolar.cl/crm?notification=notice-1');
assert(!events.fetch,'The worker must not cache private pages');
console.log('Push: trusted endpoints, valid subscriptions, encrypted payload, visible notification and safe CRM destination passed.');


});
