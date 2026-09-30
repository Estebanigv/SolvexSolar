import assert from 'node:assert/strict';
import {cneQuerySchema,getCneReference,summarizeCne,type CneQuery} from '../lib/cne';
import {createCneTokenProvider} from '../lib/cne-auth';
const q:CneQuery={commune:'Puente Alto',region:'Metropolitana de Santiago',year:2022,month:12,sector:'residential'};
const row={anio:2022,mes:12,region:'Región Metropolitana de Santiago',comuna:'Puente Alto',tipo_clientes:'Residencial',tarifa:'BT1',clientes_facturados:10,energia_kwh:1000};
assert.equal(cneQuerySchema.safeParse({...q,region:'Valparaíso'}).success,false);
assert.equal(cneQuerySchema.safeParse({...q,email:'private@example.com'}).success,false);
assert.equal(cneQuerySchema.safeParse({...q,month:13}).success,false);
const rows=[row,{...row,tarifa:'BT2',clientes_facturados:90,energia_kwh:18000},{...row,tipo_clientes:'No Residencial',energia_kwh:99000},{...row,comuna:'Santiago'},{...row,region:'Valparaíso'},{...row,mes:11}];
const summary=summarizeCne(rows,q);
assert.equal(summary.clients,100);assert.equal(summary.totalKwh,19000);assert.equal(summary.averageKwh,190);
assert.deepEqual(summary.tariffs,['BT1','BT2']);
assert.equal(summarizeCne(rows,{...q,sector:'non-residential'}).totalKwh,99000);
assert.equal(summarizeCne([],q).available,false);assert.equal(summarizeCne([],q).averageKwh,null);
assert.equal(summarizeCne([{...row,clientes_facturados:0,energia_kwh:0}],q).averageKwh,null);
assert.equal(summarizeCne([{...row,comuna:'Maipú'}],{...q,commune:'Maipu'}).clients,10);
assert.throws(()=>summarizeCne([{...row,energia_kwh:-1}],q),/negativos/);
assert.equal(summarizeCne([row,{...row,comuna:'Osorno',energia_kwh:-1}],q).clients,10);
assert.equal(summarizeCne([{...row,comuna:'Mostazal',region:'Región del Libertador Gral. Bernardo O’Higgins'}],{...q,commune:'Mostazal',region:"Libertador General Bernardo O'Higgins"}).clients,10);
const page=(data:unknown[],current=1,last=1,total=data.length)=>({success:true,data,pagination:{current_page:current,last_page:last,total}});
async function run(){
 let time=Date.now(),logins=0;
 const jwt=()=>`header.${Buffer.from(JSON.stringify({exp:Math.floor(time/1000)+3600})).toString('base64url')}.signature`;
 const provider=createCneTokenProvider((async(url,init)=>{logins++;assert.equal(String(url),'https://api.cne.cl/api/login');assert.equal(init?.method,'POST');assert.equal(init?.redirect,'error');assert.equal(new URLSearchParams(String(init?.body)).get('password'),'test#password');return Response.json({token:jwt()})}) as typeof fetch,()=>time);
 const initial=await Promise.all([provider('test@example.com','test#password'),provider('test@example.com','test#password')]);assert.equal(logins,1);assert.equal(initial[0],initial[1]);
 await provider('test@example.com','test#password');assert.equal(logins,1);
 time+=3600000;await provider('test@example.com','test#password');assert.equal(logins,2);
 await provider('test@example.com','test#password',true);assert.equal(logins,3);
 await assert.rejects(()=>createCneTokenProvider((async()=>new Response('secret upstream body',{status:401})) as typeof fetch)('test@example.com','test#password'),/revisar el correo/);
 await assert.rejects(()=>createCneTokenProvider((async()=>Response.json({token:'header.'+Buffer.from(JSON.stringify({exp:1})).toString('base64url')+'.signature'})) as typeof fetch)('test@example.com','test#password'),/vencida/);
 let calls=0;
 const result=await getCneReference(q,{token:'test-secret',fetcher:(async(url,init)=>{
  const u=new URL(String(url));calls++;assert.equal(u.hostname,'api.cne.cl');assert.equal(u.searchParams.get('page'),String(calls));assert.equal(u.searchParams.get('per_page'),'2000');assert.equal(u.searchParams.get('year'),'2022');assert.equal(init?.redirect,'error');assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-secret');
  return Response.json(page([{...row,clientes_facturados:'10',energia_kwh:'1000'}],calls,2,2));
 }) as typeof fetch});
 assert.equal(calls,2);assert.equal(result.clients,20);assert.equal(result.averageKwh,100);assert.equal(JSON.stringify(result).includes('test-secret'),false);
 for(const invalid of [page([row],1,1,2),page([{...row,mes:11}]),page([{...row,energia_kwh:'bad'}]),{success:false},page([row],2)]){
  await assert.rejects(()=>getCneReference(q,{token:'test-secret',fetcher:(async()=>Response.json(invalid)) as typeof fetch}));
 }
 await assert.rejects(()=>getCneReference(q,{token:'test-secret',fetcher:(async()=>new Response('private upstream message',{status:401})) as typeof fetch}),/renovar la conexión/);
 const empty=await getCneReference(q,{token:'test-secret',fetcher:(async()=>Response.json(page([]))) as typeof fetch});assert.equal(empty.available,false);
 console.log('CNE: región/comuna, sector, promedio ponderado, paginación completa, errores y privacidad: OK');
}
void run();
