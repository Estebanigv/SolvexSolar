import type {SavedQuote} from './quote';
import {issuanceProblems} from './quote-issuance';
import {consumptionSummary} from './energy';

export type QuoteIssue={id:string;message:string;tab:'quote'|'settings'|'catalog';step:'customer'|'system'|'installation'|'review';field:string;productId?:string};
export const issueLocation=(issue:QuoteIssue)=>issue.tab==='settings'?'Empresa':issue.tab==='catalog'?'Equipos y precios':({customer:'1 · Cliente y boleta',system:'2 · Equipos',installation:'3 · Instalación',review:'4 · Revisión y envío'})[issue.step];

// UI guidance for the existing issuance rules. It does not relax server checks.
export function quoteValidationIssues(q:SavedQuote):QuoteIssue[]{
 const issues:QuoteIssue[]=[],input=q.input,c=q.calculation,s=q.settings;
 const add=(id:string,message:string,step:QuoteIssue['step'],field:string,tab:QuoteIssue['tab']='quote',productId?:string)=>{if(!issues.some(i=>i.id===id))issues.push({id,message,step,field,tab,productId})};
 const customer=(key:keyof typeof input.customer,message:string,field:string)=>add('customer-'+key,message,'customer',field);
 if(!input.customer.name.trim())customer('name','Completa el nombre y apellido del cliente.','Nombre y apellido');
 if(!input.customer.email.trim()&&!input.customer.phone.trim())customer('email',input.proposalType==='preliminary'?'Completa un correo o teléfono de contacto.':'Completa el correo electrónico del cliente.','Correo electrónico');
 if(input.customer.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer.email))customer('email','Corrige el correo electrónico del cliente.','Correo electrónico');
 if(c.tax===null||s.taxMode==='pending')add('tax','Confirma si los precios incluyen IVA.','review','Precios del catálogo e IVA','settings');
 const final=input.proposalType!=='preliminary'&&!c.official;
 if(final){
  if(!input.customer.email.trim())customer('email','Completa el correo electrónico del cliente.','Correo electrónico');
  if(!input.customer.phone.trim())customer('phone','Completa el teléfono del cliente.','Teléfono con código de país');
  if(!input.customer.region.trim())customer('region','Selecciona la región del cliente.','Región');
  if(!input.customer.commune.trim())customer('commune',input.customer.region.trim()?'Selecciona la comuna del cliente.':'Selecciona primero la región y luego la comuna.',input.customer.region.trim()?'Comuna':'Región');
  if(input.customer.bill<=0)customer('bill','Ingresa el monto de la boleta del cliente.','Monto de la boleta (CLP)');
  if(input.energy?.consumptionKwh==null)add('consumption','Ingresa el consumo de la boleta en kWh.','customer','Consumo de la boleta (kWh)');
  if(input.energy?.billingDays==null)add('billing-days','Ingresa los días del período facturado.','customer','Días del período facturado');
  if(!input.energy?.billReviewed)add('bill-review','Verifica los datos energéticos y marca la revisión de la boleta.','customer',consumptionSummary(input.energy)?'Verifiqué estos datos en la boleta del cliente.':input.energy?.consumptionKwh==null?'Consumo de la boleta (kWh)':'Días del período facturado');
  if(!input.technicalReviewed)add('technical','Confirma la revisión técnica de modelos, compatibilidad, estructura y alcance.','review','El comercial y el instalador revisaron modelos, compatibilidad, estructura y alcance tras la visita técnica.');
  for(const [key,label] of [['legal','Razón social'],['rut','RUT'],['terms','Condiciones de pago, inclusiones y exclusiones'],['warranty','Garantías de equipos e instalación']] as const)if(!s[key]?.trim())add('settings-'+key,'Completa '+label.toLocaleLowerCase('es')+' de la empresa.','review',label,'settings');
  if(!s.approved)add('settings-approved','Confirma la aprobación de los datos, precios y condiciones de la empresa.','review','La empresa ha aprobado estos datos, precios y condiciones.','settings');
  if(input.adviserId&&!s.advisers?.some(a=>a.id===input.adviserId))add('adviser','Selecciona un comercial vigente.','review','Comercial asignado');
 }
 if(!c.complete||final){
  if(!c.panels)add('panels','Selecciona al menos un panel fotovoltaico.','system','Panel fotovoltaico');
  if(!c.lines.some(l=>l.qty>0&&l.category.includes('INVERSOR')))add('inverter','Selecciona un inversor.','system','equipment-inverter');
  if(input.system==='OFF GRID'&&!c.lines.some(l=>l.qty>0&&l.category.includes('BATER')))add('battery','Selecciona almacenamiento para el sistema Off Grid.','system','equipment-battery');
  for(const l of c.lines){
   if(l.id==='installation'&&l.total===null)add('installation-rate',`Falta una tarifa de instalación para ${c.panels} paneles. Ingresa un total manual aprobado.`,'installation','Usar ajuste manual de instalación (opcional)');
   else if(l.price===null&&!l.id.startsWith('custom:'))add('price-'+l.id,'Completa el precio de '+l.name+'.','system','Precio unitario (CLP)','catalog',l.id);
   if(l.unit.includes('confirmar'))add('unit-'+l.id,'Confirma la unidad de cobro de '+l.name+'.','system','Unidad de cobro','catalog',l.id);
   if(['panel','unidad'].includes(l.unit)&&!Number.isInteger(l.qty))add('quantity-'+l.id,'Ingresa una cantidad entera para '+l.name+'.','system','Cantidad '+l.category);
  }
  if(input.installationOverride!==null&&!input.installationNote.trim())add('installation-note','Indica el motivo y la aprobación del valor manual de instalación.','installation','Motivo y aprobación');
  for(const [index,service] of (input.customServices??[]).entries())if(service.quantity>0){
   if(!service.name.trim())add('service-name-'+service.id,`Describe el servicio adicional ${index+1}.`,'installation',`Descripción del servicio adicional ${index+1}`);
   if(service.price===null)add('service-price-'+service.id,`Ingresa el precio de ${service.name||'servicio adicional '+(index+1)}.`,'installation',`Precio del servicio adicional ${index+1}`);
  }
  if(input.extra>0&&!input.extraLabel.trim())add('extra','Describe los otros costos incluidos.','installation','Detalle de otros costos');
  if(input.discountPercent===undefined&&input.discount>0)add('discount','Convierte el descuento a un porcentaje entero entre 0 y 30.','installation','Descuento (%)');
  for(const warning of c.warnings){
   if(warning.startsWith('Falta potencia del panel:')){const line=c.lines.find(l=>warning.includes(l.name));if(line)add('watts-'+line.id,warning,'system','Potencia (Wp)','catalog',line.id)}
   if(warning.includes('TE1')&&warning.includes('TE4'))add('certification',warning,'installation','certifications');
  }
 }
 if(!Number.isFinite(c.total)||c.total<=0)add('total','Revisa el importe final: debe ser mayor que cero.','review','final-total');
 const blockers=issuanceProblems(q);
 if(blockers.some(p=>p.includes('TE1')&&p.includes('TE4')))add('certification',blockers.find(p=>p.includes('TE1'))!,'installation','certifications');
 // Unrecognized legacy states remain actionable without pretending they are valid.
 if(blockers.length&&!issues.length)add('review','Revisa los datos de esta versión y vuelve a preparar la propuesta.','review','Tipo de propuesta');
 return issues;
}
