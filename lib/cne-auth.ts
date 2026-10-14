import {z} from 'zod';

export class CneAuthError extends Error {
 constructor(public code:'credentials'|'rate-limit'|'unavailable'|'invalid-response'|'expired'){
  super({credentials:'CNE rechazó las credenciales de acceso. El administrador debe revisar la conexión configurada.', 'rate-limit':'CNE limitó temporalmente las consultas. Espera unos minutos y vuelve a intentar.', unavailable:'No fue posible conectar con CNE. El servicio puede estar temporalmente indisponible; vuelve a intentar más tarde.', 'invalid-response':'CNE devolvió una respuesta de acceso no reconocida. El administrador debe revisar la integración.', expired:'CNE devolvió una credencial vencida o próxima a vencer.'}[code]);
 }
}

// CNE issues short-lived JWTs. Credentials stay on the server; only the token
// is sent to the electricity endpoint. A single login is shared by concurrent requests.
export function createCneTokenProvider(fetcher:typeof fetch=fetch,now:()=>number=Date.now){
 let cached:{token:string;expires:number}|undefined;
 let pending:Promise<string>|undefined;
 return async function token(email:string,password:string,renew=false):Promise<string>{
  if(renew)cached=undefined;
  if(cached&&cached.expires>now()+60000)return cached.token;
  if(pending)return pending;
  pending=(async()=>{
   let response:Response;
   try{response=await fetcher('https://api.cne.cl/api/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({email,password}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});}catch(error){const code=(error as {cause?:{code?:unknown}})?.cause?.code;console.warn('[CNE authentication]',{reason:'transport',code:typeof code==='string'&&/^[A-Z0-9_]{1,60}$/.test(code)?code:'unknown'});throw new CneAuthError('unavailable')}
   if(!response.ok){console.warn('[CNE authentication]',{reason:'http',status:response.status});throw new CneAuthError(response.status===401||response.status===403?'credentials':response.status===429?'rate-limit':'unavailable');}
   let body:unknown;try{body=await response.json()}catch{throw new CneAuthError('invalid-response')}
   const parsed=z.object({token:z.string().min(10).max(16000)}).safeParse(body);
   if(!parsed.success)throw new CneAuthError('invalid-response');
   const value=parsed.data.token;let expires=now()+5*60000;
   // This only schedules renewal; JWT authentication is performed by CNE.
   try{const claims=JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString());if(typeof claims.exp==='number')expires=claims.exp*1000}catch{}
   if(expires<=now()+60000)throw new CneAuthError('expired');
   cached={token:value,expires};return value;
  })();
  try{return await pending}finally{pending=undefined}
 };
}

export const getCneToken=createCneTokenProvider();
