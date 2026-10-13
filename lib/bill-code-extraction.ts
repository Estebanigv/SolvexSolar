import {extractBill,type BillExtraction} from './bill-extraction';
import type {BillCode} from './bill-barcode';

const suppliers:Record<string,string>={'cge.cl':'CGE','enel.cl':'ENEL','enelchile.cl':'ENEL','chilquinta.cl':'CHILQUINTA','saesa.cl':'SAESA','frontel.cl':'FRONTEL','edelaysen.cl':'EDELAYSEN','edelmag.cl':'EDELMAG','copelec.cl':'COPELEC','luzparral.cl':'LUZ PARRAL','luzlinares.cl':'LUZ LINARES','eepa.cl':'EEPA'};
/** QR domains identify the issuer only. Payment links and SII stamps do not prove consumption. */
export function combineBillCodes(result:BillExtraction,codes:BillCode[]):BillExtraction{
 const next:BillExtraction={...result,values:{...result.values},evidence:{...result.evidence},warnings:[...result.warnings],codes};
 const candidates:BillExtraction[]=[];
 for(const code of codes.slice(0,30)){
  if(code.text.length>20000)continue;
  try{
   const url=new URL(code.text.trim());
   if(!['https:','http:'].includes(url.protocol))continue;
   const domain=Object.keys(suppliers).find(host=>url.hostname===host||url.hostname.endsWith('.'+host));
   if(domain)candidates.push({values:{distributor:suppliers[domain]},evidence:{distributor:`Dominio del código QR: ${url.hostname}`},warnings:[]});
   // Do not extract numbers from opaque URL parameters or fetch arbitrary links.
  }catch{
   if(/(?:Consumo (?:del per[ií]odo|facturado|mensual)|Total a pagar|D[ií]as facturados)\s*:/i.test(code.text))candidates.push(extractBill([code.text]));
  }
 }
 for(const key of ['distributor','consumptionKwh','billingDays','bill','tariff'] as const){
  const entries=[result,...candidates].filter(item=>item.values[key]);
  const values=new Set(entries.map(item=>item.values[key]!.toUpperCase()));
  if(values.size>1){delete next.values[key];delete next.evidence[key];next.warnings.push(`El código y la boleta no coinciden en ${key==='distributor'?'distribuidora':key}. Revisa el dato manualmente.`);}
  else if(entries.length){next.values[key]=entries[0].values[key];next.evidence[key]=entries[0].evidence[key];}
 }
 next.warnings=next.warnings.filter(message=>!(next.values.consumptionKwh&&message==='No se detectó un consumo facturado inequívoco. Agrega el reverso o ingresa los kWh manualmente.')&&!(next.values.billingDays&&message==='No se pudo determinar el período. Completa los días facturados.'));
 if(codes.length&&!next.values.consumptionKwh)next.warnings.push('El código no contiene consumo verificable. Completa los kWh desde la boleta; el enlace de pago no permite deducirlos.');
 return next;
}
