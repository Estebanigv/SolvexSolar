'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {calculate,quoteSchema,type SavedQuote,type QuoteInput,type Product,type Settings,type InstallationRates} from '@/lib/quote';
import {newProposalContent,type ProposalContent} from '@/lib/proposal-content';
import {proposalLayout} from '@/lib/proposal-layout';
import {proposalCanvases} from '@/lib/proposal-canvas';
import {AtlasProposal} from './atlas-proposal';
import {DiscountField} from './discount-field';
import {FinalQuoteTotal} from './final-quote-total';
import {ProjectionPanel} from './projection-panel';
import './proposal-editor.css';

export function ProposalEditor({q,products,settings,rates,busy,onSave,onCancel}:{q:SavedQuote;products:Product[];settings:Settings;rates:InstallationRates;busy:boolean;onSave:(input:QuoteInput)=>Promise<boolean>;onCancel:()=>void}){
 const [input,setInput]=useState<QuoteInput>(()=>({...q.input,proposalContent:q.input.proposalContent??newProposalContent()}));
 const [selected,setSelected]=useState('cover');
 const [error,setError]=useState('');
 const [dirty,setDirty]=useState(false);
 const content=input.proposalContent!;
 let working:SavedQuote|null=null;
 try{working={...q,id:'draft',folio:'BORRADOR-SVX',issuedAt:undefined,issuedBy:undefined,input,settings,calculation:calculate(input,products,settings,rates)};}catch{/* Keep controls available while a partial value is being corrected. */}
 const update=(patch:Partial<QuoteInput>)=>{setInput(previous=>({...previous,...patch,technicalReviewed:patch.technicalReviewed??false}));setDirty(true);setError('');};
 const editContent=(patch:Partial<ProposalContent>)=>update({proposalContent:{...content,...patch}});
 const editText=(key:string,value:string)=>editContent({text:{...content.text,[key]:value}});
 const toggle=(id:string)=>editContent({hidden:content.hidden.includes(id)?content.hidden.filter(item=>item!==id):[...content.hidden,id]});
 const pages=working?proposalLayout(working,true):proposalLayout({...q,input:{...q.input,proposalContent:content}},true);
 const page=pages.find(p=>p.id===selected)??pages[0];
 const move=(direction:number)=>{const order=pages.map(p=>p.id),at=order.indexOf(page.id),target=at+direction;if(target<0||target>=order.length)return;[order[at],order[target]]=[order[target],order[at]];editContent({order});};
 const add=(pageId?:string)=>{if(content.sections.length>=20){setError('Puedes agregar hasta 20 bloques o páginas.');return;}const id=crypto.randomUUID();editContent({sections:[...content.sections,{id,pageId,title:'Información adicional',body:'Escribe aquí el contenido de tu propuesta.'}]});if(!pageId)setSelected(`custom-${id}`);};
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 async function save(){
  const parsed=quoteSchema.safeParse(input);
  if(!parsed.success){setError(parsed.error.issues[0]?.message??'Revisa los datos antes de guardar.');return;}
  if(!working){setError('Revisa los montos y los porcentajes: los pagos deben sumar 100%.');return;}
  if(!proposalCanvases(working).length){setError('Deja al menos una página visible antes de guardar.');return;}
  if(await onSave(parsed.data))setDirty(false);
 }
 return <div className="proposal-editor">
  <div className="proposal-editor-toolbar"><div><strong>Editar propuesta</strong><p>Los cambios se guardan como una nueva versión. El PDF conserva este diseño.</p></div><Button disabled={busy} variant="outline" onClick={()=>{if(!dirty||window.confirm('¿Descartar los cambios de esta edición?'))onCancel();}}>Cancelar</Button><Button disabled={busy} onClick={()=>void save()}>{busy?'Guardando…':'Guardar propuesta'}</Button></div>
  {error&&<p className="proposal-editor-error" role="alert">{error}</p>}
  <div className="proposal-editor-workspace"><aside className="proposal-editor-tools" aria-label="Contenido de la propuesta"><fieldset disabled={busy}>
   <label>Página<select value={page.id} onChange={e=>setSelected(e.target.value)}>{pages.map((p,i)=><option key={p.id} value={p.id}>{i+1}. {p.title||'Sin título'}{content.hidden.includes(p.id)?' (oculta)':''}</option>)}</select></label>
   <div className="proposal-editor-buttons"><Button type="button" variant="outline" onClick={()=>move(-1)} disabled={pages[0].id===page.id}>Subir página</Button><Button type="button" variant="outline" onClick={()=>move(1)} disabled={pages.at(-1)?.id===page.id}>Bajar página</Button></div>
   <label className="proposal-visibility"><input type="checkbox" checked={!content.hidden.includes(page.id)} onChange={()=>toggle(page.id)}/>Mostrar esta página</label>
   <label>Título de la página<Textarea value={page.title} maxLength={200} onChange={e=>editText(`${page.id}:title`,e.target.value)}/></label>
   <label>Subtítulo<Textarea value={page.subtitle} maxLength={500} onChange={e=>editText(`${page.id}:subtitle`,e.target.value)}/></label>
   {page.blocks.map(block=><details key={block.id} className="proposal-edit-block"><summary>{block.title||'Texto'}{content.hidden.includes(block.id)?' · oculto':''}</summary><label className="proposal-visibility"><input type="checkbox" checked={!content.hidden.includes(block.id)} onChange={()=>toggle(block.id)}/>Mostrar bloque</label><label>Título<Input value={block.title} maxLength={200} onChange={e=>editText(`${block.id}:title`,e.target.value)}/></label>{block.value!==undefined&&<label>Valor o descripción<Input value={block.value} readOnly={!!block.binding} maxLength={1000} onChange={e=>editText(`${block.id}:value`,e.target.value)}/>{block.binding&&<small>Se actualiza desde {(block.binding==='total'||block.binding==='discount')?'Total y pagos':block.binding==='payment'?'las etapas de pago':'Ahorro y gráficos'}, más abajo.</small>}</label>}<label>Contenido<Textarea rows={5} maxLength={12000} value={block.body} readOnly={!!block.binding} onChange={e=>editText(`${block.id}:body`,e.target.value)}/></label>{Object.keys(content.text).some(key=>key.startsWith(`${block.id}:`))&&<Button variant="outline" onClick={()=>editContent({text:Object.fromEntries(Object.entries(content.text).filter(([key])=>!key.startsWith(`${block.id}:`)))})}>Restaurar contenido original</Button>}</details>)}
   <div className="proposal-editor-buttons"><Button variant="outline" onClick={()=>add(page.id)}>Agregar texto aquí</Button><Button variant="outline" onClick={()=>add()}>Agregar página</Button></div>
   <details className="proposal-edit-block"><summary>Total y pagos</summary>{working&&<FinalQuoteTotal quote={input} calculation={working.calculation} onChange={update}/>}
    <DiscountField quote={input} onChange={update}/><label>Forma de pago<Input value={input.payment} onChange={e=>update({payment:e.target.value})}/></label>
    {(input.documentPaymentSchedule??settings.paymentSchedule??[]).map((row,i,all)=><div className="proposal-payment-edit" key={i}><label>Etapa {i+1}<Input value={row.label} maxLength={80} onChange={e=>update({documentPaymentSchedule:all.map((r,j)=>j===i?{...r,label:e.target.value}:r)})}/></label><label>Porcentaje<Input type="number" min={0} max={100} step={1} value={row.percent} onChange={e=>update({documentPaymentSchedule:all.map((r,j)=>j===i?{...r,percent:Number(e.target.value)}:r)})}/></label><Button variant="outline" onClick={()=>update({documentPaymentSchedule:all.filter((_,j)=>j!==i)})}>Quitar etapa</Button></div>)}
    <Button variant="outline" disabled={(input.documentPaymentSchedule??settings.paymentSchedule??[]).length>=10} onClick={()=>update({documentPaymentSchedule:[...(input.documentPaymentSchedule??settings.paymentSchedule??[]),{label:'Nueva etapa',percent:0}]})}>Agregar etapa de pago</Button><p>Los porcentajes deben sumar 100%. Los montos se recalculan con el total final, en pesos chilenos.</p>
   </details>
   <details className="proposal-edit-block"><summary>Ahorro y gráficos</summary>{working&&<ProjectionPanel q={working} onChange={projection=>update({projection})}/>}</details>
   {input.proposalType!=='preliminary'&&<label className="proposal-visibility"><input type="checkbox" checked={input.technicalReviewed} onChange={e=>update({technicalReviewed:e.target.checked})}/>El comercial y el instalador revisaron modelos, compatibilidad, estructura y alcance de esta versión tras la visita técnica.</label>}
   <p>Para retirar contenido de la salida, desmarca Mostrar. Puedes volver a incorporarlo durante esta edición o al abrirla después.</p>
  </fieldset></aside><div className="proposal-editor-preview" aria-label="Vista previa actualizada">{working?<AtlasProposal q={working}/>:<p role="alert">Revisa los valores de la edición para actualizar la vista previa.</p>}</div></div>
 </div>;
}
