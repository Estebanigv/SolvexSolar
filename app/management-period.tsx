"use client";

import {useId,useState} from 'react';
import {CalendarDays,ChevronDown,ChevronLeft,ChevronRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {chileDate,shiftMonth} from '@/lib/quote-history';

const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function ManagementPeriod({value,onChange}:{value:string;onChange:(month:string)=>void}){
 const [open,setOpen]=useState(false);
 const [year,setYear]=useState(value.slice(0,4));
 const yearId=useId();
 const titleId=useId();
 const label=months[Number(value.slice(5))-1]+' '+value.slice(0,4);
 const currentMonth=chileDate().slice(0,7);
 function choose(month:string){onChange(month);setOpen(false)}
 return <div className="management-period" role="group" aria-label="Período del resumen">
  <Popover open={open} onOpenChange={next=>{if(next)setYear(value.slice(0,4));setOpen(next)}}>
   <h2><PopoverTrigger asChild><Button type="button" variant="ghost" className="management-period-trigger" aria-label={'Seleccionar período: '+label}><span>{months[Number(value.slice(5))-1]} <span className="management-period-selected-year">{value.slice(0,4)}</span></span><ChevronDown className="management-period-chevron"/></Button></PopoverTrigger></h2>
   <PopoverContent className="management-period-popover" align="center" sideOffset={12} collisionPadding={16} aria-labelledby={titleId}>
    <div className="management-period-popover-header"><div><span id={titleId}>Seleccionar período</span><p>Consulta la actividad por mes.</p></div><CalendarDays aria-hidden="true"/></div>
    <div className="management-period-year"><label htmlFor={yearId}>Año</label><select id={yearId} value={year} onChange={event=>setYear(event.target.value)}>{Array.from({length:80},(_,i)=>2020+i).map(y=><option key={y}>{y}</option>)}</select></div>
    <div className="management-period-months" role="group" aria-label={'Meses de '+year}>{months.map((name,index)=>{const candidate=year+'-'+String(index+1).padStart(2,'0');return <button type="button" key={name} aria-label={name+' '+year} aria-pressed={candidate===value} data-current={candidate===currentMonth} onClick={()=>choose(candidate)}>{name}</button>})}</div>
    <button type="button" className="management-period-today" onClick={()=>choose(currentMonth)}>Ir al mes actual<ChevronRight size={16}/></button>
   </PopoverContent>
  </Popover>
  <div className="management-period-navigation"><Button type="button" variant="ghost" className="management-period-arrow" aria-label="Mes anterior" disabled={value<='2020-01'} onClick={()=>onChange(shiftMonth(value,-1))}><ChevronLeft/></Button>
  <Button type="button" variant="ghost" className="management-period-arrow" aria-label="Mes siguiente" disabled={value>='2099-12'} onClick={()=>onChange(shiftMonth(value,1))}><ChevronRight/></Button></div>
 </div>;
}
