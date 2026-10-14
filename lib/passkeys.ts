export const passkeyDomain='cotizador.solvexsolar.cl';

// Credentials belong to the production domain, never a preview deployment.
export function passkeyOriginAllowed(origin:string){
  try{return new URL(origin).origin===`https://${passkeyDomain}`}catch{return false}
}

export function passkeyError(error:unknown){
  const detail=error&&typeof error==='object'?error as {code?:string;name?:string;status?:number}:{};
  if(detail.code==='passkey_disabled')return 'El acceso biométrico aún no está habilitado en el servicio. Puedes ingresar con tu correo y contraseña.';
  if(detail.name==='NotAllowedError'||detail.name==='AbortError'||['ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY','ERROR_CEREMONY_ABORTED'].includes(detail.code??''))return 'No se completó la verificación del dispositivo. Puedes reintentar o usar tu contraseña.';
  if(detail.code==='webauthn_credential_exists')return 'Esta clave de acceso ya está registrada. Puedes usarla para ingresar.';
  if(detail.code==='webauthn_credential_not_found')return 'Esta clave ya no está registrada. Ingresa con tu contraseña y actívala desde Mi cuenta.';
  if(['webauthn_challenge_expired','webauthn_challenge_not_found'].includes(detail.code??''))return 'La solicitud de acceso venció. Vuelve a intentarlo.';
  if(detail.code==='too_many_passkeys')return 'Llegaste al límite de claves de acceso. Elimina una que ya no utilices antes de agregar otra.';
  if(detail.status===429)return 'Hubo varios intentos seguidos. Espera unos minutos antes de reintentar.';
  return 'No se pudo completar el acceso biométrico. Revisa tu conexión o ingresa con tu correo y contraseña.';
}

export type PasskeySupport='checking'|'available'|'unavailable'|'wrong-origin';
type Device={secure:boolean;origin:string;available?:()=>Promise<boolean>};
export async function checkPasskeySupport(device:Device):Promise<PasskeySupport>{
  if(!passkeyOriginAllowed(device.origin))return 'wrong-origin';
  if(!device.secure||!device.available)return 'unavailable';
  try{return await device.available()?'available':'unavailable'}catch{return 'unavailable'}
}
