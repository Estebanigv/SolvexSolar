import QuoteApp from './quote-app';
import {usesSupabase} from '@/lib/supabase/config';
import {AccessError,requireMember} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
export default async function Home(){
  if(usesSupabase){
    try{await requireMember()}catch(e){
      if(e instanceof AccessError&&e.status===401)redirect('/acceso');
      if(e instanceof AccessError&&e.status===403)redirect('/acceso?estado=pendiente');
      return <main className="auth-shell"><section className="auth-card"><h1>No pudimos abrir tu espacio</h1><p>La conexión no respondió. Vuelve a intentarlo en unos minutos.</p><a href="/">Reintentar</a></section></main>;
    }
  }
  return <QuoteApp/>;
}
