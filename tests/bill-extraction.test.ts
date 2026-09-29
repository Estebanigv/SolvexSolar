import assert from 'node:assert/strict';
import {extractBill,applyBillValues,billNumber,autoFillBill,clearAutomaticBillValues} from '../lib/bill-extraction';
import {consumptionSummary} from '../lib/energy';
import {newQuote} from '../lib/quote';
// Synthetic fixtures only. Never commit customer bills or OCR transcripts.
const front=`COPELEC\nSr. (a) Cliente Ejemplo (Cliente)\nDirección de suministro: Calle Ejemplo 123\nDepto 4 Ciudad Prueba\nTipo de tarifa contratada: BT1\nFecha de emisión: 15 Ago 2026\nMonto del período 10 Junio - 10 Julio\nTotal a pagar\n$ 150.000\nE-mail de aviso: pagos@empresa.example\nAtención 800 100 200`;
const back=`Consumo total del mes =\n420 kWh\nAnterior 25.000 kWh\nActual 25.420 kWh\nElectricidad consumida 420 kWh\nTotal Boleta 150.000`;
const extraction=extractBill([front,back]);
assert.equal(extraction.values.consumptionKwh,'420');
assert.equal(extraction.values.bill,'150000');
assert.equal(extraction.values.billingDays,'30');
assert.equal(extraction.values.tariff,'BT1');
assert.equal(extraction.values.name,'Cliente Ejemplo');
assert.equal(extraction.values.commune,'Ciudad Prueba');
assert.equal(extraction.values.address,'Calle Ejemplo 123 Depto 4 Ciudad Prueba');
assert.equal(extractBill(['Lectura actual 12345 kWh\nAnterior 12000 kWh']).values.consumptionKwh,undefined);
assert.equal(extractBill([back,'Consumo total del mes = 800 kWh']).values.consumptionKwh,undefined);
assert.equal(extractBill([front,'Total a pagar $ 190.000']).values.bill,undefined);
assert.equal(extractBill(['Días facturados: 0']).values.billingDays,undefined);
assert.equal(extractBill(['Período de lectura: 20/12/2025 - 20/01/2026']).values.billingDays,'31');
assert.equal(extractBill(['Período de lectura: 31/02/2026 - 05/03/2026']).values.billingDays,undefined);
assert.equal(billNumber('1.250,5'),1250.5);assert.equal(billNumber('221.494'),221494);assert.equal(billNumber('785'),785);assert.equal(billNumber('NaN'),null);
assert.equal(billNumber('1,250'),1.25);
const quote=newQuote();quote.customer.name='Nombre existente';quote.customer.email='cliente@example.com';
const patch=applyBillValues(quote,{consumptionKwh:'420',billingDays:'30'});
assert.equal(patch.customer?.name,'Nombre existente');assert.equal(patch.customer?.email,'cliente@example.com');assert.equal(patch.energy?.billReviewed,false);
assert.throws(()=>applyBillValues(quote,{billingDays:'0'}));assert.throws(()=>applyBillValues(quote,{bill:'-4'}));assert.throws(()=>applyBillValues(quote,{name:''}));
const auto=autoFillBill(newQuote(),extraction);
const filled={...newQuote(),...auto.patch};
assert.equal(filled.customer.name,'Cliente Ejemplo');
assert.equal(filled.customer.bill,150000);
assert.deepEqual(consumptionSummary(filled.energy),{dailyKwh:14,equivalent30DaysKwh:420});
assert.equal(filled.energy?.billReviewed,false,'Automatic reading does not certify OCR accuracy');
assert.deepEqual(new Set(auto.result.autoApplied),new Set(['name','address','commune','bill','consumptionKwh','billingDays','distributor','tariff']));
const protectedInput=autoFillBill(quote,extraction);
assert.equal(protectedInput.patch.customer?.name,'Nombre existente');
assert.equal(protectedInput.patch.customer?.email,'cliente@example.com');
assert.ok(protectedInput.result.preserved?.includes('name'));
const reread=autoFillBill(filled,{...extraction,values:{...extraction.values,consumptionKwh:'600'}},auto.automatic);
assert.equal(reread.patch.energy?.consumptionKwh,600,'Rereading refreshes owned values');
const edited={...filled,customer:{...filled.customer,name:'Nombre corregido'}};
assert.equal(autoFillBill(edited,extraction,auto.automatic).patch.customer?.name,'Nombre corregido');
const cleared=clearAutomaticBillValues(edited,auto.automatic);
assert.equal(cleared.customer?.name,'Nombre corregido');
assert.equal(cleared.customer?.bill,0);
assert.equal(cleared.energy?.consumptionKwh,null);
assert.equal(cleared.energy?.billingDays,null);
const invalidAuto=autoFillBill(newQuote(),{values:{billingDays:'900',name:'Lectura parcial'},warnings:[],evidence:{}});
assert.equal(invalidAuto.patch.customer?.name,'Lectura parcial');
assert.equal(invalidAuto.patch.energy?.billingDays,null);
assert.ok(invalidAuto.result.warnings.some(w=>w.includes('no es válido')));
const explicitContacts=extractBill(['Correo del cliente: persona@example.com\nTeléfono del cliente: +56 9 1111 2222\nE-mail de aviso: pagos@empresa.example']);
assert.equal(explicitContacts.values.email,'persona@example.com');
assert.equal(explicitContacts.values.phone,'+56 9 1111 2222');
assert.equal(extraction.values.email,undefined);
assert.equal(extraction.values.phone,undefined);
const differentClients=extractBill(['Titular: Persona Uno','Titular: Persona Dos']);
assert.equal(differentClients.values.name,undefined);
const differentPeriods=extractBill(['Días facturados: 30','Días facturados: 60']);
assert.equal(differentPeriods.values.billingDays,undefined);
// Anonymized layout regression: EEPA legal name, municipality in address and arrears.
const eepaFront=`EMPRESA ELÉCTRICA PUENTE ALTO S.A
CASA MATRIZ: Calle Oficina 100, Santiago.
Sr. (a) PERSONA DE PRUEBA
Dirección de envío: CALLE FICTICIA 321 , PUENTE ALTO
Dirección de suministro: CALLE FICTICIA 321 , PUENTE ALTO
Tipo de tarifa contratada: BT1
Consumo de referencia: 304 Kwh
Total a pagar $ 207.850
Monto del Periodo 25/08/2026 - 24/09/2026, incluye saldo anterior.
Último pago vía Pago Pagina Web Eepa`;
const eepaBack=`Período de lectura: 25/08/2026 - 24/09/2026 Fecha estimada próxima lectura 24/10/2026
Electricidad consumida 369 Kwh $ 89.862
Actual 2443
Anterior 2074
Consumo total del mes = 369 kWh
Total Boleta $ 102.009
Saldo Anterior $ 105.850
Total a pagar $ 207.850`;
const eepa=extractBill([eepaFront,eepaBack]);
assert.equal(eepa.values.commune,'Puente Alto');
assert.equal(eepa.values.distributor,'EEPA');
assert.equal(eepa.values.bill,'207850');
assert.equal(eepa.values.consumptionKwh,'369');
assert.equal(eepa.values.billingDays,'30');
assert.equal(eepa.values.region,'Metropolitana de Santiago');
assert.equal(eepa.values.address,'CALLE FICTICIA 321');
assert.ok(eepa.evidence.region?.includes('SUBDERE'));
assert.equal(eepa.values.email,undefined);
assert.ok(eepa.warnings.some(w=>w.includes('incluye saldo anterior')));
assert.equal(extractBill([eepaFront]).values.billingDays,'30');
assert.equal(extractBill([eepaFront,eepaBack.replace('Total a pagar $ 207.850','')]).values.bill,'207850');
assert.equal(extractBill([eepaFront,'Total a pagar $ 300.000']).values.bill,undefined);
assert.equal(extractBill(['Total Boleta $ 40.000']).values.bill,'40000');
assert.equal(extractBill(['CASA MATRIZ: Calle Oficina 100, Santiago.']).values.commune,undefined);
assert.equal(extractBill(['EEPA y CGE']).values.distributor,undefined);
const location=extractBill(['Dirección de suministro: AVENIDA EJEMPLO 42, CHILLAN VIEJO']);
assert.equal(location.values.commune,'Chillán Viejo');
assert.equal(location.values.region,'Ñuble');
assert.equal(location.values.address,'AVENIDA EJEMPLO 42');
assert.equal(extractBill(['Dirección de suministro: CALLE 44 PUENTE ALTO']).values.region,'Metropolitana de Santiago');
assert.equal(extractBill(['Comuna: Temuco']).values.region,'La Araucanía');
assert.equal(extractBill(['Comuna: Puente Alto\nRegión: RM']).values.region,'Metropolitana de Santiago');
const wrongRegion=extractBill(['Comuna: Puente Alto\nRegión: Valparaíso']);
assert.equal(wrongRegion.values.region,undefined);
assert.ok(wrongRegion.warnings.some(w=>w.includes('no corresponde')));
const mixedPlaces=extractBill(['Comuna: Puente Alto','Comuna: Chillán']);
assert.equal(mixedPlaces.values.commune,undefined);
assert.equal(mixedPlaces.values.region,undefined);
assert.equal(extractBill(['Dirección de suministro: AVENIDA SANTIAGO 42']).values.commune,undefined);
assert.equal(extractBill(['Sucursal: CALLE 100, PUENTE ALTO']).values.region,undefined);
// Synthetic Enel layout: abbreviated label, grave accent, hyphenated commune, parentheses.
const enel=extractBill([`www.enel.cl
Sr. (a) Persona de Prueba
Dirección de envìo: CALLE POSTAL 500 - COLINA
Dirección suministro: CALLE FICTICIA S/N MZN 31 D - COLINA
Ruta: 100-0000
Tipo de tarifa contratada: BT1-T1
Total a pagar: $ 172.336`, `Electricidad Consumida (660kWh) $ 155.314
Período de lectura:08/08/2026 - 07/09/2026
Actual 28693,000
Anterior -28033,000
Consumo total del periodo= 660 kWh
Total a pagar $172.336`]);
assert.equal(enel.values.address,'CALLE FICTICIA S/N MZN 31 D');
assert.equal(enel.values.commune,'Colina');
assert.equal(enel.values.region,'Metropolitana de Santiago');
assert.equal(enel.values.distributor,'ENEL');
assert.equal(enel.values.consumptionKwh,'660');
assert.equal(enel.values.billingDays,'30');
assert.equal(enel.values.bill,'172336');
assert.equal(enel.values.tariff,'BT1-T1');
assert.equal(extractBill(['Dirección de envìo: CALLE FICTICIA S/N - COLINA']).values.address,'CALLE FICTICIA S/N');
assert.equal(extractBill(['Electricidad Consumida (660 kWh)']).values.consumptionKwh,'660');
assert.equal(extractBill(['Consumo total del período= 660 kWh']).values.consumptionKwh,'660');
assert.equal(extractBill(['Consumo de referencia: 500 kWh']).values.consumptionKwh,undefined);
console.log('Lectura de boletas: campos, fechas, conflictos, datos existentes y revisión: OK');
