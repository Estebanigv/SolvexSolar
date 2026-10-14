import type {SavedQuote} from './quote';
import type {CanvasPage,DrawOp} from './proposal-canvas';
import {issuedWarnings,documentFolio} from './quote-issuance';
import {wrapProposal,printableText} from './proposal-typography';
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
