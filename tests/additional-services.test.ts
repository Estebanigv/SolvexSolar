import assert from 'node:assert/strict';
import {calculate,initialProducts,initialSettings,newQuote,quoteSchema,type Product,type SavedQuote} from '../lib/quote';
import {requiredMaterial,isLinearDrop,isLinearService,serviceQuantity,equipmentCategories,requiredServiceQuantities,certificationType,serviceQuantities} from '../lib/additional-services';
import {issuanceProblems} from '../lib/quote-issuance';
import {workflowReadiness} from '../lib/workflow';
const settings={...initialSettings,taxMode:'included' as const};
const te1=initialProducts.find(p=>p.system==='ON GRID'&&certificationType(p)==='TE1')!;
const te4=initialProducts.find(p=>p.system==='ON GRID'&&certificationType(p)==='TE4')!;
assert.ok(te1&&te4);
let quote=newQuote();
quote={...quote,quantities:serviceQuantities(quote,initialProducts,te1,1)};
assert.equal(quote.quantities[te1.id],1);assert.equal(quote.quantities[te4.id],0);
let calculation=calculate(quote,initialProducts,settings);
assert.ok(!calculation.lines.some(l=>l.id===te4.id));
quote={...quote,quantities:serviceQuantities(quote,initialProducts,te4,2)};
assert.equal(quote.quantities[te1.id],0);assert.equal(quote.quantities[te4.id],2);
quote={...quote,quantities:serviceQuantities(quote,initialProducts,te4,0)};
assert.equal(quote.quantities[te1.id],0);assert.equal(quote.quantities[te4.id],0);
const both={...quote,quantities:{...quote.quantities,[te1.id]:1,[te4.id]:1}};
assert.throws(()=>calculate(both,initialProducts,settings),/TE1 o TE4/);
assert.equal(certificationType({name:'T1 trifásico',category:'Servicios'}),'TE1');
assert.equal(certificationType({name:'Inscripción SEC TE4 trifásico + netbilling',category:'Servicios'}),'TE4');
assert.equal(certificationType({name:'Modelo TE10',category:'Servicios'}),null);
for(const system of ['ON GRID TRIFASICO','OFF GRID','HIBRIDO','HIBRIDO TRIFASICO'] as const){
 const a={...te1,id:'a',system},b={...te4,id:'b',system};
 const q={...newQuote(),system,quantities:{b:1,other:5}};
 assert.deepEqual(serviceQuantities(q,[a,b],a,1),{a:1,b:0,other:5});
}
const service={id:'e68c2f09-1234-4234-8234-123456789abc',name:'Retiro de escombros',quantity:2,price:50000};
const base=calculate(quote,initialProducts,settings);
const custom={...quote,customServices:[service]};
calculation=calculate(custom,initialProducts,settings);
assert.equal(calculation.total-base.total,100000);
assert.equal(calculation.lines.find(l=>l.id===`custom:${service.id}`)?.total,100000);
assert.equal(calculate({...custom,discountPercent:10},initialProducts,settings).discount,Math.round(calculation.subtotal*.1));
const net=calculate(custom,initialProducts,{...settings,taxMode:'net'}),netBase=calculate(quote,initialProducts,{...settings,taxMode:'net'});
assert.equal(net.calculatedTotal!-netBase.calculatedTotal!,119000);
assert.deepEqual(quoteSchema.parse(JSON.parse(JSON.stringify(custom))).customServices,[service]);
assert.equal(calculate({...custom,customServices:[{...service,quantity:0}]},initialProducts,settings).total,base.total);
assert.equal(calculate({...custom,customServices:[]},initialProducts,settings).total,base.total);
assert.equal(calculate({...custom,customServices:[{...service,price:0}]},initialProducts,settings).complete,true);
for(const patch of [{price:null},{name:''}]){
 const input={...custom,customServices:[{...service,...patch}]},c=calculate(input,initialProducts,settings);
 assert.equal(c.complete,false);assert.equal(workflowReadiness(input,initialProducts,c).installation,false);
}
assert.equal(quoteSchema.safeParse({...custom,customServices:[service,service]}).success,false);
assert.equal(quoteSchema.safeParse({...custom,customServices:[{...service,price:-1}]}).success,false);
assert.equal(quoteSchema.safeParse({...custom,customServices:[{...service,quantity:Infinity}]}).success,false);
const old:SavedQuote={id:'old',folio:'OLD',date:'2026-10-02',input:both,settings,calculation:{...base,lines:[...base.lines,{...te1,qty:1,total:te1.price},{...te4,qty:1,total:te4.price}]}};
assert.ok(issuanceProblems(old).some(s=>s.includes('TE1 o TE4')));
assert.throws(()=>calculate({...custom,quantities:{...custom.quantities,[te4.id]:1},customServices:[{...service,name:'TE1 especial'}]},initialProducts,settings),/TE1 o TE4/);
console.log('Servicios: exclusión TE1/TE4, guardado, emisión, otros, impuestos, descuento y validación: OK');

// Waldo: mandatory materials and whole-metre drop are enforced in calculations,
// including old drafts that omitted them, for every system in the catalogue.
for(const system of [...new Set(initialProducts.map(p=>p.system))]){
 const products=initialProducts.filter(p=>p.system===system);
 const required=products.filter(requiredMaterial),drop=products.find(isLinearDrop)!;
 assert.equal(required.length,2,`${system}: adhesive kit and electrical board`);
 assert.ok(drop);
 assert.equal(equipmentCategories([...products].reverse())[0],'PANEL FOTOVOLTAICO');
 const input={...newQuote(),system,quantities:{[drop.id]:15.2}};
 const before=JSON.stringify(input),normal=requiredServiceQuantities(input,initialProducts);
 for(const p of required){
  assert.equal(normal[p.id],1);
  assert.equal(serviceQuantities(input,products,p,0)[p.id],1);
 }
 assert.equal(normal[drop.id],16);
 assert.deepEqual(requiredServiceQuantities({...input,quantities:normal},initialProducts),normal);
 const c=calculate(input,initialProducts,settings);
 for(const p of required){const line=c.lines.find(l=>l.id===p.id)!;assert.equal(line.qty,1);assert.equal(line.total,p.price);}
 assert.equal(c.lines.find(l=>l.id===drop.id)?.qty,16);
 assert.equal(JSON.stringify(input),before,'Historical inputs remain unchanged');
 assert.equal(serviceQuantity(drop,1),15);assert.equal(serviceQuantity(drop,15),15);assert.equal(serviceQuantity(drop,16),16);assert.equal(serviceQuantity(drop,0),0);
}
assert.equal(requiredMaterial({category:'TABLERO TRIFÁSICO'}),true);
assert.equal(requiredMaterial({category:'KIT DE ADHESIVO'}),true);
console.log('Waldo: panel primero, kit/tablero obligatorios en todos los sistemas, bajada entera desde 15 y snapshots intactos: OK');

// Acometidas follow the same rule in the editor and server-side recalculation,
// including fractional quantities recovered from an earlier editable draft.
for(const system of [...new Set(initialProducts.map(p=>p.system))]){
 const connection=initialProducts.find(p=>p.system===system&&p.category.startsWith('ACOMETIDA'))!;
 assert.ok(connection,`${system}: connection exists`);
 assert.equal(isLinearService(connection),true);
 for(const [entered,expected] of [[0,0],[0.1,15],[1,15],[14,15],[15,15],[15.1,16],[16,16],[25,25]]){
  const input={...newQuote(),system,quantities:{[connection.id]:entered}};
  const snapshot=JSON.stringify(input);
  assert.equal(serviceQuantities(input,initialProducts,connection,entered)[connection.id],expected);
  const normalized=requiredServiceQuantities(input,initialProducts);
  assert.equal(normalized[connection.id],expected);
  const result=calculate(input,initialProducts,settings);
  const line=result.lines.find(l=>l.id===connection.id);
  if(expected===0)assert.equal(line,undefined);
  else {assert.equal(line?.qty,expected);assert.equal(line?.total,Math.round(expected*connection.price!));}
  assert.equal(JSON.stringify(input),snapshot,'Do not mutate a saved input snapshot');
 }
}
assert.equal(isLinearService({category:'Acometida trifásica'}),true);
assert.equal(isLinearService({category:'MATERIAL DE TECHO'}),false);
assert.equal(serviceQuantity({category:'OTRO CABLEADO',unit:'metro'},0.5),0.5);
console.log('Acometidas: mínimo 15 m, incrementos enteros, total coherente y exclusión opcional en todos los sistemas: OK');
