'use client';
import {useRef,useState,type FormEvent} from 'react';
import {UserPlus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {memberCreateSchema,type MemberCreate} from '@/lib/member-create';

export function MemberCreateButton({onCreated,preview=false,send}:{onCreated:()=>void;preview?:boolean;send?:(input:MemberCreate)=>Promise<void>}){
 const [open,setOpen]=useState(false),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 const pending=useRef(false);
 function reset(next:boolean){if(pending.current)return;setOpen(next);setName('');setEmail('');setPassword('');setConfirm('');setError('');setDone(false);}
 async function submit(event:FormEvent){
  event.preventDefault();if(pending.current)return;
  const parsed=memberCreateSchema.safeParse({name,email,password});
  if(!parsed.success){setError(parsed.error.issues[0].message);return;}
  if(password!==confirm){setError('Las contraseñas no coinciden.');return;}
  pending.current=true;setBusy(true);setError('');
  try{
   if(preview&&!send)throw Error('Vista de ejemplo: no se crearán cuentas.');
   if(send)await send(parsed.data);
   else{const response=await fetch('/api/members/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data)});const body=await response.json() as {error?:string};if(!response.ok)throw Error(body.error||'No se pudo crear el usuario.');}
   setPassword('');setConfirm('');setDone(true);onCreated();
  }catch(e){setError((e as Error).message);}finally{pending.current=false;setBusy(false);}
 }
 return <><Button type="button" className="team-add-user" onClick={()=>reset(true)}><UserPlus size={18}/>Agregar usuario</Button><Dialog open={open} onOpenChange={reset}><DialogContent className="team-password-dialog"><DialogHeader><DialogTitle>{done?'Usuario creado':'Agregar usuario'}</DialogTitle><DialogDescription>{done?'La cuenta está lista para ingresar con su correo y contraseña inicial.':'Agrega una persona al equipo de Solvex Solar.'}</DialogDescription></DialogHeader>{done?<><p role="status">Cuenta creada: <strong>{email.trim()}</strong>. Entrega la contraseña inicial directamente a esa persona. Podrá cambiarla desde Mi cuenta.</p><Button onClick={()=>reset(false)}>Listo</Button></>:<form onSubmit={submit}>
 <label>Nombre completo<input autoComplete="off" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={150} required disabled={busy}/></label>
 <label>Correo del nuevo usuario<input type="email" autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} required disabled={busy}/></label>
 <label>Contraseña inicial<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={12} maxLength={72} required disabled={busy}/></label><label>Confirmar contraseña inicial<input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={12} maxLength={72} required disabled={busy}/></label><p className="team-password-preview"><strong>Acceso de administrador.</strong> Podrá gestionar clientes, cotizaciones, precios y usuarios, igual que los demás integrantes del equipo.</p>
 <p className="team-password-hint">Usa al menos 12 caracteres. Entrega la contraseña inicial de forma privada; no se enviará por correo.</p>
 {error&&<p className="team-error" role="alert">{error}</p>}<div className="team-dialog-actions"><Button type="button" variant="outline" disabled={busy} onClick={()=>reset(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy?'Creando…':'Crear usuario'}</Button></div>
 </form>}</DialogContent></Dialog></>;
}
