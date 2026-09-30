import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {supabaseUrl,supabaseKey} from './config';
import {sameRequestOrigin} from '@/lib/request-origin';
import {readWithOptionalProfileColor} from '@/lib/profile-compatibility';
export async function serverDatabase(){
  const jar=await cookies();
  return createServerClient(supabaseUrl,supabaseKey,{cookies:{getAll:()=>jar.getAll(),setAll(values){
    try{values.forEach(({name,value,options})=>jar.set(name,value,options))}catch{/* Proxy refreshes cookies for Server Components. */}
  }}});
}
export class AccessError extends Error {constructor(message:string,public status:number){super(message)}}
export async function requireMember(admin=false){
  const db=await serverDatabase();
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user)throw new AccessError('Inicia sesión para acceder a tu espacio.',401);
  const profile=await readWithOptionalProfileColor(withColor=>db.from('profiles').select(withColor?'id,email,full_name,role,identification_color':'id,email,full_name,role').eq('id',user.id).single().overrideTypes<{id:string;email:string;full_name:string;role:string;identification_color?:string|null},{merge:false}>());
  if(profile.error||!profile.data)throw new AccessError('No se pudo verificar tu acceso. Inténtalo nuevamente.',503);
  if(!['admin','sales'].includes(profile.data.role))throw new AccessError('Tu cuenta todavía no tiene acceso autorizado. Contacta al administrador.',403);
  if(admin&&profile.data.role!=='admin')throw new AccessError('Esta acción requiere una cuenta administradora.',403);
  return {db,user,profile:{...profile.data,identification_color:profile.data.identification_color??null} as {id:string;email:string;full_name:string;role:'admin'|'sales';identification_color:string|null}};
}
export const privateHeaders={'Cache-Control':'private, no-store, max-age=0'};
export function checkOrigin(request:Request){
  if(!sameRequestOrigin(request,!!process.env.VERCEL))throw new AccessError('Solicitud no permitida.',403);
}
export function databaseError(error:{code?:string;message?:string}){
  if(error.code==='40001')throw new AccessError('El catálogo cambió en otra sesión. Recarga antes de guardar.',409);
  if(error.code==='42501')throw new AccessError('No tienes permiso para acceder a este registro.',403);
  if(error.code==='23505')throw new AccessError('Este registro ya existe. Actualiza la pantalla.',409);
  throw new AccessError('No se pudo guardar la información. Tus cambios siguen en pantalla.',503);
}
