import {z} from 'zod';
export const newPasswordSchema=z.string().min(12,'Usa al menos 12 caracteres.').max(72,'Usa como máximo 72 caracteres.').refine(v=>new TextEncoder().encode(v).length<=72,'La contraseña supera el límite de 72 bytes.');
export const passwordChangeSchema=z.object({currentPassword:z.string().min(1,'Ingresa tu contraseña actual.').max(1024),newPassword:newPasswordSchema}).strict().refine(v=>v.currentPassword!==v.newPassword,'Elige una contraseña diferente a la actual.');
export function passwordChangeError(code?:string){
  if(code==='same_password')return 'Elige una contraseña diferente a la actual.';
  if(code==='weak_password')return 'Elige una contraseña más segura. Combina palabras, números y símbolos.';
  if(code==='over_request_rate_limit')return 'Hubo demasiados intentos. Espera unos minutos y vuelve a probar.';
  if(code==='reauthentication_needed'||code==='reauthentication_not_valid')return 'Vuelve a iniciar sesión y repite el cambio de contraseña.';
  return 'No se pudo cambiar la contraseña. Inténtalo nuevamente.';
}
