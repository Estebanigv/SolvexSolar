'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import type {CrmEntry} from '@/lib/crm';
import type {CrmTeamMember} from '@/lib/crm-assignment';
import type {CrmSource} from './crm';

export function CrmReassign({entry,source,disabled,onAssigned,onBusy}:{entry:CrmEntry;source:CrmSource;disabled:boolean;onAssigned:()=>Promise<void>;onBusy:(busy:boolean)=>void}){
  const [open,setOpen]=useState(false),[members,setMembers]=useState<CrmTeamMember[]>([]);
  const [target,setTarget]=useState(''),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
  async function show(){
    setOpen(true);setLoading(true);setError('');
    try{setMembers((await source.team()).members)}catch(e){setError((e as Error).message)}finally{setLoading(false)}
  }
  async function assign(){
    setSaving(true);onBusy(true);setError('');
    try{
      await source.reassign({client_id:entry.client.id,new_owner_id:target,expected_owner_id:entry.client.owner_id,expected_updated_at:entry.client.updated_at});
      await onAssigned();
    }catch(e){setError((e as Error).message)}finally{setSaving(false);onBusy(false)}
  }
  return <section className="crm-detail-section crm-form" aria-label="Reasignar cliente">
    <h3>Responsable comercial</h3><p>{entry.client.owner?.full_name||'Sin nombre'}</p>
    {!open?<Button variant="outline" disabled={disabled} onClick={()=>void show()}>Reasignar a otra persona</Button>:<>
      <label>Nuevo responsable<select value={target} disabled={loading||saving||disabled} onChange={e=>setTarget(e.target.value)}><option value="">Selecciona una persona</option>{members.filter(m=>m.id!==entry.client.owner_id).map(m=><option key={m.id} value={m.id}>{m.full_name||'Sin nombre'}</option>)}</select></label>
      <p className="crm-field-help">Se transferirá el cliente con todos sus proyectos, notas y tareas. Aparecerá en la cartera del nuevo responsable. Carol conservará acceso al seguimiento.</p>
      {loading&&<p role="status">Cargando equipo…</p>}
      {error&&<p role="alert" className="crm-error">{error}</p>}
      {!loading&&!members.length&&<Button variant="outline" onClick={()=>void show()} disabled={saving}>Volver a cargar equipo</Button>}
      <Button disabled={!target||loading||saving||disabled} onClick={()=>void assign()}>{saving?'Reasignando…':'Confirmar reasignación'}</Button>
      <Button variant="ghost" disabled={saving} onClick={()=>{setOpen(false);setTarget('');setError('')}}>Cancelar</Button>
    </>}
  </section>;
}
