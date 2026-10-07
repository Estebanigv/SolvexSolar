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
   if(op.kind==='rect')return <rect key={i} x={op.x} y={op.y} width={op.width} height={op.height} fill={op.color} stroke={op.stroke} strokeWidth={op.stroke?1:0} opacity={op.opacity??1}/>;
   if(op.kind==='line')return <line key={i} x1={op.x} y1={op.y} x2={op.x2} y2={op.y2} stroke={op.color} strokeWidth={op.thickness} strokeDasharray={op.dash?.join(' ')}/>;
   if(op.kind==='circle')return <circle key={i} cx={op.x} cy={op.y} r={op.r} fill={op.color} stroke={op.stroke} strokeWidth={op.stroke?1:0}/>;
   if(op.kind==='polygon')return <polygon key={i} points={op.points.map(p=>`${p.x},${p.y}`).join(' ')} fill={op.color} stroke={op.stroke} strokeWidth={op.stroke?op.thickness??1:0}/>;
   const id=`${prefix}-${index}-${i}`;
   return <g key={i}><defs><clipPath id={id}><rect x={op.x} y={op.y} width={op.width} height={op.height}/></clipPath></defs><image href={proposalImages[op.image]} x={op.x} y={op.y} width={op.width} height={op.height} preserveAspectRatio={op.fit==='cover'?'xMidYMid slice':'xMidYMid meet'} clipPath={`url(#${id})`}/></g>;
  })}
 </svg></section>)}</article>;
}
