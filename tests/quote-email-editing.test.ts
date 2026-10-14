import assert from 'node:assert/strict';
import {calculate,newQuote,initialProducts,initialSettings,quoteSchema,mergeQuotePatch} from '../lib/quote';
import {calculateEditingQuote,editableQuoteSchema} from '../lib/quote-editing';
import {invalidCustomerEmail} from '../lib/customer-email';
import {persistentQuote} from '../lib/quote-persistence';
import {quoteValidationIssues} from '../lib/quote-validation';
import {workflowReadiness} from '../lib/workflow';
const input={...newQuote(),customer:{...newQuote().customer,name:'Cliente de prueba',phone:'+56911111111',region:'Metropolitana',commune:'Santiago'},discountPercent:10,finalTotalOverride:4200000,notes:'Conservar observaciones',installationOverride:750000,installationNote:'Aprobado'};
const settings={...initialSettings,taxMode:'included' as const};
const baseline=calculateEditingQuote(input,initialProducts,settings);
const valid='nombre.apellido@empresa.cl';
const values=[...Array.from({length:valid.length+1},(_,i)=>valid.slice(0,i)),'nombre..apellido@empresa.cl','nombre@empresa.cl.',' nombre@empresa.cl ','','nombre@'];
for(const email of values){
 const edited=mergeQuotePatch(input,{customer:{...input.customer,email}});
 const before=JSON.stringify(edited);
 const result=calculateEditingQuote(edited,initialProducts,settings);
 for(const key of ['panels','kwp','subtotal','discount','net','tax','total','totalAdjustment'] as const)assert.equal(result[key],baseline[key],`No reiniciar ${key} al escribir ${email}`);
 assert.deepEqual(result.lines,baseline.lines);
 assert.equal(JSON.stringify(edited),before,'No mutar la cotización original');
 const recovered=editableQuoteSchema.parse(JSON.parse(JSON.stringify(persistentQuote(edited))));
 assert.equal(recovered.customer.email,email,'Recuperar incluso el correo incompleto');
 assert.deepEqual(recovered.quantities,input.quantities);
 assert.equal(recovered.notes,input.notes);
 assert.equal(recovered.finalTotalOverride,input.finalTotalOverride);
 assert.equal(quoteSchema.safeParse(edited).success,!invalidCustomerEmail(email),'Formulario y servidor usan el mismo validador');
 if(invalidCustomerEmail(email)){
  assert.throws(()=>calculate(edited,initialProducts,settings),'No relajar el contrato del servidor');
  assert.equal(workflowReadiness(edited,initialProducts,result).customer,false);
  assert.ok(quoteValidationIssues({id:'draft',folio:'',date:'',input:edited,settings,calculation:result}).some(issue=>issue.id==='customer-email'));
 }
}
assert.equal(quoteSchema.parse({...input,customer:{...input.customer,email:' nombre@empresa.cl '}}).customer.email,'nombre@empresa.cl');
assert.equal(editableQuoteSchema.safeParse({...input,quantities:{panel:-1}}).success,false,'No relajar otros datos del borrador');
console.log('Correo: cálculo estable al escribir, validación coherente y recuperación de borradores: OK');
