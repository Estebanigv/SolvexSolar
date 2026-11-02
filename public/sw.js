/* Push only: never cache authenticated pages, customer data or API responses. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{}}catch{/* Still show a visible fallback. */}
 const id=typeof data.id==='string'?data.id:'crm';
 event.waitUntil(self.registration.showNotification(data.title||'Solvex Solar',{
 body:data.body||'Tienes un aviso en tu CRM.',icon:'/app-icon-192.png',badge:'/app-icon-192.png',
 tag:id,renotify:false,data:{url:'/crm?notification='+encodeURIComponent(id)}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 // A new window preserves any quotation currently being edited in another window.
 event.waitUntil(self.clients.openWindow(new URL(event.notification.data?.url||'/crm',self.location.origin).href));
});
