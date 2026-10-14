"use client";
import {useId} from 'react';
import {Input} from '@/components/ui/input';
import {electricityDistributors} from '@/lib/electricity-distributors';

export function DistributorInput({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const id=useId();
 return <label>Distribuidora
  <Input aria-label="Distribuidora" aria-describedby={id+'-help'} list={id} maxLength={120} value={value} placeholder="Selecciona o escribe la empresa de la boleta" onChange={e=>onChange(e.target.value)}/>
  <datalist id={id}>{electricityDistributors.map(provider=><option key={provider.name} value={provider.name}/>)}</datalist>
  <small id={id+'-help'}>Acepta distribuidoras y cooperativas de todo Chile. Si no aparece, escribe su nombre.</small>
 </label>;
}
