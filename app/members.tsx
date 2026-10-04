'use client';
import {MemberAccess} from './member-access';
import {activityTime} from '@/lib/activity';
import {ChangePasswordButton} from './change-password';
import {useMemo,useState} from 'react';
import useSWR from 'swr';
import {Search,ShieldCheck,Users,RefreshCw,Mail,LockKeyhole,UserRoundCheck,PauseCircle,Palette,Check} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {memberColors,memberColor,memberColorStyle,type MemberColor} from '@/lib/member-color';
import {toast} from 'sonner';

export type TeamMember={id:string;email:string;full_name:string;role:'admin'|'sales'|'pending'|'disabled';last_login?:string|null;last_activity?:string|null;created_at?:string;identification_color?:MemberColor|null};
export type TeamSource={load:(signal:AbortSignal)=>Promise<TeamMember[]>;setRole:(id:string,role:'admin'|'disabled')=>Promise<void>;setColor:(color:MemberColor|null)=>Promise<MemberColor|null>};
async function json<T>(response:Response){const data=await response.json() as T&{error?:string};if(!response.ok)throw Object.assign(Error(data.error||'No se pudo actualizar el acceso.'),{status:response.status});return data;}
const teamSource:TeamSource={
  load:signal=>fetch('/api/members',{signal}).then(json<{members:TeamMember[]}>).then(data=>data.members),
  setColor:async color=>(await fetch('/api/members/me/color',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({color})}).then(json<{color:MemberColor|null}>)).color,
  setRole:async(id,role)=>{await fetch('/api/members',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,role})}).then(json);},
};
async function loadTeam(dataSource:TeamSource){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try{return await dataSource.load(controller.signal);}
  catch(error){if(controller.signal.aborted)throw Error('La consulta está tardando más de lo esperado. Vuelve a intentarlo.');throw error;}
  finally{clearTimeout(timeout);}
}
function initials(member:TeamMember){return (member.full_name.trim()||member.email).split(/\s+/).slice(0,2).map(part=>part[0]).join('').toLocaleUpperCase('es');}
function accessState(member:TeamMember){return member.role==='disabled'?'suspended':member.role==='pending'?'pending':'active';}
const stateNames={active:'Activo',pending:'Pendiente',suspended:'Suspendido'};

export function Members({currentId,dataSource=teamSource,onColorChange,preview=false}:{currentId:string;dataSource?:TeamSource;preview?:boolean;onColorChange?:(color:MemberColor|null)=>void}){
  const {data, error:loadError, isLoading:loading, isValidating, mutate}=useSWR<TeamMember[],Error&{status?:number}>(['team',currentId,dataSource],()=>loadTeam(dataSource),{dedupingInterval:5000,shouldRetryOnError:false});
  const denied=loadError?.status===401||loadError?.status===403;
  const members=useMemo(()=>denied?[]:data??[],[data,denied]);
  const error=loadError?.message??'';
  const [colorOpen,setColorOpen]=useState(false),[chosenColor,setChosenColor]=useState<MemberColor|null>(null),[colorSaving,setColorSaving]=useState(false),[colorError,setColorError]=useState('');
  const currentMember=members.find(m=>m.id===currentId);
  function editColor(){setChosenColor(currentMember?.identification_color??null);setColorError('');setColorOpen(true);}
  async function saveColor(){setColorSaving(true);setColorError('');try{const color=await dataSource.setColor(chosenColor);await mutate(rows=>(rows??[]).map(m=>m.id===currentId?{...m,identification_color:color}:m),{revalidate:false});onColorChange?.(color);setColorOpen(false);toast.success('Tu color de identificación quedó guardado.');}catch(e){setColorError((e as Error).message);}finally{setColorSaving(false);}}
  const [search,setSearch]=useState(''),[filter,setFilter]=useState('all');
  const [change,setChange]=useState<{member:TeamMember;role:'admin'|'disabled'}|null>(null),[saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
  const visible=useMemo(()=>{
    const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
    return members.filter(m=>(filter==='all'||accessState(m)===filter)&&normalize(m.full_name+' '+m.email).includes(normalize(search))).sort((a,b)=>a.id===currentId?-1:b.id===currentId?1:(a.full_name||a.email).localeCompare(b.full_name||b.email,'es'));
  },[members,filter,search,currentId]);
  const counts={all:members.length,active:members.filter(m=>accessState(m)==='active').length,pending:members.filter(m=>accessState(m)==='pending').length,suspended:members.filter(m=>accessState(m)==='suspended').length};
  function open(member:TeamMember,role:'admin'|'disabled'){setChange({member,role});setSaveError('');}
  async function confirm(){if(!change||change.member.id===currentId)return;setSaving(true);setSaveError('');try{await dataSource.setRole(change.member.id,change.role);await mutate(old=>(old??[]).map(m=>m.id===change.member.id?{...m,role:change.role}:m),{revalidate:false});setChange(null);toast.success(change.role==='admin'?'Acceso de administrador habilitado.':'Acceso suspendido.');}catch(e){setSaveError((e as Error).message);}finally{setSaving(false);}}
  return <section className="team-directory" aria-label="Usuarios del equipo">
    <header className="team-heading"><div className="team-emblem" aria-hidden="true"><Users size={25}/></div><div><h2>Equipo de administración</h2><p>Las personas detrás de cada proyecto de Solvex Solar.</p></div><div className="team-heading-actions">{!preview&&<MemberAccess members={members}/>}<Button variant="outline" disabled={isValidating} onClick={()=>void mutate()}><RefreshCw size={16} className={isValidating?'team-loading-icon':undefined}/><span>Actualizar</span></Button></div></header>
    <div className="team-scope"><ShieldCheck size={19} aria-hidden="true"/><p><strong>Un equipo, acceso completo.</strong> Los administradores pueden editar precios y gestionar clientes, cotizaciones y accesos.</p></div>
    <div className="team-tools"><div className="team-filters" aria-label="Filtrar usuarios por estado">{([['all','Todos'],['active','Activos'],['pending','Pendientes'],['suspended','Suspendidos']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}<span>{counts[value]}</span></button>)}</div><label className="team-search"><Search size={17} aria-hidden="true"/><input aria-label="Buscar usuario" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o correo"/></label></div>
    {error&&<div className="team-error" role="alert">{error}<Button variant="outline" disabled={isValidating} onClick={()=>void mutate()}>Reintentar</Button></div>}
    {isValidating&&!loading&&members.length>0&&<div className="team-refresh-status" role="status"><RefreshCw size={16} className="team-loading-icon" aria-hidden="true"/>Actualizando el equipo…</div>}
    {loading?<div className="team-loading"><p role="status"><RefreshCw size={20} className="team-loading-icon" aria-hidden="true"/>Cargando el equipo…</p><div aria-hidden="true">{[0,1,2].map(i=><div className="team-loading-row" key={i}><span/><div><i/><i/></div></div>)}</div></div>:(!error||members.length>0)&&<>
      <div className="team-column-head" aria-hidden="true"><span>Integrante</span><span>Acceso</span><span>Estado</span><span>Gestión</span></div>
      <div className="team-list">{visible.map(m=>{const state=accessState(m),self=m.id===currentId;return <article className="team-member" key={m.id} data-self={self}>
        <div className="team-identity"><div className="team-avatar team-person-color" style={memberColorStyle(m.identification_color,m.id)} data-state={state} aria-hidden="true">{initials(m)}</div><div><div className="team-name"><h3>{m.full_name.trim()||'Nombre por completar'}</h3>{self&&<span className="team-you">Tú</span>}</div><p className="team-email"><Mail size={13} aria-hidden="true"/><span title={m.email}>{m.email}</span></p>{m.created_at&&<small>En el equipo desde {new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'short',year:'numeric'}).format(new Date(m.created_at))}</small>}</div></div>
        <div className="team-role"><span><ShieldCheck size={14} aria-hidden="true"/>{m.role==='admin'?'Administrador':m.role==='sales'?'Ejecutivo':'Sin acceso activo'}</span><small>{m.role==='admin'?'Gestión completa':m.role==='sales'?'Cartera propia':'Requiere autorización'}</small><small>Último acceso: {m.last_login?activityTime(m.last_login):'Sin registro'}</small><small>Última modificación: {m.last_activity?activityTime(m.last_activity):'Sin registro'}</small></div>
        <span className="team-status" data-state={state}><i aria-hidden="true"/>{stateNames[state]}</span>
        <div className="team-actions">{self?<div className="team-own-actions"><span className="team-current"><LockKeyhole size={14} aria-hidden="true"/>Tu sesión actual</span>{m.role==='admin'&&<Button variant="outline" onClick={editColor}><Palette size={15}/>Cambiar mi color</Button>}<ChangePasswordButton preview={preview}/></div>:<>{m.role!=='admin'&&<Button variant="outline" onClick={()=>open(m,'admin')}><UserRoundCheck size={15}/>{state==='suspended'?'Reactivar acceso':state==='pending'?'Autorizar acceso':'Hacer administrador'}</Button>}{state==='active'&&<Button variant="ghost" className="team-suspend" onClick={()=>open(m,'disabled')}><PauseCircle size={15}/>Suspender acceso</Button>}</>}</div>
      </article>;})}</div>
      {!visible.length&&<div className="team-empty"><Search size={28}/><strong>{members.length?'No encontramos usuarios con ese filtro':'Todavía no hay usuarios disponibles'}</strong><p>{members.length?'Prueba con otro nombre, correo o estado.':'Actualiza la lista cuando se haya creado una cuenta.'}</p>{(search||filter!=='all')&&<Button variant="outline" onClick={()=>{setSearch('');setFilter('all');}}>Limpiar filtros</Button>}</div>}
      <footer className="team-footer"><span>{visible.length} de {members.length} integrantes</span><span><LockKeyhole size={13} aria-hidden="true"/>Tu propio acceso permanece protegido.</span></footer>
    </>}
    <Dialog open={colorOpen} onOpenChange={open=>{if(!colorSaving)setColorOpen(open);}}><DialogContent className="team-color-dialog"><DialogHeader><DialogTitle>Tu color de identificación</DialogTitle><DialogDescription>Elige cómo se verá tu perfil y tus etiquetas en cotizaciones, calendario y actividad. Tu nombre seguirá visible.</DialogDescription></DialogHeader>
      <div className="team-color-preview" style={memberColorStyle(chosenColor,currentId)}><div className="team-avatar team-person-color" aria-hidden="true">{currentMember?initials(currentMember):'SS'}</div><div><strong>{currentMember?.full_name||currentMember?.email}</strong><span>Administrador</span></div><span className="team-color-tag"><i/>{memberColor(chosenColor,currentId).name}</span></div>
      <div className="team-color-options" aria-label="Colores de identificación">{memberColors.map(color=><button type="button" key={color.id} aria-pressed={chosenColor===color.id} onClick={()=>setChosenColor(color.id)} style={memberColorStyle(color.id,currentId)} disabled={colorSaving}><span className="team-color-dot">{chosenColor===color.id&&<Check size={15}/>}</span>{color.name}</button>)}</div>
      <button type="button" className="team-color-auto" aria-pressed={chosenColor===null} disabled={colorSaving} onClick={()=>setChosenColor(null)}>Usar color automático{chosenColor===null?' · Seleccionado':''}</button>
      <p className="team-color-note">El cambio solo afecta tu color. Los colores pueden repetirse entre integrantes.</p>{colorError&&<p role="alert" className="team-error">{colorError}</p>}<div className="team-dialog-actions"><Button variant="outline" disabled={colorSaving} onClick={()=>setColorOpen(false)}>Cancelar</Button><Button disabled={colorSaving||chosenColor===(currentMember?.identification_color??null)} onClick={saveColor}>{colorSaving?'Guardando…':'Guardar mi color'}</Button></div>
    </DialogContent></Dialog>
    <Dialog open={!!change} onOpenChange={open=>{if(!open&&!saving)setChange(null);}}><DialogContent className="team-dialog"><DialogHeader><DialogTitle>{change?.role==='disabled'?'Suspender acceso':'Habilitar administrador'}</DialogTitle><DialogDescription>{change?.member.full_name||change?.member.email} · {change?.member.email}</DialogDescription></DialogHeader><p>{change?.role==='disabled'?'Esta persona dejará de tener acceso al espacio de trabajo. Sus clientes y cotizaciones se conservarán. Puedes reactivar su acceso cuando lo necesites.':'Esta persona podrá consultar todos los clientes y cotizaciones, editar el catálogo y administrar los accesos del equipo.'}</p>{saveError&&<p role="alert" className="team-error">{saveError}</p>}<div className="team-dialog-actions"><Button variant="outline" disabled={saving} onClick={()=>setChange(null)}>Cancelar</Button><Button disabled={saving} onClick={confirm}>{saving?'Guardando…':change?.role==='disabled'?'Confirmar suspensión':'Confirmar acceso administrador'}</Button></div></DialogContent></Dialog>
  </section>;
}
