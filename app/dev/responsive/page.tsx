import {notFound} from 'next/navigation';
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <main style={{padding:20}}><h1>Verificación móvil · 390 px</h1><iframe title="Cotizador en celular" src="/" style={{width:390,height:844,border:'1px solid #a9c3cc',background:'white'}}/></main>}
