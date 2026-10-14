import assert from 'node:assert/strict';
import {checkPasskeySupport,passkeyError,passkeyOriginAllowed} from '../lib/passkeys';

async function main(){
  assert.equal(passkeyOriginAllowed('https://cotizador.solvexsolar.cl'),true);
  for(const origin of ['http://cotizador.solvexsolar.cl','https://cotizador.solvexsolar.cl.evil.test','https://solvexsolar.cl','https://solvex-solar.vercel.app','http://localhost:3015','invalid'])assert.equal(passkeyOriginAllowed(origin),false,origin);
  const device={secure:true,origin:'https://cotizador.solvexsolar.cl',available:async()=>true};
  assert.equal(await checkPasskeySupport(device),'available');
  assert.equal(await checkPasskeySupport({...device,secure:false}),'unavailable');
  assert.equal(await checkPasskeySupport({...device,available:undefined}),'unavailable');
  assert.equal(await checkPasskeySupport({...device,available:async()=>false}),'unavailable');
  assert.equal(await checkPasskeySupport({...device,available:async()=>{throw Error('denied')}}),'unavailable');
  assert.equal(await checkPasskeySupport({...device,origin:'https://other.test',available:async()=>{throw Error('should not run')}}),'wrong-origin');
  assert.match(passkeyError({code:'passkey_disabled'}),/no está habilitado/);
  assert.match(passkeyError({name:'NotAllowedError'}),/reintentar/);
  assert.match(passkeyError({code:'webauthn_challenge_expired'}),/venció/);
  assert.match(passkeyError({code:'webauthn_credential_not_found'}),/contraseña/);
  assert.match(passkeyError({status:429}),/Espera/);
  assert.doesNotMatch(passkeyError({message:'sensitive server error'}),/sensitive/);
  console.log('Passkey domain, device availability and safe recovery checks passed.');
}
void main();
