import QuoteApp from './quote-app';
import {WorkspaceStatus} from './workspace-status';
import {usesSupabase} from '@/lib/supabase/config';
import {AccessError,requireMember} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
export default async function Home(){
  if(usesSupabase){
    try{await requireMember()}catch(e){
      if(e instanceof AccessError&&e.status===401)redirect('/acceso');
      if(e instanceof AccessError&&e.status===403)redirect('/acceso?estado=pendiente');
      return <WorkspaceStatus error={e instanceof AccessError?e.message:'No pudimos conectar con tu espacio. Vuelve a intentarlo.'}/>;
    }
  }
  return <QuoteApp/>;
}
