import {useId} from 'react';
import type {SavedQuote} from '@/lib/quote';
import {proposalCanvases,canvasSize,type CanvasPage} from '@/lib/proposal-canvas';
import type {ElementSelection} from '@/lib/proposal-elements';
import {proposalFonts} from '@/lib/proposal-style';
import {proposalImages} from '@/lib/proposal-document';
import './atlas-proposal.css';

export function AtlasProposal({q,canvases,selection,onSelect}:{q:SavedQuote;canvases?:CanvasPage[];selection?:ElementSelection|null;onSelect?:(value:ElementSelection)=>void}){
 const prefix=useId().replace(/:/g,'');
 return <article className="atlas-proposal" aria-label="Cotización horizontal de Solvex Solar">{(canvases??proposalCanvases(q)).map((page,index)=><section className="atlas-sheet" key={page.id} aria-label={`Página ${index+1}: ${page.title}`}><svg viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`} xmlns="http://www.w3.org/2000/svg" role={onSelect?"group":"img"} aria-label={`Página ${index+1}: ${page.title}`}>
  {page.ops.map((op,i)=>{
   if(op.kind==='fade'){const id=`${prefix}-${index}-${i}-fade`;return <g key={i}><defs><linearGradient id={id} x1="0%" y1="0%" x2={op.direction==='horizontal'?'100%':'0%'} y2={op.direction==='vertical'?'100%':'0%'}><stop offset="0%" stopColor={op.color} stopOpacity={op.from}/><stop offset="100%" stopColor={op.color} stopOpacity={op.to}/></linearGradient></defs><rect x={op.x} y={op.y} width={op.width} height={op.height} fill={`url(#${id})`}/></g>;}
   if(op.kind==='text')return <text key={i} x={op.x} y={op.y} fill={op.color} fontSize={op.size} fontWeight={op.bold?700:400} fontFamily={proposalFonts[op.font??page.font??'sans']}>{op.text}</text>;
   if(op.kind==='rect')return <rect key={i} x={op.x} y={op.y} width={op.width} height={op.height} fill={op.color} stroke={op.stroke} strokeWidth={op.stroke?1:0} opacity={op.opacity??1}/>;
   if(op.kind==='line')return <line key={i} x1={op.x} y1={op.y} x2={op.x2} y2={op.y2} stroke={op.color} strokeWidth={op.thickness} strokeDasharray={op.dash?.join(' ')}/>;
   if(op.kind==='circle')return <circle key={i} cx={op.x} cy={op.y} r={op.r} fill={op.color} stroke={op.stroke} strokeWidth={op.stroke?1:0}/>;
   if(op.kind==='polygon')return <polygon key={i} points={op.points.map(p=>`${p.x},${p.y}`).join(' ')} fill={op.color} stroke={op.stroke} strokeWidth={op.stroke?op.thickness??1:0}/>;
   const id=`${prefix}-${index}-${i}`;
   return <g key={i}><defs><clipPath id={id}><rect x={op.x} y={op.y} width={op.width} height={op.height}/></clipPath></defs><image href={proposalImages[op.image]} x={op.x} y={op.y} width={op.width} height={op.height} preserveAspectRatio={op.fit==='cover'?'xMidYMid slice':'xMidYMid meet'} clipPath={`url(#${id})`}/></g>;
  })}
 {onSelect&&page.elements?.map(element=>{const active=selection?.id===element.id&&selection.pageId===page.id;return <g key={element.id} role="button" tabIndex={0} aria-label={`${element.kind==='box'?'Editar caja':'Editar texto'}: ${(element.text??page.elements?.find(e=>e.id===element.id.replace(/:box$/,':title'))?.text??element.id.split(':')[0]).slice(0,100)}`} aria-pressed={active} className={`proposal-selectable ${active?'is-selected':''}`} onClick={()=>onSelect({id:element.id,pageId:page.id})} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect({id:element.id,pageId:page.id});}}}><rect x={element.x-2} y={element.y-2} width={element.width+4} height={Math.max(element.height+4,14)} rx={2} vectorEffect="non-scaling-stroke"/></g>;})}
 </svg></section>)}</article>;
}
