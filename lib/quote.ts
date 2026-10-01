import raw from './catalog.json';
import {z} from 'zod';
import {adviserSchema,roiReferenceSchema,paymentScheduleSchema,greenCreditNote} from './commercial';
import {energyInputSchema,consumptionSummary} from './energy';
export const systems=['ON GRID','ON GRID TRIFASICO','OFF GRID','HIBRIDO','HIBRIDO TRIFASICO'] as const;
export const systemNames:Record<string,string>={'ON GRID':'On Grid monofásico','ON GRID TRIFASICO':'On Grid trifásico','OFF GRID':'Off Grid','HIBRIDO':'Híbrido monofásico','HIBRIDO TRIFASICO':'Híbrido trifásico'};
export const productSchema=z.object({id:z.string().min(1).max(60),system:z.enum(systems),category:z.string().min(1).max(100),name:z.string().min(1).max(180),price:z.number().finite().min(0).max(1e10).nullable(),unit:z.string().min(1).max(50),source:z.string().max(200),watts:z.number().finite().min(0).max(2000).nullable()});
export type Product=z.infer<typeof productSchema>;
export const initialProducts=raw.products as Product[];
export const installationSchema=z.array(z.object({panels:z.number().int().positive(),price:z.number().finite().nonnegative(),source:z.string().max(300)}));
export type InstallationRates=z.infer<typeof installationSchema>;
export const installation:InstallationRates=raw.installation;
export const settingsSchema=z.object({advisers:z.array(adviserSchema).max(50).optional(),roiReference:roiReferenceSchema.optional(),paymentSchedule:paymentScheduleSchema.optional(),netbillingTerms:z.string().max(2000).optional(),requirementsVersion:z.string().max(50).optional(),name:z.string().min(1).max(100),legal:z.string().max(150),rut:z.string().max(30),address:z.string().max(250),email:z.union([z.literal(''),z.string().email()]),phone:z.string().max(40),validDays:z.number().int().min(1).max(365),taxMode:z.enum(['pending','included','net']),taxRate:z.number().min(0).max(100),terms:z.string().max(5000),warranty:z.string().max(3000),approved:z.boolean()});
export type Settings=z.infer<typeof settingsSchema>;
export const initialSettings:Settings={name:'Solvex Solar',legal:'',rut:'',address:'',email:'contacto@solvexsolar.cl',phone:'',validDays:15,taxMode:'pending',taxRate:19,terms:'',warranty:'',approved:false};
export const quoteSchema=z.object({financingNote:z.string().max(1000).optional(),showItemDetails:z.boolean().optional(),hiddenLineIds:z.array(z.string().min(1).max(60)).max(1000).optional(),proposalType:z.enum(['preliminary','final']).optional(),adviserId:z.string().max(80).optional(),discountPercent:z.number().int().min(0).max(30).optional(),energy:energyInputSchema.optional(),system:z.enum(systems),customer:z.object({name:z.string().max(150),email:z.union([z.literal(''),z.string().email()]),phone:z.string().max(40),region:z.string().max(100),commune:z.string().max(100),address:z.string().max(300),bill:z.number().finite().min(0).max(1e9)}),quantities:z.record(z.number().finite().min(0).max(100000)),extra:z.number().finite().min(0).max(1e10),extraLabel:z.string().max(300),discount:z.number().finite().min(0).max(1e10),installationOverride:z.number().finite().min(0).max(1e10).nullable(),installationNote:z.string().max(300),payment:z.string().min(1).max(100),notes:z.string().max(5000),technicalReviewed:z.boolean()});
export type QuoteInput=z.infer<typeof quoteSchema>;
export type Line={id:string;name:string;qty:number;unit:string;price:number|null;total:number|null;source:string;category:string};
export type Calculation={lines:Line[];panelWatts?:number[];panels:number;kwp:number;subtotal:number;discount:number;net:number;tax:number|null;total:number;warnings:string[];complete:boolean;official:boolean};
export type SavedQuote={id:string;clientId?:string;projectId?:string;parentQuoteId?:string|null;folio:string;date:string;input:QuoteInput;settings:Settings;calculation:Calculation};
export const money=(n:number)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
export const followsPanelCount=(p:Pick<Product,'category'>)=>['TIPO DE ESTRUCTURA','MATERIAL DE TECHO'].includes(p.category);
export const productUnit=(p:Pick<Product,'category'|'unit'>)=>followsPanelCount(p)||p.category==='SERVICIO DE INSTALACIÓN'?'panel':p.unit;
export const isInstallation=(p:Pick<Product,'category'>)=>p.category==='SERVICIO DE INSTALACIÓN';
// A selected roof/structure is a choice, not an independent quantity. Apply this
// on the server as well as in the editor so stale drafts cannot undercharge it.
export function panelQuantities(input:Pick<QuoteInput,'system'|'quantities'>,products:Product[]){
 const quantities={...input.quantities};
 const panels=products.filter(p=>p.system===input.system&&p.category==='PANEL FOTOVOLTAICO').reduce((sum,p)=>sum+(quantities[p.id]||0),0);
 for(const p of products)if(p.system===input.system&&followsPanelCount(p)&&quantities[p.id]>0)quantities[p.id]=panels;
 return quantities;
}
export function newQuote():QuoteInput{return {financingNote:greenCreditNote,showItemDetails:true,proposalType:'preliminary',discountPercent:0,system:'ON GRID',customer:{name:'',email:'',phone:'',region:'',commune:'',address:'',bill:0},quantities:{'0-10':8,'0-13':8,'0-26':1,'0-35':15,'0-37':15,'0-43':1,'0-45':1,'0-47':1},extra:0,extraLabel:'',discount:0,installationOverride:null,installationNote:'',payment:'Transferencia bancaria',notes:'',technicalReviewed:false}}
export function calculate(input:QuoteInput,products:Product[],settings:Settings,installationRates:InstallationRates=installation):Calculation{
 const parsed=quoteSchema.parse(input); const q={...parsed,quantities:panelQuantities(parsed,products)}; const warnings:string[]=[];
 const selected=products.filter(p=>p.system===q.system&&!isInstallation(p)&&(q.quantities[p.id]||0)>0);
 const ids=new Set(products.map(p=>p.id));
 if(Object.entries(q.quantities).some(([id,n])=>n>0&&!ids.has(id))) throw Error('La propuesta contiene un equipo que ya no está en el catálogo.');
 const lines:Line[]=selected.map(p=>({id:p.id,name:p.name,qty:q.quantities[p.id],unit:productUnit(p),price:p.price,total:p.price===null?null:Math.round(p.price*q.quantities[p.id]),source:p.source,category:p.category}));
 let complete=true;
 for(const p of selected){if(p.price===null){complete=false;warnings.push(`Falta precio: ${p.name}.`)} if(productUnit(p).includes('confirmar'))warnings.push(`Confirmar la unidad de cobro de ${p.name}.`);if(['panel','unidad'].includes(productUnit(p))&&!Number.isInteger(q.quantities[p.id])){complete=false;warnings.push('Las cantidades de equipos, paneles y soportes deben ser números enteros.')}if(p.category==='PANEL FOTOVOLTAICO'&&!p.watts){complete=false;warnings.push(`Falta potencia del panel: ${p.name}.`)}}
 const panels=selected.filter(p=>p.category==='PANEL FOTOVOLTAICO').reduce((s,p)=>s+q.quantities[p.id],0);
 const kwp=selected.filter(p=>p.category==='PANEL FOTOVOLTAICO').reduce((s,p)=>s+(p.watts||0)*q.quantities[p.id]/1000,0);
 if(!panels){complete=false;warnings.push('Selecciona al menos un panel.');}
 if(!selected.some(p=>p.category.includes('INVERSOR'))){complete=false;warnings.push('Selecciona un inversor.');}
 if(q.system==='OFF GRID'&&!selected.some(p=>p.category.includes('BATER'))){complete=false;warnings.push('Selecciona almacenamiento para el sistema Off Grid.');}
 const installProducts=products.filter(p=>p.system===q.system&&isInstallation(p));
 if(installProducts.length>1)throw Error('Debe existir una sola tarifa de instalación por sistema.');
 const unitInstall=installProducts[0];
 const install=installationRates.find(i=>i.panels===panels);
 const perPanel=q.installationOverride===null&&!!unitInstall;
 let installationPrice=q.installationOverride??(unitInstall?unitInstall.price:install?.price)??null;
 if(q.installationOverride!==null&&!q.installationNote.trim()){complete=false;warnings.push('Indica el motivo del valor manual de instalación.');}
 if(installationPrice===null){complete=false;warnings.push(unitInstall?'Falta precio por panel del servicio de instalación.':`No existe tarifa de instalación para ${panels} paneles. Ingresa un valor validado.`);}
 // Catalog unit prices follow taxMode. Legacy table totals and manual totals
 // already include VAT; never add the workbook's tax or margin factor twice.
 if(installationPrice!==null&&settings.taxMode==='net'&&!perPanel)installationPrice/=1+settings.taxRate/100;
 lines.push({id:'installation',name:'Servicio de instalación',qty:perPanel?panels:1,unit:perPanel?'panel':'servicio',price:installationPrice,total:installationPrice===null?null:Math.round(installationPrice*(perPanel?panels:1)),source:q.installationOverride!==null?'Valor total manual: '+q.installationNote:unitInstall?.source||install?.source||'Sin tarifa',category:'INSTALACIÓN'});
 if(q.extra>0){lines.push({id:'extra',name:q.extraLabel||'Costos adicionales',qty:1,unit:'servicio',price:q.extra,total:Math.round(q.extra),source:'Ingreso del ejecutivo',category:'ADICIONALES'});if(!q.extraLabel.trim())warnings.push('Describe qué cubren los costos adicionales.');}
 const subtotal=lines.reduce((s,l)=>s+(l.total??0),0);
 if(q.discountPercent===undefined&&q.discount>subtotal){complete=false;warnings.push('El descuento supera el subtotal.');}
 const discount=q.discountPercent!==undefined?Math.round(subtotal*q.discountPercent/100):Math.min(subtotal,Math.round(q.discount));
 if(q.discountPercent===undefined&&q.discount>0){complete=false;warnings.push('Convierte el descuento anterior a un porcentaje entero entre 0 y 30%.');}
 const base=subtotal-discount;
 const tax=settings.taxMode==='pending'?null:settings.taxMode==='net'?Math.round(base*settings.taxRate/100):base-Math.round(base/(1+settings.taxRate/100));
 const total=settings.taxMode==='net'?base+(tax||0):base;
 const net=settings.taxMode==='included'?base-(tax||0):base;
 if(settings.taxMode==='pending')warnings.push('Confirmar si los precios del Excel incluyen IVA. No se ha agregado IVA a los valores de origen.');
 if(q.proposalType!=='preliminary'&&!q.technicalReviewed)warnings.push('Pendiente de revisión técnica: modelos, compatibilidad, estructura y alcance.');
 if(!settings.approved||!settings.legal||!settings.rut||!settings.terms||!settings.warranty)warnings.push('Faltan datos y condiciones comerciales aprobados de la empresa.');
 if(!consumptionSummary(q.energy))warnings.push('Ingresa el consumo en kWh y los días del período de la boleta.');
 else if(!q.energy?.billReviewed)warnings.push('Verifica los datos energéticos con la boleta del cliente.');
 if(!q.customer.name.trim()||!q.customer.email||!q.customer.phone.trim()||!q.customer.region.trim()||!q.customer.commune.trim()||q.customer.bill<=0)warnings.push('Completa los datos del cliente y su monto de boleta.');
 if(q.adviserId&&!settings.advisers?.some(a=>a.id===q.adviserId))warnings.push('Selecciona un comercial vigente para esta propuesta.');
 return {lines,panelWatts:selected.filter(p=>p.category==='PANEL FOTOVOLTAICO').map(p=>p.watts??0),panels,kwp,subtotal,discount,net,tax,total,warnings,complete,official:complete&&warnings.length===0};
}

// A changed installation address invalidates both geocoded and manually entered coordinates.
export function mergeQuotePatch(quote:QuoteInput,patch:Partial<QuoteInput>):QuoteInput{
  const next={...quote,...patch,technicalReviewed:patch.technicalReviewed??false};
  if(patch.customer&&(['address','commune','region'] as const).some(key=>patch.customer![key]!==quote.customer[key])&&next.energy){
    next.energy={...next.energy,latitude:null,longitude:null};
  }
  return next;
}
