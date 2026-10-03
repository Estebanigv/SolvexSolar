import type {SavedQuote} from './quote';
import {proposalTitle} from './commercial';

export function isIssued(q:SavedQuote){return !!q.issuedAt&&/^SVX-\d{4}-\d{6,}$/.test(q.folio);}
export function documentTitle(q:SavedQuote){return isIssued(q)?'COTIZACIÓN':proposalTitle(q.input,q.id!=='draft'&&q.calculation.official);}
export function issuanceProblems(q:SavedQuote):string[]{
 const problems:string[]=[];
 if(!q.input.customer.name.trim())problems.push('Completa el nombre del cliente.');
 if(!q.input.customer.email.trim()&&!q.input.customer.phone.trim())problems.push('Completa el correo o teléfono del cliente.');
 if(!q.calculation.complete||!Number.isFinite(q.calculation.total)||q.calculation.total<=0)problems.push('Completa los equipos, sus precios y la instalación para emitir un total válido.');
 if(q.calculation.tax===null||q.settings.taxMode==='pending')problems.push('Confirma el tratamiento del IVA en Empresa.');
 if(q.input.proposalType!=='preliminary'&&!q.calculation.official)problems.push('Completa las validaciones de la cotización final o selecciona una propuesta sujeta a visita técnica.');
 return problems;
}
