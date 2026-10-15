import type {SavedQuote} from './quote';
import type {CanvasPage,DrawOp} from './proposal-canvas';
import {issuedWarnings,documentFolio} from './quote-issuance';
import {wrapProposal,printableText} from './proposal-typography';
// Place short notices in existing free space, after styles, without changing the
// issued snapshot or exposing the disclosure to the document editor.
export function appendIssuanceWarning(q:SavedQuote,page:CanvasPage|undefined):boolean{
 const warnings=issuedWarnings(q);if(!warnings.length||!page||page.id==='cover')return false;
 const rows=warnings.flatMap((warning,index)=>wrapProposal(`${index+1}. ${warning}`,10.5,738,false,'sans'));
 const height=44+rows.length*15;
 const bottom=(op:DrawOp):number=>{
  if(op.elementId?.includes(':footer-')||op.elementId?.endsWith(':page-number'))return 0;
  if(op.kind==='rect'&&op.x===0&&op.y===0&&op.width===842&&op.height===595)return 0;
  if(op.kind==='polygon')return Math.max(...op.points.map(p=>p.y));
  if(op.kind==='line')return Math.max(op.y,op.y2)+op.thickness/2;
  if(op.kind==='circle')return op.y+op.r;
  if(op.kind==='text')return op.y+op.size*.25;
  return op.y+op.height;
 };
 const top=Math.max(110,...page.ops.map(bottom))+18;
 if(top+height>535)return false;
 page.ops.push({kind:'rect',x:36,y:top,width:770,height,color:'#fff4d9'},
  {kind:'text',x:52,y:top+20,text:'Información pendiente al emitir',size:12,bold:true,font:'sans',color:'#574621'});
 rows.forEach((text,i)=>page.ops.push({kind:'text',x:52,y:top+40+i*15,text,size:10.5,bold:false,font:'sans',color:'#574621'}));
 return true;
}
// Mandatory disclosure is rendered after editable styles, so it cannot be hidden.
export function issuanceWarningCanvases(q:SavedQuote):CanvasPage[]{
 const warnings=issuedWarnings(q);if(!warnings.length)return [];
 const pages:CanvasPage[]=[];let ops:DrawOp[]=[],y=0;
 const text=(value:string,x:number,top:number,size=11,bold=false)=>ops.push({kind:'text',text:printableText(value),x,y:top,size,bold,font:'sans',color:'#574621'});
 const start=()=>{ops=[{kind:'rect',x:0,y:0,width:842,height:595,color:'#ffffff'}];pages.push({id:'issuance-notice-'+pages.length,title:'Información pendiente',ops,font:'sans'});text(q.settings.name,36,32,12,true);text(documentFolio(q),640,32,10);ops.push({kind:'rect',x:36,y:56,width:770,height:64,color:'#fff4d9'});text('Cotización emitida con información pendiente',52,82,19,true);text('Sujeta a completar y validar los antecedentes indicados a continuación.',52,105,11);y=146;};
 start();
 warnings.forEach((warning,index)=>{const rows=wrapProposal(`${index+1}. ${warning}`,11,746,false,'sans');for(const row of rows){if(y>520)start();text(row,48,y);y+=16;}y+=10;});
 for(const [i,page] of pages.entries())page.ops.push({kind:'text',text:`Observaciones de emisión · ${i+1} / ${pages.length}`,x:36,y:575,size:9,bold:false,font:'sans',color:'#665b47'});
 return pages;
}
