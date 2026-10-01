import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {supabaseUrl,supabaseKey,usesSupabase} from './lib/supabase/config';
export async function proxy(request:NextRequest){
  // Block before streaming: notFound() inside a streamed page can return HTTP 200.
  if(process.env.NODE_ENV!=='development'&&request.nextUrl.pathname.startsWith('/dev/'))return new NextResponse('Página no encontrada.',{status:404,headers:{'Cache-Control':'no-store'}});
  if(!usesSupabase)return NextResponse.next();
  let response=NextResponse.next({request});
  const db=createServerClient(supabaseUrl,supabaseKey,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values,headers){
    values.forEach(({name,value})=>request.cookies.set(name,value));
    response=NextResponse.next({request});
    values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
    Object.entries(headers??{}).forEach(([name,value])=>response.headers.set(name,value));
  }}});
  await db.auth.getClaims();
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
export const config={matcher:['/','/acceso','/auth/:path*','/api/:path*','/dev/:path*']};
