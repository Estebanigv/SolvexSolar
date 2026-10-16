import {billTextScore,extractBill} from './bill-extraction';

const essentialFields=['name','address','bill','consumptionKwh'] as const;
export function needsBillDetailPass(texts:string[]){
  const {values}=extractBill(texts);
  return essentialFields.some(key=>values[key]===undefined);
}
export function billOcrScore(text:string){
  const {values}=extractBill([text]);
  return essentialFields.filter(key=>values[key]!==undefined).length*100+Math.min(50,billTextScore(text));
}
/** Overlap protects labels at column/page boundaries. Coordinates are normalized. */
export const billDetailRegions=[
  {x:0,y:0,width:.56,height:.56},
  {x:.44,y:0,width:.56,height:.56},
  {x:0,y:.44,width:.56,height:.56},
  {x:.44,y:.44,width:.56,height:.56},
] as const;

/** A partial crop must never displace a value already read from the whole document. */
export function mergeBillDetailTexts(fullText:string,details:string[]):string[]{
  const before=extractBill([fullText]).values;
  return [fullText,...details.filter(detail=>{
    if(!detail.trim())return false;
    const after=extractBill([fullText,detail]).values;
    return Object.entries(before).every(([key,value])=>after[key as keyof typeof after]===value);
  })];
}
