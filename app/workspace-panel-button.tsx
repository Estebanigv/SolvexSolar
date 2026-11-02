'use client';
import {ArrowLeft,Kanban} from 'lucide-react';
import {Button} from '@/components/ui/button';

export function WorkspacePanelButton({panel,onChange}:{panel:string;onChange:(panel:string)=>void}){
  return panel==='crm'
    ?<Button variant="outline" className="workspace-panel-button" onClick={()=>onChange('quote')}><ArrowLeft size={17}/>Volver al cotizador</Button>
    :<Button className="workspace-panel-button" onClick={()=>onChange('crm')}><Kanban size={17}/>CRM comercial</Button>;
}
