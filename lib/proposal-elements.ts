import {z} from 'zod';
import type {CanvasPage,DrawOp} from './proposal-canvas';
import type {ProposalStyle} from './proposal-style';
import {measure,wrapProposal} from './proposal-typography';

const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const elementStyleSchema=z.object({
 color:color.optional(),background:color.optional(),font:z.enum(['sans','serif','mono']).optional(),
 size:z.number().min(6).max(64).optional(),bold:z.boolean().optional(),
 hidden:z.boolean().optional(),text:z.string().max(12000).optional(),thickness:z.number().min(.5).max(12).optional(),
 image:z.enum(['logo','roof']).optional(),
 widthScale:z.number().min(.6).max(1.2).optional(),heightScale:z.number().min(.6).max(1.5).optional(),
}).strict();
export const elementStylesSchema=z.record(z.string().regex(/^[a-zA-Z0-9:_-]+$/).max(100),elementStyleSchema).refine(v=>Object.keys(v).length<=250,'Demasiados elementos personalizados.');
export type ElementStyle=z.infer<typeof elementStyleSchema>;
export type CanvasElement={id:string;pageId:string;sourcePage:string;kind:'text'|'box'|'line'|'graphic'|'image';hidden?:boolean;thickness?:number;image?:'logo'|'roof'|'home';x:number;y:number;width:number;height:number;color:string;text?:string;font?:ProposalStyle['font'];size?:number;bold?:boolean};
export type ElementSelection={id:string;pageId:string};
export const elementKindLabels={text:'Texto',box:'Caja',line:'Línea',graphic:'Gráfico',image:'Imagen'};
export function elementDescription(element:CanvasElement){
 const names:Record<string,string>={'cover:client-rule':'Línea bajo el subtítulo','cover:bottom-rule':'Línea inferior de portada','cover:photo':'Fotografía de portada','cover:logo':'Logo de portada','cover:field':'Fondo de portada'};
 const field=element.id.split(':').at(-1)??'';
 return names[element.id]??element.text??({background:'Fondo de página','header-rule':'Separador de encabezado','footer-rule':'Separador de pie de página',rule:'Separador de sección',graphic:'Gráfico',icon:'Icono',bar:'Barra de pagos',segment:'Etapa de pago',marker:'Indicador'} as Record<string,string>)[field]??elementKindLabels[element.kind];
}

type TextOp=Extract<DrawOp,{kind:'text'}>;
const overlap=(a:CanvasElement,b:CanvasElement)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>2&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>2;

// Overrides address semantic fields, never array indexes or screen coordinates.
// Reflow happens once here so SVG and PDF receive exactly the same text runs.
export function applyElementStyles(page:CanvasPage,styles:Record<string,ElementStyle>):CanvasPage{
 const ops=page.ops.map(op=>({...op})),elements:CanvasElement[]=[],issues:string[]=[],changed=new Set<string>();
 const boxes=ops.filter((op):op is Extract<DrawOp,{kind:'rect'}>=>op.kind==='rect'&&!!op.elementId?.endsWith(':box'));
 for(const box of boxes){
  const id=box.elementId!,s=styles[id]??{},sx=s.widthScale??1,sy=s.heightScale??1;
  const prefix=id.slice(0,-3);
  // Resize the container and reposition its text while retaining individual font sizes.
  if(sx!==1||sy!==1){changed.add(id);for(const op of ops){
   if(op===box)continue;
   const inside=(x:number,y:number)=>x>=box.x&&x<=box.x+box.width&&y>=box.y&&y<=box.y+box.height;
   if(op.kind==='polygon'){if(op.points.every(p=>inside(p.x,p.y)))op.points=op.points.map(p=>({x:box.x+(p.x-box.x)*sx,y:box.y+(p.y-box.y)*sy}));continue;}
   if(!inside(op.x,op.y))continue;
   if(op.kind==='text'&&op.elementId&&!op.elementId.startsWith(prefix))continue;
   if(op.kind==='line'&&!inside(op.x2,op.y2))continue;
   if((op.kind==='rect'||op.kind==='image'||op.kind==='fade')&&!inside(op.x+op.width,op.y+op.height))continue;
   op.x=box.x+(op.x-box.x)*sx;op.y=box.y+(op.y-box.y)*sy;
   if(op.kind==='text'){if(op.fieldWidth)op.fieldWidth*=sx;if(op.elementId)changed.add(op.elementId);}
   if(op.kind==='rect'||op.kind==='image'||op.kind==='fade'){op.width*=sx;op.height*=sy;}
   if(op.kind==='circle')op.r*=Math.min(sx,sy);
   if(op.kind==='line'){op.x2=box.x+(op.x2-box.x)*sx;op.y2=box.y+(op.y2-box.y)*sy;}
  }}
  box.width*=sx;box.height*=sy;box.color=s.background??box.color;
  elements.push({id,pageId:page.id,sourcePage:page.sourcePage??page.id,kind:'box',x:box.x,y:box.y,width:box.width,height:box.height,color:box.color});
 }
 const graphics=new Map<string,DrawOp[]>();
 const graphicIds=new Set(ops.filter(op=>op.kind!=='text'&&op.elementId&&!op.elementId.endsWith(':box')).map(op=>op.elementId));
 for(const op of ops)if(op.elementId&&graphicIds.has(op.elementId)){
  const group=graphics.get(op.elementId)??[];group.push(op);graphics.set(op.elementId,group);
 }
 for(const [id,runs] of graphics){
  const s=styles[id]??{},first=runs[0];
  const bounds=runs.map(op=>{
   if(op.kind==='polygon'){const xs=op.points.map(p=>p.x),ys=op.points.map(p=>p.y);return {x:Math.min(...xs),y:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)};}
   if(op.kind==='circle')return {x:op.x-op.r,y:op.y-op.r,right:op.x+op.r,bottom:op.y+op.r};
   if(op.kind==='line')return {x:Math.min(op.x,op.x2),y:Math.min(op.y,op.y2),right:Math.max(op.x,op.x2),bottom:Math.max(op.y,op.y2)};
   return {x:op.x,y:op.kind==='text'?op.y-op.size:op.y,right:op.x+('width' in op?op.width:op.kind==='text'?measure(op.text,op.size,op.bold):0),bottom:op.y+('height' in op?op.height:0)};
  });
  const x=Math.min(...bounds.map(b=>b.x)),y=Math.min(...bounds.map(b=>b.y)),w=Math.max(...bounds.map(b=>b.right))-x,h=Math.max(...bounds.map(b=>b.bottom))-y;
  const sx=s.widthScale??1,sy=s.heightScale??1;
  if(sx!==1||sy!==1)changed.add(id);
  for(const op of runs){
   if(op.kind==='polygon')op.points=op.points.map(p=>({x:x+(p.x-x)*sx,y:y+(p.y-y)*sy}));
   else{op.x=x+(op.x-x)*sx;op.y=y+(op.y-y)*sy;}
   if(op.kind==='line'){op.x2=x+(op.x2-x)*sx;op.y2=y+(op.y2-y)*sy;if(s.thickness!==undefined)op.thickness=s.thickness;}
   if('width' in op){op.width*=sx;op.height*=sy;}
   if(op.kind==='circle')op.r*=Math.min(sx,sy);
   if(op.kind==='image'&&s.image)op.image=s.image;
   if('color' in op&&(runs.length===1||op.color!=='#ffffff'))op.color=s.color??s.background??op.color;
  }
  const paint=runs.find(op=>'color' in op&&/^#[0-9a-f]{6}$/i.test(op.color)&&op.color!=='#ffffff'&&op.kind!=='text')??first;
  const kind=runs.length===1&&first.kind==='line'?'line':first.kind==='image'?'image':'graphic';
  elements.push({id,pageId:page.id,sourcePage:page.sourcePage??page.id,kind,x,y,width:Math.max(1,w*sx),height:Math.max(1,h*sy),color:'color' in paint?paint.color:'#17695c',thickness:first.kind==='line'?first.thickness:undefined,image:first.kind==='image'?first.image:undefined});
 }
 const groups=new Map<string,TextOp[]>();
 for(const op of ops)if(op.kind==='text'&&op.elementId&&!graphicIds.has(op.elementId)){const group=groups.get(op.elementId)??[];group.push(op);groups.set(op.elementId,group);}
 const replacements=new Map<string,TextOp[]>();
 for(const [id,runs] of groups){
  const first=runs[0],s=styles[id]??{},font=s.font??page.font??'sans',size=s.size??first.size,bold=s.bold??first.bold,c=s.color??first.color;
  const source=s.text??first.source??runs.map(r=>r.text).join(' '),x=first.x,top=first.y-first.size;
  let result:TextOp[];
  if(s.text!==undefined||s.font!==undefined||s.size!==undefined||s.bold!==undefined||changed.has(id)){
   changed.add(id);
   const width=first.fieldWidth??Math.max(...runs.map(r=>measure(r.text,r.size,r.bold,page.font)));
   result=wrapProposal(source,size,Math.max(12,width),bold,font).map((text,i)=>({...first,text,x,y:top+size+i*size*1.4,size,bold,color:c,font,source:i===0?source:undefined}));
  }else result=runs.map(r=>({...r,color:c,font}));
  replacements.set(id,result);
  elements.push({id,pageId:page.id,sourcePage:page.sourcePage??page.id,kind:'text',x,y:top,width:Math.max(12,...result.map(r=>measure(r.text,size,bold,font))),height:result.at(-1)!.y+size*.25-top,color:c,text:source,font,size,bold});
 }
 const emitted=new Set<string>(),rendered:DrawOp[]=[];
 for(const op of ops){if(op.kind==='text'&&op.elementId&&!graphicIds.has(op.elementId)){if(!emitted.has(op.elementId)){rendered.push(...replacements.get(op.elementId)!);emitted.add(op.elementId);}}else rendered.push(op);}
 const hiddenBoxes=boxes.filter(b=>styles[b.elementId!]?.hidden).map(b=>b.elementId!.slice(0,-3));
 const hidden=(id:string)=>!!styles[id]?.hidden||hiddenBoxes.some(prefix=>id.startsWith(prefix));
 for(const e of elements)e.hidden=hidden(e.id);
 for(const e of elements){
  if(e.hidden||!changed.has(e.id))continue;
  const label=e.kind==='text'?`El texto «${(e.text??'').slice(0,38)}»`:elementDescription(e);
  if(e.x<0||e.y<0||e.x+e.width>842||e.y+e.height>(e.kind!=='text'&&e.kind!=='box'||e.id.includes(':footer-')||e.id.endsWith(':page-number')?595:551))issues.push(`${label} sale del área de la página. Reduce su tamaño.`);
  if(e.kind==='text'){
   const box=elements.find(b=>b.kind==='box'&&e.id.startsWith(b.id.slice(0,-3)));
   if(box&&(e.x<box.x||e.y<box.y||e.x+e.width>box.x+box.width+1||e.y+e.height>box.y+box.height+1))issues.push(`${label} no cabe en su caja. Reduce el texto o amplía la caja.`);
  }
  if((e.kind==='box'||e.kind==='text')&&elements.some(other=>!other.hidden&&other.id!==e.id&&other.kind===e.kind&&overlap(e,other)))issues.push(`${label} se superpone con otro elemento. Reduce su tamaño.`);
 }
 return {...page,ops:rendered.filter(op=>!op.elementId||!hidden(op.elementId)),elements,issues:[...new Set(issues)]};
}
