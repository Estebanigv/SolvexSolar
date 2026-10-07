import {z} from 'zod';
import type {CanvasPage,DrawOp} from './proposal-canvas';
import type {ProposalStyle} from './proposal-style';
import {measure,wrapProposal} from './proposal-typography';

const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const elementStyleSchema=z.object({
 color:color.optional(),background:color.optional(),font:z.enum(['sans','serif','mono']).optional(),
 size:z.number().min(6).max(64).optional(),bold:z.boolean().optional(),
 widthScale:z.number().min(.6).max(1.2).optional(),heightScale:z.number().min(.6).max(1.5).optional(),
}).strict();
export const elementStylesSchema=z.record(z.string().regex(/^[a-zA-Z0-9:_-]+$/).max(100),elementStyleSchema).refine(v=>Object.keys(v).length<=250,'Demasiados elementos personalizados.');
export type ElementStyle=z.infer<typeof elementStyleSchema>;
export type CanvasElement={id:string;pageId:string;sourcePage:string;kind:'text'|'box';x:number;y:number;width:number;height:number;color:string;text?:string;font?:ProposalStyle['font'];size?:number;bold?:boolean};
export type ElementSelection={id:string;pageId:string};
type TextOp=Extract<DrawOp,{kind:'text'}>;
const overlap=(a:CanvasElement,b:CanvasElement)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>2&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>2;

// Overrides address semantic fields, never array indexes or screen coordinates.
// Reflow happens once here so SVG and PDF receive exactly the same text runs.
export function applyElementStyles(page:CanvasPage,styles:Record<string,ElementStyle>):CanvasPage{
 const ops=page.ops.map(op=>({...op})),elements:CanvasElement[]=[],issues:string[]=[],changed=new Set<string>();
 const boxes=ops.filter((op):op is Extract<DrawOp,{kind:'rect'}>=>op.kind==='rect'&&!!op.elementId);
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
 const groups=new Map<string,TextOp[]>();
 for(const op of ops)if(op.kind==='text'&&op.elementId){const group=groups.get(op.elementId)??[];group.push(op);groups.set(op.elementId,group);}
 const replacements=new Map<string,TextOp[]>();
 for(const [id,runs] of groups){
  const first=runs[0],s=styles[id]??{},font=s.font??page.font??'sans',size=s.size??first.size,bold=s.bold??first.bold,c=s.color??first.color;
  const source=first.source??runs.map(r=>r.text).join(' '),x=first.x,top=first.y-first.size;
  let result:TextOp[];
  if(s.font!==undefined||s.size!==undefined||s.bold!==undefined||changed.has(id)){
   changed.add(id);
   const width=first.fieldWidth??Math.max(...runs.map(r=>measure(r.text,r.size,r.bold,page.font)));
   result=wrapProposal(source,size,Math.max(12,width),bold,font).map((text,i)=>({...first,text,x,y:top+size+i*size*1.4,size,bold,color:c,font,source:i===0?source:undefined}));
  }else result=runs.map(r=>({...r,color:c,font}));
  replacements.set(id,result);
  elements.push({id,pageId:page.id,sourcePage:page.sourcePage??page.id,kind:'text',x,y:top,width:Math.max(12,...result.map(r=>measure(r.text,size,bold,font))),height:result.at(-1)!.y+size*.25-top,color:c,text:source,font,size,bold});
 }
 const emitted=new Set<string>(),rendered:DrawOp[]=[];
 for(const op of ops){if(op.kind==='text'&&op.elementId){if(!emitted.has(op.elementId)){rendered.push(...replacements.get(op.elementId)!);emitted.add(op.elementId);}}else rendered.push(op);}
 for(const e of elements){
  if(!changed.has(e.id))continue;
  const label=e.kind==='box'?'La caja':`El texto «${(e.text??'').slice(0,38)}»`;
  if(e.x<0||e.y<0||e.x+e.width>842||e.y+e.height>551)issues.push(`${label} sale del área de la página. Reduce su tamaño.`);
  if(e.kind==='text'){
   const box=elements.find(b=>b.kind==='box'&&e.id.startsWith(b.id.slice(0,-3)));
   if(box&&(e.x<box.x||e.y<box.y||e.x+e.width>box.x+box.width+1||e.y+e.height>box.y+box.height+1))issues.push(`${label} no cabe en su caja. Reduce el texto o amplía la caja.`);
  }
  if(elements.some(other=>other.id!==e.id&&other.kind===e.kind&&overlap(e,other)))issues.push(`${label} se superpone con otro elemento. Reduce su tamaño.`);
 }
 return {...page,ops:rendered,elements,issues:[...new Set(issues)]};
}
