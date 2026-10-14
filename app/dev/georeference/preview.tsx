"use client";
import {useState} from 'react';
import {ProjectLocation} from '../../project-location';
import {Button} from '@/components/ui/button';
import type {LocationCandidate} from '@/lib/geocoding';

export default function Preview(){
 const [request,setRequest]=useState(0),[pending,setPending]=useState(false),[calls,setCalls]=useState(0);
 const [mode,setMode]=useState('exacta');
 const [point,setPoint]=useState<{latitude:number|null;longitude:number|null}>({latitude:null,longitude:null});
 const [address,setAddress]=useState('Calle de ejemplo 100 DP 11');
 function importBill(next:string){setMode(next);setPoint({latitude:null,longitude:null});setRequest(n=>n+1);setPending(true)}
 return <main className="qh-preview">
  <div className="qh-preview-note">Prueba local con datos ficticios. No consulta servicios externos.</div>
  <h1>Georreferencia automática al leer la boleta</h1>
  <div>{['exacta','aproximada','múltiples','vacía','error','lenta'].map(value=><Button key={value} onClick={()=>importBill(value)}>Boleta {value}</Button>)}</div>
  <Button onClick={()=>{setAddress('Otra calle 200');setPoint({latitude:null,longitude:null});setPending(false)}}>Cambiar dirección</Button>
  <p>Consultas: {calls}</p>
  <ProjectLocation key={request} address={{address,commune:'Santiago',region:'Metropolitana de Santiago'}} latitude={point.latitude} longitude={point.longitude}
   autoSearch={pending} onAutoSearchComplete={()=>setPending(false)} onChange={setPoint}
   lookup={async query=>{
    setCalls(n=>n+1);
    await new Promise(resolve=>setTimeout(resolve,mode==='lenta'?8000:350));
    if(mode==='error')throw Error('Error simulado. Vuelve a intentarlo.');
    if(mode==='vacía')return [];
    const candidate:LocationCandidate={latitude:-33.4489,longitude:-70.6693,label:query.address+' (resultado simulado)',approximate:mode==='aproximada'};
    return mode==='múltiples'?[candidate,{...candidate,latitude:-33.449,label:'Otra coincidencia simulada'}]:[candidate];
   }}/>
 </main>
}
