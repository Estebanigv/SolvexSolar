import {useId} from 'react';
import type {SavedQuote} from '@/lib/quote';
import {proposalCanvases,canvasSize} from '@/lib/proposal-canvas';
import {proposalImages} from '@/lib/proposal-document';
import './atlas-proposal.css';

export function AtlasProposal({q}:{q:SavedQuote}){
 const prefix=useId().replace(/:/g,'');
 return <article className="atlas-proposal" aria-label="Cotización horizontal de Solvex Solar">{proposalCanvases(q).map((page,index)=><section className="atlas-sheet" key={page.id} aria-label={`Página ${index+1}: ${page.title}`}><svg viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Página ${index+1}: ${page.title}`}>
  {page.ops.map((op,i)=>{
   if(op.kind==='text')return <text key={i} x={op.x} y={op.y} fill={op.color} fontSize={op.size} fontWeight={op.bold?700:400} fontFamily="Arial, Helvetica, sans-serif">{op.text}</text>;
   if(op.kind==='rect')return <rect key={i} x={op.x} y={op.y} width={op.width} height={op.height} fill={op.color} opacity={op.opacity??1}/>;
   const id=`${prefix}-${index}-${i}`;
   return <g key={i}><defs><clipPath id={id}><rect x={op.x} y={op.y} width={op.width} height={op.height}/></clipPath></defs><image href={proposalImages[op.image]} x={op.x} y={op.y} width={op.width} height={op.height} preserveAspectRatio={op.fit==='cover'?'xMidYMid slice':'xMidYMid meet'} clipPath={`url(#${id})`}/></g>;
  })}
 </svg></section>)}</article>;
}
