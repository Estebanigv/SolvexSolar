import QuoteApp from './quote-app';
import {WorkspaceStatus} from './workspace-status';
import {usesSupabase} from '@/lib/supabase/config';
import {AccessError,requireMember} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';

export async function ProtectedWorkspace({initialPanel='quote'}:{initialPanel?:'quote'|'crm'}){
  const access=initialPanel==='crm'?'/acceso?next=%2Fcrm':'/acceso';
  if(usesSupabase){
    try{await requireMember()}catch(e){
      if(e instanceof AccessError&&e.status===401)redirect(access);
      if(e instanceof AccessError&&e.status===403)redirect(access+(initialPanel==='crm'?'&':'?')+'estado=pendiente');
      return <WorkspaceStatus error={e instanceof AccessError?e.message:'No pudimos conectar con tu espacio. Vuelve a intentarlo.'}/>;
    }
  }
  return <QuoteApp initialPanel={initialPanel}/>;
}
