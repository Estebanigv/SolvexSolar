import type {SavedQuote} from './quote';
import {hasCertificationConflict,certificationConflictMessage} from './additional-services';

export function isIssued(q:SavedQuote){return !!q.issuedAt&&/^SVX-\d{4}-\d{6,}$/.test(q.folio);}
export function documentTitle(q:SavedQuote){return isIssued(q)?(q.issuanceWarnings?.length?'COTIZACIÓN CON PENDIENTES':'COTIZACIÓN'):q.input.proposalType==='preliminary'?'PRECOTIZACIÓN':'PROPUESTA DE COTIZACIÓN';}
export function documentFolio(q:SavedQuote){return /borrador/i.test(q.folio)?'':q.folio;}
// These are invalid/incompatible values, not missing optional information.
export function issuanceProblems(q:SavedQuote):string[]{
 const problems:string[]=[];
 if(hasCertificationConflict(q.calculation.lines.filter(line=>line.qty>0)))problems.push(certificationConflictMessage);
 if(!q.input.customer.name.trim())problems.push('Completa el nombre del cliente.');
 if(!Number.isFinite(q.calculation.total)||q.calculation.total<=0)problems.push('El importe debe ser mayor que cero.');
 return problems;
}
// Keep these messages aligned with private.quote_issuance_warnings(jsonb).
export function issuanceWarnings(q:SavedQuote):string[]{
 const warnings=[...q.calculation.warnings];
 if(!q.input.customer.email.trim()&&!q.input.customer.phone.trim())warnings.push('Falta correo o teléfono de contacto del cliente.');
 if(!q.calculation.complete)warnings.push('Equipamiento o precios pendientes de completar. El importe es parcial y está sujeto a revisión.');
 if(q.calculation.tax===null||q.settings.taxMode==='pending')warnings.push('Tratamiento del IVA pendiente de confirmar.');
 if(q.input.proposalType!=='preliminary'&&!q.calculation.official)warnings.push('Validaciones finales pendientes. Esta emisión no constituye una aprobación técnica.');
 return [...new Set(warnings.filter(Boolean))];
}
export function issuedWarnings(q:SavedQuote):string[]{return isIssued(q)?q.issuanceWarnings??[]:[];}
