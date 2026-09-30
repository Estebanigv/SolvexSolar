import assert from 'node:assert/strict';
import {addressQuerySchema,geocodeAddress,parseLocations} from '../lib/geocoding';
import {mergeQuotePatch,newQuote} from '../lib/quote';
import {newEnergyInput} from '../lib/energy';
const input={address:'Calle Prueba 100',commune:'Colina',region:'Metropolitana de Santiago'};
const feature={geometry:{type:'Point',coordinates:[-70.68,-33.2]},properties:{countrycode:'CL',type:'house',street:'Calle Prueba',housenumber:'100',city:'Colina',state:'Metropolitana de Santiago'}};
assert.equal(addressQuerySchema.safeParse({...input,email:'private@example.com'}).success,false);
assert.equal(addressQuerySchema.safeParse({...input,address:''}).success,false);
assert.equal(addressQuerySchema.safeParse({...input,region:'Valparaíso'}).success,false);
assert.equal(addressQuerySchema.safeParse({...input,commune:'Comuna inexistente'}).success,false);
assert.equal(addressQuerySchema.safeParse({...input,region:'RM'}).success,true);
assert.deepEqual(parseLocations({features:[{...feature,properties:{...feature.properties,state:'Valparaíso'}}]},input),[]);
assert.equal(parseLocations({features:[{...feature,properties:{...feature.properties,housenumber:'200'}}]},input)[0].approximate,true);
assert.equal(parseLocations({features:[{...feature,properties:{...feature.properties,state:'Región Metropolitana de Santiago'}}]},input).length,1);
const candidates=parseLocations({features:[feature,feature,{...feature,properties:{...feature.properties,countrycode:'AR'}},{...feature,properties:{...feature.properties,city:'Temuco'}},{...feature,properties:{...feature.properties,type:'city'}}]},input);
assert.equal(candidates.length,1);assert.equal(candidates[0].latitude,-33.2);assert.equal(candidates[0].longitude,-70.68);assert.equal(candidates[0].approximate,false);
assert.equal(parseLocations({features:[{...feature,properties:{...feature.properties,type:'street'}}]},input)[0].approximate,true);
assert.deepEqual(parseLocations({features:[{...feature,geometry:{type:'Point',coordinates:[0,0]}}]},input),[]);
const q={...newQuote(),energy:{...newEnergyInput(),latitude:-33.2,longitude:-70.68}};
assert.equal(mergeQuotePatch(q,{customer:{...q.customer,address:'Otra calle 20'}}).energy?.latitude,null);
assert.equal(mergeQuotePatch(q,{customer:{...q.customer,commune:'Santiago'}}).energy?.longitude,null);
assert.equal(mergeQuotePatch(q,{customer:{...q.customer,name:'Nombre corregido'}}).energy?.latitude,-33.2);
async function run(){
  const result=await geocodeAddress(input,(async(url,init)=>{const u=new URL(String(url));assert.equal(u.hostname,'photon.komoot.io');assert.equal(u.searchParams.get('countrycode'),'CL');assert.equal(init?.cache,'no-store');return Response.json({features:[feature]})}) as typeof fetch);
  assert.equal(result[0].latitude,-33.2);
  await assert.rejects(()=>geocodeAddress(input,(async()=>new Response('',{status:503})) as typeof fetch));
  console.log('Geocodificación: privacidad, comuna, país, aproximación, coordenadas y cambio de dirección: OK');
}
void run();
