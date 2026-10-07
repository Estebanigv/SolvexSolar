'use client';
import type {ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import type {CanvasElement,ElementStyle} from '@/lib/proposal-elements';

export function ProposalElementEditor({element,value,label,content,readOnly,maxLength,onText,onStyle,onReset,onClose,onSelectField,availableFields,children}:{
 element:CanvasElement|null;value:ElementStyle;label:string;content?:string;readOnly:boolean;maxLength:number;
 availableFields:string[];onText:(value:string)=>void;onStyle:(patch:Partial<ElementStyle>)=>void;onReset:()=>void;onClose:()=>void;onSelectField:(field:string)=>void;children?:ReactNode;
}){
 if(!element)return <section className="proposal-element-editor"><strong>Edita directamente en la propuesta</strong><p>Pincha un texto para cambiar solo ese texto. Pincha el fondo de una caja para cambiar su color y sus dimensiones.</p></section>;
 const base=element.id.slice(0,element.id.lastIndexOf(':'));
 return <section className="proposal-element-editor" aria-label="Elemento seleccionado">
  <div className="proposal-element-heading"><strong>{label}</strong><Button type="button" variant="outline" onClick={onClose} aria-label="Deseleccionar elemento">×</Button></div>
  <p>Los cambios de aquí afectan solo a este {element.kind==='box'?'bloque':'texto'}.</p>
  {element.kind==='text'?<>
   <label>Contenido<Textarea value={content??element.text??''} readOnly={readOnly} maxLength={maxLength} rows={3} onChange={event=>onText(event.target.value)}/></label>
   {children}
   <label>Tipografía de este texto<select value={element.font} onChange={event=>onStyle({font:event.target.value as ElementStyle['font']})}><option value="sans">Arial / Helvetica</option><option value="serif">Times</option><option value="mono">Courier</option></select></label>
   <label>Tamaño · {Number(element.size?.toFixed(1))} pt<input type="range" min={6} max={64} step={.5} value={element.size} onChange={event=>onStyle({size:Number(event.target.value)})}/></label>
   <label>Color de este texto<input type="color" value={element.color} onChange={event=>onStyle({color:event.target.value})}/></label>
   <label className="proposal-visibility"><input type="checkbox" checked={element.bold} onChange={event=>onStyle({bold:event.target.checked})}/>Negrita</label>
   {availableFields.includes(`${base}:box`)&&<Button type="button" variant="outline" onClick={()=>onSelectField(`${base}:box`)}>Seleccionar la caja de este texto</Button>}
  </>:<>
   <label>Color de la caja<input type="color" value={element.color} onChange={event=>onStyle({background:event.target.value})}/></label>
   <label>Ancho · {Math.round((value.widthScale??1)*100)}%<input type="range" min={60} max={120} step={1} value={(value.widthScale??1)*100} onChange={event=>onStyle({widthScale:Number(event.target.value)/100})}/></label>
   <label>Alto · {Math.round((value.heightScale??1)*100)}%<input type="range" min={60} max={150} step={1} value={(value.heightScale??1)*100} onChange={event=>onStyle({heightScale:Number(event.target.value)/100})}/></label>
   <p>El tamaño del texto se ajusta por separado. Revisa que todo quede dentro de la caja.</p>
   <div className="proposal-editor-buttons">{['title','value','body'].map((field,i)=>availableFields.includes(`${base}:${field}`)&&<Button key={field} type="button" variant="outline" onClick={()=>onSelectField(`${base}:${field}`)}>{['Editar título','Editar valor','Editar descripción'][i]}</Button>)}</div>
  </>}
  <div className="proposal-editor-buttons"><Button type="button" variant="outline" onClick={onReset}>Restaurar estilo de este elemento</Button></div>
 </section>;
}
