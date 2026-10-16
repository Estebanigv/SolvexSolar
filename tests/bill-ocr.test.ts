import assert from 'node:assert/strict';
import {billOcrScore,billDetailRegions,mergeBillDetailTexts,needsBillDetailPass} from '../lib/bill-ocr';
import {extractBill} from '../lib/bill-extraction';
const full='Titular: Persona Ficticia\nDirección de suministro: Calle Ejemplo 100, Temuco\nTotal a pagar $ 80.000';
assert.equal(needsBillDetailPass([full]),true);
assert.equal(needsBillDetailPass(['boleta total pagar consumo '.repeat(30)]),true,'Keywords alone do not mean successful reading');
const complete=mergeBillDetailTexts(full,['Electricidad consumida (321 kWh)']);
assert.equal(extractBill(complete).values.consumptionKwh,'321');
assert.equal(needsBillDetailPass(complete),false);
assert.equal(extractBill(complete).values.name,'Persona Ficticia');
const corrupted=mergeBillDetailTexts(full,['Titular: Otra Persona\nTotal a pagar $ 90.000']);
assert.deepEqual(corrupted,[full],'Cropped OCR cannot replace readable full-page fields');
const conflict=mergeBillDetailTexts(full,['Consumo facturado: 321 kWh','Consumo facturado: 891 kWh']);
assert.equal(extractBill(conflict).values.consumptionKwh,undefined,'Conflicting fallback values require manual review');
assert.equal(extractBill(mergeBillDetailTexts(full,['Potencia conectada: 9,9 kW\nConsumo de referencia: 400 kWh'])).values.consumptionKwh,undefined);
assert.ok(billOcrScore(full)>billOcrScore('boleta total consumo '.repeat(100)));
for(const r of billDetailRegions){assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=1&&r.y+r.height<=1);}
for(let x=0;x<=10;x++)for(let y=0;y<=10;y++)assert.ok(billDetailRegions.some(r=>x/10>=r.x&&x/10<=r.x+r.width&&y/10>=r.y&&y/10<=r.y+r.height),'All image edges covered');
console.log('OCR por secciones: campos faltantes, datos originales, conflictos, unidades y cobertura: OK');
