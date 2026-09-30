import {z} from 'zod';

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
   const response=await fetcher('https://api.cne.cl/api/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({email,password}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('CNE no permitió renovar la conexión. El administrador debe revisar el correo y la contraseña configurados.');
   const parsed=z.object({token:z.string().min(10).max(16000)}).safeParse(await response.json());
   if(!parsed.success)throw Error('CNE devolvió una credencial no válida.');
   const value=parsed.data.token;let expires=now()+5*60000;
   // This only schedules renewal; JWT authentication is performed by CNE.
   try{const claims=JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString());if(typeof claims.exp==='number')expires=claims.exp*1000}catch{}
   if(expires<=now()+60000)throw Error('CNE devolvió una credencial vencida o próxima a vencer.');
   cached={token:value,expires};return value;
  })();
  try{return await pending}finally{pending=undefined}
 };
}

export const getCneToken=createCneTokenProvider();
