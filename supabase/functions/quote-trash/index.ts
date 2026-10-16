import {createClient} from '@supabase/supabase-js';

const url=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return reply({code:'method'},405);
 try{
  const cronToken=req.headers.get('x-trash-token');
  let db=admin;
  let targets:{id:string;folio:string}[]=[];
  if(cronToken){
   const check=await admin.rpc('trash_verify_cron',{token:cronToken});
   if(check.error||check.data!==true)return reply({code:'unauthorized'},401);
   const cutoff=new Date(Date.now()-30*86400000).toISOString();
   const result=await admin.from('quotes').select('id,folio').not('deleted_at','is',null)
    .or(`deleted_at.lte.${cutoff},purge_started_at.not.is.null`).order('deleted_at').limit(100);
   if(result.error)return reply({code:'unavailable'},503);
   targets=result.data??[];
  }else{
   const authorization=req.headers.get('authorization')??'';
   if(!authorization.startsWith('Bearer '))return reply({code:'unauthorized'},401);
   db=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
   const user=await db.auth.getUser();
   if(user.error||!user.data.user)return reply({code:'unauthorized'},401);
   const member=await db.from('profiles').select('role').eq('id',user.data.user.id).single();
   if(member.error||member.data?.role!=='admin')return reply({code:'forbidden'},403);
   const body=await req.json().catch(()=>null);
   if(!body||typeof body.id!=='string'||! /^[0-9a-f-]{36}$/i.test(body.id)||typeof body.folio!=='string'||body.folio.length>100)return reply({code:'invalid'},400);
   targets=[{id:body.id,folio:body.folio}];
  }
  let deleted=0,failed=0;
  for(const target of targets){
   // Claim commits before file deletion: restoration and new uploads are blocked.
   const claim=await db.rpc('trash_claim_quote',{quote_id:target.id,confirm_folio:target.folio});
   if(claim.error||!claim.data){if(!cronToken)return reply({code:'changed'},409);failed++;continue;}
   const prefix=claim.data as string;
   const files=await admin.storage.from('boletas').list(prefix,{limit:100});
   if(files.error||files.data?.some(file=>!file.id)){failed++;continue;}
   const paths=(files.data??[]).map(file=>`${prefix}/${file.name}`);
   if(paths.length){const removed=await admin.storage.from('boletas').remove(paths);if(removed.error){failed++;continue;}}
   // SQL checks Storage metadata is empty before deleting the quote snapshot.
   const finish=await db.rpc('trash_finish_quote',{quote_id:target.id});
   if(finish.error||finish.data!==true){failed++;continue;}
   deleted++;
  }
  return failed?reply({code:'pending',deleted,failed},503):reply({ok:true,deleted});
 }catch{return reply({code:'unavailable'},503);}
});
