import assert from 'node:assert/strict';
import {electricityDistributors,detectElectricityDistributor} from '../lib/electricity-distributors';
import {extractBill,autoFillBill,applyBillValues} from '../lib/bill-extraction';
import {newQuote} from '../lib/quote';
import {consumptionSummary} from '../lib/energy';

// Synthetic fixtures exercise recognition, not a claim of verified supplier PDF layouts.
for(const provider of electricityDistributors){
 for(const alias of [provider.name,...provider.aliases]){
  const result=extractBill([`${alias}\nSeñor(a) Persona de ejemplo\nDirección de suministro: Calle Ejemplo 100, Santiago\nConsumo facturado (kWh): 420\nDías de consumo: 30\nTarifa: BT1\nTotal a pagar $ 84.000`]);
  assert.equal(result.values.distributor,provider.name,alias);
  assert.equal(result.values.consumptionKwh,'420',alias);
  const quote={...newQuote(),...autoFillBill(newQuote(),result).patch};
  assert.deepEqual(consumptionSummary(quote.energy),{dailyKwh:14,equivalent30DaysKwh:420});
  assert.equal(quote.energy?.billReviewed,false);
  assert.equal(quote.customer.commune,'Santiago');
 }
}
assert.equal(detectElectricityDistributor('ENELSA').name,'ENELSA','Do not match ENEL inside ENELSA');
assert.equal(detectElectricityDistributor('Distribuidora: Frontel\nGrupo SAESA').name,'FRONTEL','Explicit issuer takes priority over group branding');
assert.equal(detectElectricityDistributor('SAESA\nFRONTEL').ambiguous,true);
assert.equal(detectElectricityDistributor('Distribuidora: CGE\nDistribuidora: EEPA').ambiguous,true);
assert.equal(detectElectricityDistributor('CGE\nCompañía General de Electricidad S.A.').name,'CGE');
for(const place of ['Colina','Tiltil','Litoral','Mataquito']){
 assert.equal(detectElectricityDistributor(`Dirección de suministro: ${place} 123\nComuna: ${place}`).name,undefined);
}
const other=extractBill(['Distribuidora: Cooperativa Ficticia de Prueba\nConsumo del período: 600 kWh\nDías facturados: 30']);
assert.equal(other.values.distributor,'Cooperativa Ficticia de Prueba');
const patch=applyBillValues(newQuote(),other.values);
assert.equal(patch.energy?.distributor,'Cooperativa Ficticia de Prueba');
assert.deepEqual(consumptionSummary(patch.energy),{dailyKwh:20,equivalent30DaysKwh:600});
assert.equal(extractBill(['Consumo facturado (kWh): 420\nConsumo mensual: 650 kWh']).values.consumptionKwh,undefined);
assert.equal(extractBill(['Consumo de referencia (kWh): 420\nLectura actual: 420 kWh\nConsumo mensual promedio: 420 kWh']).values.consumptionKwh,undefined);
assert.equal(extractBill(['Consumo facturado (kWh): 420\nConsumo del período: 420 kWh']).values.consumptionKwh,'420');
assert.ok(extractBill(['Boleta ilegible']).warnings.some(w=>w.includes('No se identificó la distribuidora')));
console.log('Distribuidoras: catálogo, alias, cooperativas, otros emisores, ambigüedad, consumo y edición manual: OK');
