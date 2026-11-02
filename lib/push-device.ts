export async function disconnectPushDevice(){
 if(!('serviceWorker' in navigator))return;
 const registration=await navigator.serviceWorker.getRegistration('/');
 const subscription=await registration?.pushManager?.getSubscription();
 if(subscription){
  await subscription.unsubscribe();
  // An expired endpoint cannot receive messages, even if server cleanup fails offline.
  await fetch('/api/notifications/subscription',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})}).catch(()=>{});
 }
 try{localStorage.removeItem('solvex-push-owner')}catch{/* Storage may be unavailable. */}
}
