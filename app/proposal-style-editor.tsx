'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {defaultProposalStyle,proposalStyleSchema,resolveProposalStyle,type ProposalStyle} from '@/lib/proposal-style';
import {usesSupabase} from '@/lib/supabase/config';

export function ProposalStyleEditor({value,onChange,disabled}:{value:ProposalStyle|undefined;onChange:(style:ProposalStyle)=>void;disabled:boolean}){
 const style=resolveProposalStyle(value);
 const [personal,setPersonal]=useState<ProposalStyle|null>(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  async function load(){try{
   const data=usesSupabase?await fetch('/api/members/me/proposal-style',{signal:controller.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('No se pudo cargar tu estilo personal.');return r.json();}):{style:JSON.parse(localStorage.getItem('solvex-demo-proposal-style')??'null')};
   if(active){const parsed=proposalStyleSchema.safeParse(data&&typeof data==='object'&&'style' in data?data.style:null);setPersonal(parsed.success?parsed.data:null);setError('');}
  }catch(e){if(active)setError((e as Error).message);}finally{if(active)setLoading(false);}}
  void load();return()=>{active=false;controller.abort();};
 },[retry]);
 function change(patch:Partial<ProposalStyle>){onChange({...style,...patch});setMessage('');}
 async function savePersonal(){setSaving(true);setError('');setMessage('');try{
  const parsed=proposalStyleSchema.parse(style);
  if(usesSupabase){const r=await fetch('/api/members/me/proposal-style',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed)});if(!r.ok)throw Error('No se pudo guardar tu estilo. Tu propuesta sigue en pantalla.');}
  else localStorage.setItem('solvex-demo-proposal-style',JSON.stringify(parsed));
  setPersonal(parsed);setMessage(usesSupabase?'Mi estilo guardado en tu cuenta. Puedes aplicarlo a otras propuestas.':'Estilo de demostración guardado en este navegador.');
 }catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 return <details className="proposal-edit-block proposal-style-tools" open><summary>Diseño y mi estilo</summary>
  <p>Personaliza esta propuesta. Guarda tu estilo en tu cuenta para reutilizarlo sin cambiar el de tus compañeros.</p>
  <fieldset disabled={disabled||saving}>
   <label>Tipografía<select value={style.font} onChange={e=>change({font:e.target.value as ProposalStyle['font']})}><option value="sans">Arial / Helvetica</option><option value="serif">Times — editorial</option><option value="mono">Courier — monoespaciada</option></select></label>
   <label>Tamaño del texto · {Math.round(style.textScale*100)}%<input type="range" min={85} max={115} step={5} value={Math.round(style.textScale*100)} onChange={e=>change({textScale:Number(e.target.value)/100})}/></label>
   <div className="proposal-style-colors">{([['primary','Color principal'],['accent','Acentos y gráficos'],['text','Texto'],['background','Fondo de páginas'],['panel','Fondo de bloques'],['cover','Fondo de portada']] as const).map(([key,label])=><label key={key}>{label}<input type="color" value={style[key]} onChange={e=>change({[key]:e.target.value})}/></label>)}</div>
   <label className="proposal-visibility"><input type="checkbox" checked={style.coverPhoto} onChange={e=>change({coverPhoto:e.target.checked})}/>Fotografía en portada</label>
   <div className="proposal-editor-buttons"><Button type="button" variant="outline" onClick={()=>{onChange(personal!);setMessage('Tu estilo se aplicó a esta propuesta.');}} disabled={loading||!personal}>Aplicar mi estilo</Button><Button type="button" onClick={()=>void savePersonal()} disabled={loading}>{saving?'Guardando estilo…':'Guardar como mi estilo'}</Button><Button type="button" variant="outline" onClick={()=>{onChange({...defaultProposalStyle});setMessage('Diseño Solvex restaurado en esta propuesta.');}}>Restaurar diseño Solvex</Button></div>
  </fieldset>
  {loading&&<p role="status">Cargando tu estilo…</p>}{message&&<p role="status">{message}</p>}{error&&<><p role="alert">{error}</p><Button type="button" variant="outline" disabled={saving||disabled} onClick={()=>{setLoading(true);setRetry(n=>n+1);}}>Reintentar</Button></>}
  <p>Guardar propuesta conserva este diseño en esa versión. Guardar como mi estilo conserva solo tus preferencias visuales.</p>
 </details>;
}
