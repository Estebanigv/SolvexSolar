import assert from 'node:assert/strict';
import {readWithOptionalProfileColor} from '../lib/profile-compatibility';
async function main(){
  const calls:boolean[]=[];
  const profile={id:'existing-user',role:'admin'};
  const oldSchema=await readWithOptionalProfileColor(async withColor=>{calls.push(withColor);return withColor?{data:null,error:{code:'42703',message:'column profiles.identification_color does not exist'}}:{data:profile,error:null}});
  assert.deepEqual(calls,[true,false]);assert.deepEqual(oldSchema.data,profile);
  for(const error of [{code:'42501',message:'permission denied identification_color'},{code:'42703',message:'column profiles.role does not exist'},{code:'PGRST116',message:'No rows'},{code:'FETCH_ERROR',message:'network unavailable'}]){
    let attempts=0;const result=await readWithOptionalProfileColor(async()=>{attempts++;return {data:null,error}});
    assert.equal(attempts,1);assert.equal(result.error,error,'Do not mask authorization or unrelated failures');
  }
  let attempts=0;const complete={...profile,identification_color:'copper'};
  const currentSchema=await readWithOptionalProfileColor(async()=>{attempts++;return {data:complete,error:null}});
  assert.equal(attempts,1);assert.deepEqual(currentSchema.data,complete);
  console.log('Perfil: compatibilidad con campo opcional y errores de autorización: OK');
}
void main();
