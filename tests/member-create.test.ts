import assert from 'node:assert/strict';
import {createMemberHandler} from '../supabase/functions/member-create/handler';
import {memberCreateSchema} from '../lib/member-create';
import type {createClient} from '@supabase/supabase-js';

const input={name:'  Usuario de prueba  ',email:' NUEVO@example.com ',password:'Frase inicial para pruebas 2026'};
function setup(options:{role?:string;authError?:boolean;duplicate?:boolean;recent?:number;createError?:string;grantError?:boolean}={}){
 const calls:{key:string;input?:unknown}[]=[];
 const client=((_url:string,key:string)=>{
  calls.push({key});
  return {auth:{getUser:async()=>({data:{user:options.authError?null:{id:'caller'}},error:options.authError}),admin:{createUser:async(payload:unknown)=>{calls.push({key:'create',input:payload});return {data:{user:{id:'new-user'}},error:options.createError?{code:options.createError,message:'private details'}:null};}}},
  from:()=>({
   select:()=>({eq:()=>({single:async()=>({data:{role:options.role??'admin'},error:null})}),ilike:()=>({limit:async()=>({data:options.duplicate?[{id:'existing'}]:[],error:null})}),gte:async()=>({count:options.recent??0,error:null})}),
   update:(value:unknown)=>({eq:(column:string,id:string)=>({select:()=>({maybeSingle:async()=>{calls.push({key:'grant',input:{value,column,id}});return {data:options.grantError?null:{id},error:options.grantError};}})})}),
  })};
 }) as unknown as typeof createClient;
 return {calls,run:createMemberHandler({url:'https://example.supabase.co',anonKey:'public',serviceKey:'private',client})};
}
function request(body:unknown=input,token=true){return new Request('https://example.test',{method:'POST',headers:token?{Authorization:'Bearer test-token'}:{},body:JSON.stringify(body)});}
async function main(){
 assert.equal(memberCreateSchema.parse(input).email,'nuevo@example.com');
 assert.equal(memberCreateSchema.safeParse({...input,role:'admin'}).success,false);
 assert.equal(memberCreateSchema.safeParse({...input,password:'corta'}).success,false);
 assert.equal(memberCreateSchema.safeParse({...input,password:'🔒'.repeat(20)}).success,false);
 for(const role of ['sales','pending','disabled']){
  const s=setup({role});assert.equal((await s.run(request())).status,403);assert.ok(!s.calls.some(c=>c.key==='private'));
 }
 const anon=setup();assert.equal((await anon.run(request(input,false))).status,401);assert.equal(anon.calls.length,0);
 const badToken=setup({authError:true});assert.equal((await badToken.run(request())).status,401);
 for(const body of [{...input,role:'admin'},{...input,password:'short'},{...input,email:'invalid'}]){const s=setup();assert.equal((await s.run(request(body))).status,400);assert.ok(!s.calls.some(c=>c.key==='create'));}
 for(const options of [{duplicate:true},{recent:5},{createError:'email_exists'}]){const s=setup(options);const response=await s.run(request());assert.equal(response.status,options.recent?429:409);assert.ok(!s.calls.some(c=>c.key==='grant'));}
 const success=setup();const response=await success.run(request());assert.equal(response.status,201);assert.deepEqual(await response.json(),{id:'new-user'});
 assert.deepEqual(success.calls.find(c=>c.key==='create')?.input,{email:'nuevo@example.com',password:input.password,email_confirm:true,user_metadata:{full_name:'Usuario de prueba'}});
 assert.deepEqual(success.calls.find(c=>c.key==='grant')?.input,{value:{role:'admin'},column:'id',id:'new-user'});
 const partial=setup({grantError:true});assert.deepEqual(await (await partial.run(request())).json(),{code:'pending'});
 const failed=setup({createError:'server_error'});const message=await (await failed.run(request())).text();assert.ok(!message.includes(input.password));assert.ok(!message.includes('private details'));
 console.log('Alta de usuarios: permisos activos, validación, duplicados, límite, creación, auditoría por solicitante y errores sin secretos: OK');
}
void main();
