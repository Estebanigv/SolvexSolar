'use client';
import {useMemo} from 'react';
import {Members,type TeamSource,type TeamMember} from '../../members';
import {Toaster} from 'sonner';
export default function TeamPreview(){
  const source=useMemo<TeamSource>(()=>{
    let rows:TeamMember[]=[{id:'dev',full_name:'Dev',email:'dev@example.com',role:'admin',created_at:'2026-09-26T12:00:00Z'},...['Carol Ibaceta Durán','Daniel Bernal Yáñez','Marcelo González Muñoz','Nidia Alonso Catalán'].map((name,i)=>({id:'example-'+i,full_name:name,email:['carol','daniel','marcelo','nidia'][i]+'@example.com',role:'admin' as const,created_at:'2026-09-28T12:00:00Z'}))];
    return {setColor:async color=>{rows=rows.map(m=>m.id==='dev'?{...m,identification_color:color}:m);return color;},load:async()=>rows.map(m=>({...m})),setRole:async(id,role)=>{if(id==='dev')throw Error('Tu propio acceso está protegido.');rows=rows.map(m=>m.id===id?{...m,role}:m);}};
  },[]);
  return <main className="qh-preview"><Toaster/><div className="qh-preview-note"><strong>Revisión local · usuarios de ejemplo</strong><span>Todos son administradores. Los cambios solo afectan esta demostración.</span></div><header><p>Solvex Solar / Gestión comercial</p><h1>Usuarios del equipo</h1></header><Members preview currentId="dev" dataSource={source}/></main>;
}
