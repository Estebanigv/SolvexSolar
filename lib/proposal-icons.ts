import type {DrawOp} from './proposal-canvas';

/** Technical, two-tone solar pictograms. Shared vector geometry for SVG and PDF. */
export function proposalIcon(kind:string,x:number,y:number,size:number,ink:string,accent:string,paper:string):DrawOp[]{
 const ops:DrawOp[]=[],scale=size/40;
 const point=(a:number,b:number)=>({x:x+a*scale,y:y+b*scale});
 const polygon=(coords:number[][],color:string)=>ops.push({kind:'polygon',points:coords.map(([a,b])=>point(a,b)),color});
 const line=(a:number,b:number,c:number,d:number,color=ink,weight=1.6)=>ops.push({kind:'line',...point(a,b),x2:x+c*scale,y2:y+d*scale,color,thickness:weight*scale});
 const rect=(a:number,b:number,w:number,h:number,color:string)=>ops.push({kind:'rect',...point(a,b),width:w*scale,height:h*scale,color});
 const circle=(a:number,b:number,r:number,color:string)=>ops.push({kind:'circle',...point(a,b),r:r*scale,color});
 if(kind==='sun'){
  circle(20,20,10,ink);circle(20,20,8,paper);circle(20,20,6.4,accent);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;line(20+Math.cos(a)*14,20+Math.sin(a)*14,20+Math.cos(a)*18,20+Math.sin(a)*18,ink,2);}
 }else if(kind==='panels'){
  // A sloped photovoltaic array with cells, mounting rails and two supports.
  line(12,28,10,35,ink,2);line(28,28,30,35,ink,2);line(6,36,34,36,ink,2);
  polygon([[7,4],[33,4],[39,28],[1,28]],ink);
  polygon([[8.5,6],[31.5,6],[36.5,26],[3.5,26]],paper);
  polygon([[8.5,6],[15.5,6],[14,15],[6.5,15]],accent);
  for(let row=1;row<3;row++){const t=row/3;line(8.5-5*t,6+20*t,31.5+5*t,6+20*t,ink,1);}
  for(let col=1;col<3;col++){const t=col/3;line(8.5+23*t,6,3.5+33*t,26,ink,1);}
  line(2,29.5,38,29.5,ink,1.5);
 }else if(kind==='inverter'){
  // Wall-mounted conversion unit: display, AC wave, ventilation and cable glands.
  polygon([[9,2],[31,2],[34,5],[34,31],[31,34],[9,34],[6,31],[6,5]],ink);
  polygon([[10,4],[30,4],[32,6],[32,30],[30,32],[10,32],[8,30],[8,6]],paper);
  rect(11,8,18,11,ink);
  const wave=[[13,14],[15,11],[17,11],[19,14],[21,17],[23,17],[25,14],[27,11]];
  for(let i=1;i<wave.length;i++)line(wave[i-1][0],wave[i-1][1],wave[i][0],wave[i][1],accent,1.3);
  line(12,24,22,24,ink,1);line(12,27,22,27,ink,1);circle(27,25.5,2.2,accent);
  rect(12,34,4,3,ink);rect(24,34,4,3,ink);line(14,37,14,40);line(26,37,26,40);
 }else if(kind==='battery'){
  rect(14,1,12,3,ink);polygon([[9,4],[31,4],[34,7],[34,36],[31,39],[9,39],[6,36],[6,7]],ink);
  rect(9,7,22,28,paper);rect(12,10,16,6,accent);rect(12,18,16,6,accent);rect(12,26,16,6,ink);
 }else{
  // Consumption is represented by the building and an energy bolt, not a generic doorway.
  polygon([[6,17],[20,6],[34,17],[34,38],[6,38]],ink);
  polygon([[8,18],[20,9],[32,18],[32,36],[8,36]],paper);
  polygon([[1,17],[20,1],[39,17],[37,20],[20,6],[3,20]],ink);
  rect(28,4,4,7,ink);rect(10,20,6,6,ink);
  polygon([[23,17],[18,28],[23,28],[21,35],[30,24],[25,24],[28,17]],accent);
 }
 return ops;
}
