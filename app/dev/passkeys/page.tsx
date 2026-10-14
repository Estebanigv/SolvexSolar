import {notFound} from 'next/navigation';
import {PasskeySettings} from '@/app/passkey-settings';
export default function Page(){
  if(process.env.NODE_ENV!=='development')notFound();
  return <main style={{padding:24}}><h1>Vista local de acceso biométrico</h1><p>Esta vista no registra claves ni cambia cuentas.</p><PasskeySettings preview/></main>;
}
