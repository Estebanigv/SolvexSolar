import {PDFDocument,StandardFonts,rgb,pushGraphicsState,popGraphicsState,rectangle,clip,endPath,setGraphicsState} from 'pdf-lib';
import {proposalCanvases,canvasSize} from './proposal-canvas';
import {resolveProposalStyle} from './proposal-style';
import type {SavedQuote} from './quote';

export async function atlasPdf(q:SavedQuote,logoBytes?:ArrayBuffer,photos:{roof?:ArrayBuffer}={}){
 const pdf=await PDFDocument.create();pdf.setTitle(`${q.folio} - ${q.settings.name}`);pdf.setAuthor(q.settings.name);
 const family=resolveProposalStyle(q.input.proposalContent?.style).font;
 const regular=await pdf.embedFont(family==='serif'?StandardFonts.TimesRoman:family==='mono'?StandardFonts.Courier:StandardFonts.Helvetica),bold=await pdf.embedFont(family==='serif'?StandardFonts.TimesRomanBold:family==='mono'?StandardFonts.CourierBold:StandardFonts.HelveticaBold);
 const isPng=logoBytes&&new Uint8Array(logoBytes)[0]===137;
 const images={logo:logoBytes?await (isPng?pdf.embedPng(logoBytes):pdf.embedJpg(logoBytes)):null,roof:photos.roof?await pdf.embedJpg(photos.roof):null,home:null};
 const color=(hex:string)=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
 for(const canvas of proposalCanvases(q)){
  const page=pdf.addPage([canvasSize.width,canvasSize.height]);
  for(const op of canvas.ops){
   if(op.kind==='fade'){
    // A native luminosity mask avoids banding and keeps the PDF gradient vector-based.
    const bottom=canvasSize.height-op.y-op.height,context=pdf.context;
    const shading=context.register(context.obj({ShadingType:2,ColorSpace:'DeviceGray',Coords:op.direction==='horizontal'?[op.x,bottom,op.x+op.width,bottom]:[op.x,bottom+op.height,op.x,bottom],Function:{FunctionType:2,Domain:[0,1],C0:[op.from],C1:[op.to],N:1},Extend:[true,true]}));
    const mask=context.register(context.flateStream('/Fade sh',{Type:'XObject',Subtype:'Form',BBox:[0,0,canvasSize.width,canvasSize.height],Group:{S:'Transparency',CS:'DeviceGray'},Resources:{Shading:{Fade:shading}}}));
    const state=context.register(context.obj({Type:'ExtGState',SMask:{S:'Luminosity',G:mask}}));
    const key=page.node.newExtGState('CoverFade',state);
    page.pushOperators(pushGraphicsState(),setGraphicsState(key));
    page.drawRectangle({x:op.x,y:bottom,width:op.width,height:op.height,color:color(op.color)});
    page.pushOperators(popGraphicsState());continue;
   }
   if(op.kind==='text'){page.drawText(op.text,{x:op.x,y:canvasSize.height-op.y,size:op.size,font:op.bold?bold:regular,color:color(op.color)});continue;}
   if(op.kind==='rect'){page.drawRectangle({x:op.x,y:canvasSize.height-op.y-op.height,width:op.width,height:op.height,color:color(op.color),borderColor:op.stroke?color(op.stroke):undefined,borderWidth:op.stroke?1:0,opacity:op.opacity??1});continue;}
   if(op.kind==='line'){page.drawLine({start:{x:op.x,y:canvasSize.height-op.y},end:{x:op.x2,y:canvasSize.height-op.y2},color:color(op.color),thickness:op.thickness,dashArray:op.dash});continue;}
   if(op.kind==='circle'){page.drawCircle({x:op.x,y:canvasSize.height-op.y,size:op.r,color:color(op.color),borderColor:op.stroke?color(op.stroke):undefined,borderWidth:op.stroke?1:0});continue;}
   if(op.kind==='polygon'){page.drawSvgPath(op.points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ')+' Z',{x:0,y:canvasSize.height,color:color(op.color),borderColor:op.stroke?color(op.stroke):undefined,borderWidth:op.stroke?op.thickness??1:0});continue;}
   const image=images[op.image];if(!image)continue;
   const scale=(op.fit==='cover'?Math.max:Math.min)(op.width/image.width,op.height/image.height);
   page.pushOperators(pushGraphicsState(),rectangle(op.x,canvasSize.height-op.y-op.height,op.width,op.height),clip(),endPath());
   page.drawImage(image,{x:op.x+(op.width-image.width*scale)/2,y:canvasSize.height-op.y-op.height+(op.height-image.height*scale)/2,width:image.width*scale,height:image.height*scale});
   page.pushOperators(popGraphicsState());
  }
 }
 return new Uint8Array(await pdf.save());
}
