import {z} from 'zod';
export function allowedPushEndpoint(value:string){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(
 ['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)||/^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname)
 )}catch{return false}
}
export const pushSubscriptionSchema=z.object({
 endpoint:z.string().max(2048).refine(allowedPushEndpoint,'Servicio de notificaciones no compatible.'),
 keys:z.object({p256dh:z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),auth:z.string().regex(/^[A-Za-z0-9_-]{22}=?=?$/)})
});
