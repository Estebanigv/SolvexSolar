import assert from 'node:assert/strict';
import {customerReviewKey,needsCustomerReview} from '../lib/customer-review';
import {newQuote} from '../lib/quote';
const customer={...newQuote().customer,name:'Cliente de prueba',address:'Calle 123',commune:'Chillán',region:'Ñuble'};
const documents=[{id:'file-1',rotation:0}];
const accepted=customerReviewKey(customer,documents,1);
assert.equal(needsCustomerReview(accepted,null),true);
assert.equal(needsCustomerReview(accepted,accepted),false);
assert.equal(needsCustomerReview(customerReviewKey(customer,[],null),null),false,'El ingreso manual no requiere revisión de boleta');
for(const key of ['name','email','phone','address','commune','region','bill'] as const){
  const changed={...customer,[key]:key==='bill'?10000:'Corrección'};
  assert.equal(needsCustomerReview(customerReviewKey(changed,documents,1),accepted),true,`Volver a revisar ${key}`);
}
assert.equal(needsCustomerReview(customerReviewKey(customer,[{id:'file-2'}],1),accepted),true);
assert.equal(needsCustomerReview(customerReviewKey(customer,[{id:'file-1',rotation:90}],1),accepted),true);
assert.equal(needsCustomerReview(customerReviewKey(customer,documents,2),accepted),true);
assert.equal(needsCustomerReview(customerReviewKey(customer,documents,null),accepted),true,'Relectura o cancelación invalida revisión');
console.log('Cliente leído: revisión, correcciones, documentos nuevos y relectura: OK');
