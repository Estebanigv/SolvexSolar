'use client';
import type {CrmEntry} from '@/lib/crm';
import {matchesSmartView,smartViews,type SmartView} from '@/lib/crm-views';

export function CrmSmartViews({entries,value,today,onChange}:{entries:CrmEntry[];value:SmartView;today:string;onChange:(view:SmartView)=>void}){
 return <div className="crm-smart-views" role="group" aria-label="Vistas de seguimiento">
  {Object.entries(smartViews).map(([id,label])=><button key={id} type="button" aria-pressed={value===id} onClick={()=>onChange(id as SmartView)}><span>{label}</span><strong>{entries.filter(e=>matchesSmartView(e,id as SmartView,today)).length}</strong></button>)}
 </div>;
}
