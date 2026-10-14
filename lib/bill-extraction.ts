import {detectElectricityDistributor} from './electricity-distributors';
import type {QuoteInput} from './quote';
import {newEnergyInput} from './energy';
import {findCommune,locationFromAddress,regionMatches} from './chile-location';

export const billFields = [
  {key:'name',label:'Nombre del cliente'}, {key:'email',label:'Correo del cliente'}, {key:'phone',label:'Teléfono del cliente'}, {key:'address',label:'Dirección de suministro'},
  {key:'commune',label:'Comuna'}, {key:'region',label:'Región'},
  {key:'bill',label:'Total a pagar (CLP)'}, {key:'consumptionKwh',label:'Consumo del período (kWh)'},
  {key:'billingDays',label:'Días del período'}, {key:'distributor',label:'Distribuidora'},
  {key:'tariff',label:'Tarifa eléctrica'},
] as const;
export type BillField = typeof billFields[number]['key'];
export type BillValues = Partial<Record<BillField,string>>;
export type BillExtraction = {values:BillValues; evidence:Partial<Record<BillField,string>>; warnings:string[]; codes?:{format:string;text:string}[]; period?:string; autoApplied?:BillField[]; preserved?:BillField[]};
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

function splitBillLabels(text:string){return text.replace(/[ \t]+(?=(?:Comuna|Regi[oó]n|Correo(?: electr[oó]nico)? del cliente|Tel[eé]fono del cliente|Tipo de tarifa contratada)\s*:)/gi,'\n').replace(/\n+/g,'\n');}

/** Follow address continuations only next to the chosen customer label, within one page. */
function customerAddresses(pages:string[],delivery=false){
  const label=delivery?/Direcci[oó]n\s+(?:de\s+)?env[iíì]o\s*:\s*([^\n]{3,180})/gi:/(?:Direcci[oó]n\s+(?:de[l]?\s+)?(?:suministro|servicio|instalaci[oó]n)|Domicilio del cliente|Direcci[oó]n del cliente)\s*:?\s*([^\n]{3,180})/gi;
  const unit=/^(?:D[eé]p(?:t|l|lt)o\.?|Dpto\.?|Departamento|Casa|Oficina|Of\.?)\s+([a-z0-9][a-z0-9/-]*)(?:[ \"'.,-]+[^:\n]{1,65})?$/i;
  return pages.flatMap(page=>{
    const clean=splitBillLabels(page.replace(/\r/g,'').replace(/[ \t]+/g,' '));
    return [...clean.matchAll(label)].map(match=>{
      let address=match[1].trim(),source=match[0];
      const next=clean.slice(match.index!+match[0].length).split('\n').slice(1).map(line=>line.trim()).filter(Boolean).slice(0,2);
      for(const line of next){
        if(unit.test(line)&&!/(?:Depto|Dpto|Departamento|Casa|Oficina)\s+\w/i.test(address)){
          // A common OCR confusion on folded bills: Deplo instead of Depto.
          address+=' '+line.replace(/^D[eé]p(?:t|l|lt)o\.?/i,'Depto').replace(/([0-9])["']+(?=\s|$)/g,'$1');source+='\n'+line;
        }else if(findCommune(line)){address+=' '+line;source+='\n'+line;break}
        else break;
      }
      return {address,source};
    });
  });
}

/** Extract only explicitly labeled bill data. Utility phone numbers/emails are never customer data. */
export function extractBill(pages:string[]):BillExtraction {
  const text=pages.join('\n\n').replace(/\r/g,'').replace(/[ \t]+/g,' ');
  // Some PDFs place multiple labeled fields on the same physical line.
  const flat=splitBillLabels(text);
  const values:BillValues={}; const evidence:BillExtraction['evidence']={}; const warnings:string[]=[];
  const set=(key:BillField,value:string,source:string)=>{if(!values[key]){values[key]=value.trim();evidence[key]=source.trim()}};
  const conflicts=new Set<BillField>();
  const textMatch=(key:BillField,pattern:RegExp)=>{const matches=[...flat.matchAll(new RegExp(pattern.source,pattern.flags+'g'))].filter(m=>m[1].trim().length>1);const unique=new Set(matches.map(m=>normalize(m[1].trim())));if(unique.size>1){conflicts.add(key);warnings.push(`Se detectaron valores distintos para ${billFields.find(f=>f.key===key)!.label.toLowerCase()}. Revisa que los documentos sean de la misma boleta.`);}else if(matches.length)set(key,matches[0][1],matches[0][0])};
  textMatch('name',/(?:(?:Sr\.?|Señor)\s*\(a\)|(?:Titular|Nombre del cliente|Nombre\s*\/\s*Raz[oó]n social)\s*:)\s*([^\n]{2,100})/i);
  if(values.name) values.name=values.name.replace(/\s*\(\s*Cliente\s*\).*$/i,'').trim();
  const supplyAddresses=customerAddresses(pages);
  const addresses=supplyAddresses.length?supplyAddresses:customerAddresses(pages,true);
  const uniqueAddresses=new Set(addresses.map(item=>normalize(item.address)));
  if(uniqueAddresses.size>1){conflicts.add('address');warnings.push('Se detectaron direcciones de suministro distintas. Revisa que los documentos sean de la misma boleta.');}
  else if(addresses.length)set('address',addresses[0].address,addresses[0].source);
  textMatch('email',/(?:Correo(?: electr[oó]nico)?|E-?mail)\s+(?:del\s+)?cliente\s*:\s*([^\s\n]+@[^\s\n]+)/i);
  textMatch('phone',/(?:Tel[eé]fono|Celular)\s+(?:del\s+)?cliente\s*:\s*(\+?\d[\d ()-]{6,25})/i);
  textMatch('commune',/\bComuna(?:[ \t]*[:–-][ \t]*|\n|[ \t]+)\s*([^\n]{2,70})/i);
  textMatch('region',/\bRegi[oó]n(?:[ \t]*[:–-][ \t]*|\n|[ \t]+)\s*([^\n]{2,70})/i);
  const town=(values.address??'').match(/(?:Depto\.?|Dpto\.?|Casa|Oficina)\s+[\w-]+\s+([a-záéíóúñ][a-záéíóúñ .'-]{2,45})$/i);
  if(!values.commune&&!conflicts.has('commune')&&town)set('commune',town[1],values.address!);
  // Use only the customer's supply address, never branch/office addresses elsewhere on the bill.
  const addressTown=values.address?.match(/,\s*([a-záéíóúñ][a-záéíóúñ .'-]{2,60})\s*$/i);
  if(!values.commune&&!conflicts.has('commune')&&addressTown)set('commune',addressTown[1].trim(),values.address!);
  const supplier=detectElectricityDistributor(flat);
  if(supplier.name)set('distributor',supplier.name,supplier.evidence!);
  else warnings.push(supplier.ambiguous?'Aparecen varias distribuidoras. Confirma cuál emitió la boleta.':'No se identificó la distribuidora. Selecciona o escribe la empresa de tu boleta; puedes continuar con cualquier proveedor de Chile.');
  textMatch('tariff',/(?:tipo de )?tarifa(?:\s+el[eé]ctrica|\s+contratada)?\s*:\s*((?:BT|AT)\s*\d[\w.-]*)\b/i);
  if(values.tariff)values.tariff=values.tariff.replace(/\s/g,'').toUpperCase();
  // Total boleta excludes previous debt; it must not compete with the explicitly labeled amount due.
  const payableMatches=[...flat.matchAll(/(?:Total a pagar|Monto a pagar)\s*[:=]?\s*(?:CLP\s*)?\$?\s*(\d[\d.,]*(?:[ \t]\d{3})*)(?!\d)/gi)];
  const amountCandidates=(payableMatches.length?payableMatches:[...flat.matchAll(/Total boleta\s*[:=]?\s*\$?\s*(\d[\d.,]*)/gi)]).map(m=>({n:billNumber(m[1]),source:m[0]})).filter(x=>x.n!==null&&x.n>=0&&x.n<=1e9);
  const amounts=[...new Set(amountCandidates.map(x=>x.n))];
  if(amounts.length===1)set('bill',String(amounts[0]),amountCandidates[0].source);
  else if(amounts.length>1)warnings.push('Se detectaron totales diferentes. Revisa el monto a pagar; podría haber saldo anterior o documentos distintos.');
  if([...flat.matchAll(/Saldo anterior(?:\s*\([^\n)]*\))?\s*[:=]?\s*\$?\s*(\d[\d.,]*)/gi)].some(m=>(billNumber(m[1])??0)>0))warnings.push('El total a pagar incluye saldo anterior. No lo uses como gasto mensual ni como base directa del ahorro; el consumo se calcula con los kWh y días del período.');
  const usageCandidates=[...flat.matchAll(/(?:Consumo total del (?:mes|per[ií]odo)|Electricidad consumida|Energ[ií]a consumida|Consumo (?:del per[ií]odo|facturado|mensual))\s*[:=]?\s*\(?\s*(\d[\d.,]*)\s*k\s*w\s*h\b/gi)].map(m=>({n:billNumber(m[1]),source:m[0]})).filter(x=>x.n!==null&&x.n>=0&&x.n<=1e8);
  // Some layouts print the unit in the label rather than after the value.
  for(const match of flat.matchAll(/(?:Consumo (?:total del (?:mes|per[ií]odo)|del per[ií]odo|facturado|mensual)|Electricidad consumida|Energ[ií]a consumida)\s*\(\s*k\s*w\s*h\s*\)\s*[:=]?\s*(\d[\d.,]*)(?!\d)/gi)){
    const n=billNumber(match[1]);if(n!==null&&n>=0&&n<=1e8)usageCandidates.push({n,source:match[0]});
  }
  const usages=[...new Set(usageCandidates.map(x=>x.n))];
  if(usages.length===1)set('consumptionKwh',String(usages[0]),usageCandidates[0].source);
  else if(usages.length>1)warnings.push('Las lecturas muestran consumos distintos. Selecciona el consumo facturado del período; no una lectura acumulada del medidor.');
  let period:string|undefined;
  const numericPeriod=flat.match(/(?:Per[ií]odo de (?:lectura|facturaci[oó]n)|Monto del per[ií]odo)\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s*(?:-|al?|hasta)\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i);
  let start:Date|null=null,end:Date|null=null;let yearlessDays:number|undefined;
  if(numericPeriod){start=validDate(+numericPeriod[1],+numericPeriod[2],+numericPeriod[3]);end=validDate(+numericPeriod[4],+numericPeriod[5],+numericPeriod[6]);period=numericPeriod[0]}
  else {
    const namedPeriod=flat.match(/(?:Monto del per[ií]odo|Per[ií]odo de (?:lectura|facturaci[oó]n))\s*:?\s*(\d{1,2})\s+(\p{L}+)\s*(?:-|al?|hasta)\s*(\d{1,2})\s+(\p{L}+)/iu);
    const issue=flat.match(/Fecha de emisi[oó]n\s*:\s*\d{1,2}\s+(\p{L}+)\s+(\d{4})/iu);
    if(namedPeriod&&issue){const sm=months.indexOf(normalize(namedPeriod[2]).slice(0,3))+1;const em=months.indexOf(normalize(namedPeriod[4]).slice(0,3))+1;const im=months.indexOf(normalize(issue[1]).slice(0,3))+1;if(sm&&em&&im){const year=+issue[2]-(em>im?1:0);start=validDate(+namedPeriod[1],sm,year-(sm>em?1:0));end=validDate(+namedPeriod[3],em,year);period=namedPeriod[0]}}
    // With an unreadable issue year, use a duration only when leap/common years agree.
    if(namedPeriod&&!start&&!end){
      const sm=months.indexOf(normalize(namedPeriod[2]).slice(0,3))+1,em=months.indexOf(normalize(namedPeriod[4]).slice(0,3))+1;
      if(sm&&em){
        const durations=[2024,2025,2026].map(year=>{const a=validDate(+namedPeriod[1],sm,year-(sm>em?1:0)),b=validDate(+namedPeriod[3],em,year);return a&&b?(b.getTime()-a.getTime())/86400000:null});
        if(durations.every(days=>days!==null&&days>0&&days<=366)&&new Set(durations).size===1){yearlessDays=durations[0]!;period=namedPeriod[0]}
      }
    }
  }
  const explicitDays=flat.match(/(?:D[ií]as (?:del per[ií]odo|facturados|de consumo)|Per[ií]odo facturado)\s*:\s*(\d{1,3})(?:\s*d[ií]as)?/i);
  if(explicitDays&&+explicitDays[1]>0&&+explicitDays[1]<=366)set('billingDays',explicitDays[1],explicitDays[0]);
  else if(start&&end){const days=(end.getTime()-start.getTime())/86400000;if(days>0&&days<=366){set('billingDays',String(days),period!);warnings.push('Los días se calcularon entre las fechas detectadas. Confirma la duración del período con la boleta.')}}
  if(!values.billingDays&&yearlessDays){set('billingDays',String(yearlessDays),period!);warnings.push('Los días se calcularon con los días y meses del período; el año de emisión no se pudo leer. Confirma el período en la boleta.');}
  if(!values.consumptionKwh)warnings.push('No se detectó un consumo facturado inequívoco. Agrega el reverso o ingresa los kWh manualmente.');
  if(!values.billingDays)warnings.push('No se pudo determinar el período. Completa los días facturados.');
  if(pages.length>1){
    const individual=pages.map(page=>extractBill([page]));
    for(const {key,label} of billFields){
      const comparable=key==='bill'&&payableMatches.length?pages.map((page,i)=>/Total a pagar\s*[:=]?\s*\$?\s*\d/i.test(page)?individual[i]:null):individual;
      const distinct=new Set(comparable.map(item=>item?.values[key]).filter((v):v is string=>!!v).map(v=>normalize(v.trim())));
      if(distinct.size>1){conflicts.add(key);delete values[key];delete evidence[key];warnings.push(`Los documentos no coinciden en ${label.toLowerCase()}. Este dato requiere revisión manual.`);}
    }
  }
  const addressLocation=values.address?locationFromAddress(values.address):null;
  const place=values.commune?findCommune(values.commune):!conflicts.has('commune')?addressLocation?.place:null;
  if(place){
    values.commune=place.commune;
    evidence.commune??=values.address??place.commune;
    if(!values.region&&!conflicts.has('region')){
      values.region=place.region;
      evidence.region=`Región asociada a la comuna ${place.commune} en el catálogo territorial de SUBDERE (CUT ${place.code}).`;
    }else if(values.region&&regionMatches(values.region,place.region))values.region=place.region;
    else if(values.region){delete values.region;delete evidence.region;warnings.push(`La región indicada no corresponde a ${place.commune}. Confirma la ubicación; el catálogo territorial la asocia a ${place.region}.`);}
    if(addressLocation?.place.code===place.code)values.address=addressLocation.street;
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
