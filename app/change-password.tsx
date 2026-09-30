'use client';
import {useState} from 'react';
import {KeyRound,Eye,EyeOff} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {passwordChangeSchema} from '@/lib/password-change';
export function ChangePasswordButton({preview=false}:{preview?:boolean}){
  const [open,setOpen]=useState(false),[current,setCurrent]=useState(''),[next,setNext]=useState(''),[confirm,setConfirm]=useState(''),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  function reset(value:boolean){if(busy)return;setOpen(value);setCurrent('');setNext('');setConfirm('');setVisible(false);setError('');}
  async function save(){
    if(preview)return;
    const parsed=passwordChangeSchema.safeParse({currentPassword:current,newPassword:next});
    if(!parsed.success){setError(parsed.error.issues[0].message);return;}
    if(next!==confirm){setError('Las contraseñas nuevas no coinciden.');return;}
    setBusy(true);setError('');
    try{const response=await fetch('/api/members/me/password',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data)});const body=await response.json() as {error?:string};if(!response.ok)throw Error(body.error||'No se pudo actualizar la contraseña.');setCurrent('');setNext('');setConfirm('');window.location.assign('/acceso');}catch(e){setError((e as Error).message);setBusy(false);}
  }
  return <><Button type="button" variant="outline" onClick={()=>reset(true)}><KeyRound size={15}/>Cambiar mi contraseña</Button><Dialog open={open} onOpenChange={reset}><DialogContent className="team-password-dialog"><DialogHeader><DialogTitle>Cambiar mi contraseña</DialogTitle><DialogDescription>Actualiza la contraseña de tu propia cuenta. Al guardar, tendrás que iniciar sesión con la nueva.</DialogDescription></DialogHeader><form onSubmit={e=>{e.preventDefault();void save();}}>
    {preview&&<p className="team-password-preview" role="note">Vista de ejemplo: no ingreses una contraseña real. El guardado estará disponible en tu cuenta conectada.</p>}
    <label>Contraseña actual<input type={visible?'text':'password'} autoComplete="current-password" value={current} disabled={busy||preview} onChange={e=>setCurrent(e.target.value)} required/></label>
    <label>Nueva contraseña<input type={visible?'text':'password'} autoComplete="new-password" value={next} minLength={12} maxLength={72} disabled={busy||preview} onChange={e=>setNext(e.target.value)} required/></label><p className="team-password-hint">Usa al menos 12 caracteres. Puedes combinar varias palabras.</p>
    <label>Confirmar nueva contraseña<input type={visible?'text':'password'} autoComplete="new-password" value={confirm} minLength={12} maxLength={72} disabled={busy||preview} onChange={e=>setConfirm(e.target.value)} required/></label>
    <button type="button" className="team-password-show" aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={16}/>:<Eye size={16}/>} {visible?'Ocultar contraseñas':'Mostrar contraseñas'}</button>
    {error&&<p className="team-error" role="alert">{error}</p>}<div className="team-dialog-actions"><Button type="button" variant="outline" disabled={busy} onClick={()=>reset(false)}>Cancelar</Button><Button type="submit" disabled={busy||preview}>{busy?'Actualizando…':'Guardar nueva contraseña'}</Button></div>
  </form></DialogContent></Dialog></>;
}
