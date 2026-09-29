import type {QuoteInput} from './quote';
import {newEnergyInput} from './energy';

export const billFields = [
  {key:'name',label:'Nombre del cliente'}, {key:'email',label:'Correo del cliente'}, {key:'phone',label:'Teléfono del cliente'}, {key:'address',label:'Dirección de suministro'},
  {key:'commune',label:'Comuna'}, {key:'region',label:'Región'},
  {key:'bill',label:'Total a pagar (CLP)'}, {key:'consumptionKwh',label:'Consumo del período (kWh)'},
  {key:'billingDays',label:'Días del período'}, {key:'distributor',label:'Distribuidora'},
  {key:'tariff',label:'Tarifa eléctrica'},
] as const;
export type BillField = typeof billFields[number]['key'];
export type BillValues = Partial<Record<BillField,string>>;
export type BillExtraction = {values:BillValues; evidence:Partial<Record<BillField,string>>; warnings:string[]; period?:string; autoApplied?:BillField[]; preserved?:BillField[]};
const normalize = (s:string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function billTextScore(text:string) {
  return (normalize(text).match(/\b(?:consumo|boleta|kwh|tarifa|cliente|electricidad|suministro|total|pagar|lectura|periodo)\b/g)??[]).length;
}
export function billNumber(text:string):number|null {
  let s=text.replace(/[$\s]/g,'');
  if (!/^\d[\d.,]*$/.test(s)) return null;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s)) s=s.replace(/\./g,'');
  s=s.replace(',','.');
  const n=Number(s); return Number.isFinite(n)?n:null;
}
function validDate(day:number,month:number,year:number) {
  const d=new Date(Date.UTC(year,month-1,day));
  return d.getUTCDate()===day&&d.getUTCMonth()===month-1?d:null;
}
const months=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

/** Extract only explicitly labeled bill data. Utility phone numbers/emails are never customer data. */
export function extractBill(pages:string[]):BillExtraction {
  const text=pages.join('\n\n').replace(/\r/g,'').replace(/[ \t]+/g,' ');
  const flat=text.replace(/\n+/g,'\n');
  const values:BillValues={}; const evidence:BillExtraction['evidence']={}; const warnings:string[]=[];
  const set=(key:BillField,value:string,source:string)=>{if(!values[key]){values[key]=value.trim();evidence[key]=source.trim()}};
  const conflicts=new Set<BillField>();
  const textMatch=(key:BillField,pattern:RegExp)=>{const matches=[...flat.matchAll(new RegExp(pattern.source,pattern.flags+'g'))].filter(m=>m[1].trim().length>1);const unique=new Set(matches.map(m=>normalize(m[1].trim())));if(unique.size>1){conflicts.add(key);warnings.push(`Se detectaron valores distintos para ${billFields.find(f=>f.key===key)!.label.toLowerCase()}. Revisa que los documentos sean de la misma boleta.`);}else if(matches.length)set(key,matches[0][1],matches[0][0])};
  textMatch('name',/(?:Sr\.?\s*\(a\)|Titular\s*:|Nombre del cliente\s*:)\s*([^\n]{2,100})/i);
  if(values.name) values.name=values.name.replace(/\s*\(\s*Cliente\s*\).*$/i,'').trim();
  textMatch('address',/Direcci[oó]n de suministro\s*:\s*([^\n]{3,180})/i);
  if(!values.address&&!conflicts.has('address'))textMatch('address',/Direcci[oó]n de env[ií]o\s*:\s*([^\n]{3,180})/i);
  textMatch('email',/(?:Correo(?: electr[oó]nico)?|E-?mail)\s+(?:del\s+)?cliente\s*:\s*([^\s\n]+@[^\s\n]+)/i);
  textMatch('phone',/(?:Tel[eé]fono|Celular)\s+(?:del\s+)?cliente\s*:\s*(\+?\d[\d ()-]{6,25})/i);
  const addressBlock=flat.match(/Direcci[oó]n de (?:suministro|env[ií]o)\s*:\s*([^\n]+)\n(?:Datos de mi suministro\n)?((?:Depto\.?|Dpto\.?|Casa|Oficina)\s+[^\n]+)/i);
  if(addressBlock&&values.address&&!/\b(?:Depto|Dpto|Casa|Oficina)\b/i.test(values.address)) values.address+=' '+addressBlock[2];
  textMatch('commune',/\bComuna\s*:\s*([^\n]{2,70})/i);
  textMatch('region',/\bRegi[oó]n\s*:\s*([^\n]{2,70})/i);
  const town=(values.address??'').match(/(?:Depto\.?|Dpto\.?|Casa|Oficina)\s+[\w-]+\s+([a-záéíóúñ][a-záéíóúñ .'-]{2,45})$/i);
  if(!values.commune&&!conflicts.has('commune')&&town)set('commune',town[1],values.address!);
  // Use only the customer's supply address, never branch/office addresses elsewhere on the bill.
  const addressTown=values.address?.match(/,\s*([a-záéíóúñ][a-záéíóúñ .'-]{2,60})\s*$/i);
  if(!values.commune&&!conflicts.has('commune')&&addressTown)set('commune',addressTown[1].trim(),values.address!);
  const suppliers=[...flat.matchAll(/\b(COPELEC|ENEL|CGE|CHILQUINTA|SAESA|FRONTEL|LUZ OSORNO|EDELAYSEN|EDELMAG|LUZ LINARES|LUZ PARRAL|EEPA|EMPRESA\s+EL[EÉ]CTRICA\s+PUENTE\s+ALTO)\b/gi)];
  const supplierNames=[...new Set(suppliers.map(m=>/^empresa/i.test(m[1])?'EEPA':m[1].toUpperCase()))];
  if(supplierNames.length===1)set('distributor',supplierNames[0],suppliers[0][0]);
  else if(supplierNames.length>1)warnings.push('Aparecen varias distribuidoras. Confirma cuál emitió la boleta.');
  textMatch('tariff',/(?:tipo de )?tarifa(?:\s+el[eé]ctrica|\s+contratada)?\s*:\s*((?:BT|AT)\s*\d[\w.-]*)\b/i);
  if(values.tariff)values.tariff=values.tariff.replace(/\s/g,'').toUpperCase();
  // Total boleta excludes previous debt; it must not compete with the explicitly labeled amount due.
  const payableMatches=[...flat.matchAll(/Total a pagar\s*[:=]?\s*\$?\s*(\d[\d.,]*)/gi)];
  const amountCandidates=(payableMatches.length?payableMatches:[...flat.matchAll(/Total boleta\s*[:=]?\s*\$?\s*(\d[\d.,]*)/gi)]).map(m=>({n:billNumber(m[1]),source:m[0]})).filter(x=>x.n!==null&&x.n>=0&&x.n<=1e9);
  const amounts=[...new Set(amountCandidates.map(x=>x.n))];
  if(amounts.length===1)set('bill',String(amounts[0]),amountCandidates[0].source);
  else if(amounts.length>1)warnings.push('Se detectaron totales diferentes. Revisa el monto a pagar; podría haber saldo anterior o documentos distintos.');
  if([...flat.matchAll(/Saldo anterior(?:\s*\([^\n)]*\))?\s*[:=]?\s*\$?\s*(\d[\d.,]*)/gi)].some(m=>(billNumber(m[1])??0)>0))warnings.push('El total a pagar incluye saldo anterior. No lo uses como gasto mensual ni como base directa del ahorro; el consumo se calcula con los kWh y días del período.');
  const usageCandidates=[...flat.matchAll(/(?:Consumo total del mes|Electricidad consumida|Consumo (?:del per[ií]odo|facturado|mensual))\s*[:=]?\s*(\d[\d.,]*)\s*k\s*w\s*h\b/gi)].map(m=>({n:billNumber(m[1]),source:m[0]})).filter(x=>x.n!==null&&x.n>=0&&x.n<=1e8);
  const usages=[...new Set(usageCandidates.map(x=>x.n))];
  if(usages.length===1)set('consumptionKwh',String(usages[0]),usageCandidates[0].source);
  else if(usages.length>1)warnings.push('Las lecturas muestran consumos distintos. Selecciona el consumo facturado del período; no una lectura acumulada del medidor.');
  let period:string|undefined;
  const numericPeriod=flat.match(/(?:Per[ií]odo de (?:lectura|facturaci[oó]n)|Monto del per[ií]odo)\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s*(?:-|al?|hasta)\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i);
  let start:Date|null=null,end:Date|null=null;
  if(numericPeriod){start=validDate(+numericPeriod[1],+numericPeriod[2],+numericPeriod[3]);end=validDate(+numericPeriod[4],+numericPeriod[5],+numericPeriod[6]);period=numericPeriod[0]}
  else {
    const namedPeriod=flat.match(/(?:Monto del per[ií]odo|Per[ií]odo de (?:lectura|facturaci[oó]n))\s*:?\s*(\d{1,2})\s+(\p{L}+)\s*(?:-|al?|hasta)\s*(\d{1,2})\s+(\p{L}+)/iu);
    const issue=flat.match(/Fecha de emisi[oó]n\s*:\s*\d{1,2}\s+(\p{L}+)\s+(\d{4})/iu);
    if(namedPeriod&&issue){const sm=months.indexOf(normalize(namedPeriod[2]).slice(0,3))+1;const em=months.indexOf(normalize(namedPeriod[4]).slice(0,3))+1;const im=months.indexOf(normalize(issue[1]).slice(0,3))+1;if(sm&&em&&im){const year=+issue[2]-(em>im?1:0);start=validDate(+namedPeriod[1],sm,year-(sm>em?1:0));end=validDate(+namedPeriod[3],em,year);period=namedPeriod[0]}}
  }
  const explicitDays=flat.match(/(?:D[ií]as (?:del per[ií]odo|facturados)|Per[ií]odo facturado)\s*:\s*(\d{1,3})(?:\s*d[ií]as)?/i);
  if(explicitDays&&+explicitDays[1]>0&&+explicitDays[1]<=366)set('billingDays',explicitDays[1],explicitDays[0]);
  else if(start&&end){const days=(end.getTime()-start.getTime())/86400000;if(days>0&&days<=366){set('billingDays',String(days),period!);warnings.push('Los días se calcularon entre las fechas detectadas. Confirma la duración del período con la boleta.')}}
  if(!values.consumptionKwh)warnings.push('No se detectó un consumo facturado inequívoco. Agrega el reverso o ingresa los kWh manualmente.');
  if(!values.billingDays)warnings.push('No se pudo determinar el período. Completa los días facturados.');
  if(pages.length>1){
    const individual=pages.map(page=>extractBill([page]));
    for(const {key,label} of billFields){
      const comparable=key==='bill'&&payableMatches.length?pages.map((page,i)=>/Total a pagar\s*[:=]?\s*\$?\s*\d/i.test(page)?individual[i]:null):individual;
      const distinct=new Set(comparable.map(item=>item?.values[key]).filter((v):v is string=>!!v).map(v=>normalize(v.trim())));
      if(distinct.size>1){delete values[key];delete evidence[key];warnings.push(`Los documentos no coinciden en ${label.toLowerCase()}. Este dato requiere revisión manual.`);}
    }
  }
  return {values,evidence,warnings,period};
}

export function currentBillValues(quote:QuoteInput):BillValues {
  return {name:quote.customer.name,email:quote.customer.email,phone:quote.customer.phone,address:quote.customer.address,commune:quote.customer.commune,region:quote.customer.region,bill:quote.customer.bill?String(quote.customer.bill):'',consumptionKwh:quote.energy?.consumptionKwh==null?'':String(quote.energy.consumptionKwh),billingDays:quote.energy?.billingDays==null?'':String(quote.energy.billingDays),distributor:quote.energy?.distributor??'',tariff:quote.energy?.tariff??''};
}
export function applyBillValues(quote:QuoteInput,values:BillValues):Partial<QuoteInput> {
  const customer={...quote.customer};const energy={...(quote.energy??newEnergyInput()),billReviewed:false};
  for(const field of billFields){const raw=values[field.key];if(raw===undefined)continue;const value=raw.trim();if(!value)throw Error(`Completa ${field.label.toLowerCase()} o desmarca el campo.`);
    if(field.key==='bill'||field.key==='consumptionKwh'||field.key==='billingDays') {
      const n=billNumber(value);const max=field.key==='bill'?1e9:field.key==='billingDays'?366:1e8;
      if(n===null||n<0||n>max||(field.key==='billingDays'&&(!Number.isInteger(n)||n<1)))throw Error(`Revisa ${field.label.toLowerCase()}.`);
      if(field.key==='bill')customer.bill=n;else energy[field.key]=n;
    } else if(field.key==='email'){if(value.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Revisa el correo del cliente.');customer.email=value}
    else if(field.key==='phone'){if(value.length>40||!/^\+?[\d ()-]+$/.test(value)||value.replace(/\D/g,'').length<8)throw Error('Revisa el teléfono del cliente.');customer.phone=value}
    else if(field.key==='distributor'||field.key==='tariff') {if(value.length>(field.key==='tariff'?50:120))throw Error('El texto detectado es demasiado largo. Revísalo.');energy[field.key]=value}
    else {const limit=field.key==='address'?300:field.key==='name'?150:100;if(value.length>limit)throw Error('El texto detectado es demasiado largo. Revísalo.');customer[field.key]=value}
  }
  return {customer,energy,technicalReviewed:false};
}

/** Only retire values still owned by the previous automatic read. User edits win. */
export function clearAutomaticBillValues(quote:QuoteInput,previous:BillValues):Partial<QuoteInput>{
  const current=currentBillValues(quote),customer={...quote.customer},energy={...(quote.energy??newEnergyInput()),billReviewed:false};
  for(const {key} of billFields){
    if(previous[key]===undefined||current[key]!==previous[key])continue;
    if(key==='consumptionKwh'||key==='billingDays')energy[key]=null;
    else if(key==='distributor'||key==='tariff')energy[key]='';
    else if(key==='bill')customer.bill=0;
    else customer[key]='';
  }
  return {customer,energy,technicalReviewed:false};
}

export function autoFillBill(quote:QuoteInput,result:BillExtraction,previous:BillValues={}){
  const original=currentBillValues(quote);
  let next={...quote,...clearAutomaticBillValues(quote,previous)};
  const available=currentBillValues(next),automatic:BillValues={},applied:BillField[]=[],preserved:BillField[]=[],warnings=[...result.warnings];
  for(const {key,label} of billFields){
    const value=result.values[key];if(value===undefined||!value.trim())continue;
    if(available[key]){if(available[key]!==value.trim())preserved.push(key);continue;}
    try{next={...next,...applyBillValues(next,{[key]:value})};automatic[key]=currentBillValues(next)[key];applied.push(key)}
    catch{warnings.push(`No se cargó ${label.toLowerCase()}: el valor detectado no es válido. Revísalo manualmente.`)}
  }
  const changed=billFields.some(({key})=>original[key]!==currentBillValues(next)[key]);
  return {patch:{customer:next.customer,energy:next.energy,technicalReviewed:false} as Partial<QuoteInput>,automatic,changed,result:{...result,warnings,autoApplied:applied,preserved}};
}
