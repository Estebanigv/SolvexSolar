import {createClient} from '@supabase/supabase-js';
import {supabaseUrl,supabaseKey} from '@/lib/supabase/config';
import {requireMember,privateHeaders,checkOrigin,AccessError} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {passwordChangeSchema,passwordChangeError} from '@/lib/password-change';
export async function PATCH(request:Request){return protectedApi(async()=>{
  checkOrigin(request);
  const {db,user}=await requireMember();
  const {currentPassword,newPassword}=passwordChangeSchema.parse(await request.json());
  if(!user.email)throw new AccessError('La cuenta no tiene un correo disponible.',400);
  // Fresh, isolated session: verifies the current password without persisting it or
  // replacing the browser session before the change succeeds. No service key.
  const verified=createClient(supabaseUrl,supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const signed=await verified.auth.signInWithPassword({email:user.email,password:currentPassword});
  if(signed.error)throw new AccessError(signed.error.status===429?'Espera unos minutos antes de volver a intentar.':'La contraseña actual no es correcta.',signed.error.status===429?429:400);
  try{
    if(signed.data.user?.id!==user.id)throw new AccessError('No se pudo verificar tu identidad.',403);
    const {error}=await verified.auth.updateUser({password:newPassword,current_password:currentPassword});
    if(error)throw new AccessError(passwordChangeError(error.code),error.status===429?429:400);
    // Revoke refresh sessions and clear the application cookie after success.
    await verified.auth.signOut({scope:'global'});
    await db.auth.signOut({scope:'local'});
    return Response.json({ok:true},{headers:privateHeaders});
  }finally{await verified.auth.signOut({scope:'local'}).catch(()=>{});}
})}
