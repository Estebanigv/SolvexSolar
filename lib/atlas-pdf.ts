import {PDFDocument,StandardFonts,rgb,pushGraphicsState,popGraphicsState,rectangle,clip,endPath} from 'pdf-lib';
import {proposalCanvases,canvasSize} from './proposal-canvas';
import type {SavedQuote} from './quote';

export async function atlasPdf(q:SavedQuote,logoBytes?:ArrayBuffer,photos:{roof?:ArrayBuffer;home?:ArrayBuffer}={}){
 const pdf=await PDFDocument.create();pdf.setTitle(`${q.folio} - ${q.settings.name}`);pdf.setAuthor(q.settings.name);
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const images={logo:logoBytes?await pdf.embedPng(logoBytes):null,roof:photos.roof?await pdf.embedJpg(photos.roof):null,home:photos.home?await pdf.embedJpg(photos.home):null};
 const color=(hex:string)=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
 for(const canvas of proposalCanvases(q)){
  const page=pdf.addPage([canvasSize.width,canvasSize.height]);
  for(const op of canvas.ops){
   if(op.kind==='text'){page.drawText(op.text,{x:op.x,y:canvasSize.height-op.y,size:op.size,font:op.bold?bold:regular,color:color(op.color)});continue;}
   if(op.kind==='rect'){page.drawRectangle({x:op.x,y:canvasSize.height-op.y-op.height,width:op.width,height:op.height,color:color(op.color),opacity:op.opacity??1});continue;}
   const image=images[op.image];if(!image)continue;
   const scale=(op.fit==='cover'?Math.max:Math.min)(op.width/image.width,op.height/image.height);
   page.pushOperators(pushGraphicsState(),rectangle(op.x,canvasSize.height-op.y-op.height,op.width,op.height),clip(),endPath());
   page.drawImage(image,{x:op.x+(op.width-image.width*scale)/2,y:canvasSize.height-op.y-op.height+(op.height-image.height*scale)/2,width:image.width*scale,height:image.height*scale});
   page.pushOperators(popGraphicsState());
  }
 }
 return new Uint8Array(await pdf.save());
}
