export type InstallPrompt = Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
type InstalledApp={platform:string;url?:string;id?:string};
type InstallNavigator=Navigator&{standalone?:boolean;getInstalledRelatedApps?:()=>Promise<InstalledApp[]>};
export const installationKey='solvex.app-installed.v1';

// Use browser evidence, not an accepted prompt, to remember a completed installation.
// A fresh install prompt invalidates that record after an uninstall. Browsers without
// installed-app detection fall back to the record and standalone display mode.
export function observeAppInstallation(win:Window,nav:InstallNavigator,onChange:(installed:boolean)=>void,onPrompt:(prompt:InstallPrompt|null)=>void){
 let active=true,revision=0;
 const displays=['standalone','minimal-ui','window-controls-overlay'].map(mode=>win.matchMedia(`(display-mode: ${mode})`));
 const standalone=()=>displays.some(display=>display.matches)||nav.standalone===true;
 const read=()=>{try{return win.localStorage.getItem(installationKey)==='1';}catch{return false;}};
 const remember=(value:boolean)=>{try{if(value)win.localStorage.setItem(installationKey,'1');else win.localStorage.removeItem(installationKey);}catch{/* Storage can be disabled; current-session detection still works. */}};
 const report=(value:boolean)=>{if(active)onChange(value);};
 const installed=()=>{revision++;remember(true);onPrompt(null);report(true);};
 const prompt=(event:Event)=>{
  event.preventDefault();revision++;
  if(standalone()){installed();return;}
  remember(false);onPrompt(event as InstallPrompt);report(false);
 };
 const display=()=>{revision++;if(standalone())installed();else report(read());};
 const storage=(event:StorageEvent)=>{if(event.key===installationKey||event.key===null){revision++;report(standalone()||read());}};
 win.addEventListener('beforeinstallprompt',prompt);
 win.addEventListener('appinstalled',installed);
 win.addEventListener('storage',storage);
 displays.forEach(item=>item.addEventListener('change',display));
 const startedAt=revision;
 queueMicrotask(()=>{
  if(!active||revision!==startedAt)return;
  if(standalone())installed();else report(read());
 });
 if(nav.getInstalledRelatedApps){
  void Promise.resolve().then(()=>nav.getInstalledRelatedApps!()).then(apps=>{
   if(!active||revision!==startedAt)return;
   const manifest=new URL('/manifest.webmanifest',win.location.origin).href;
   const appId=new URL('/',win.location.origin).href;
   if(apps.some(app=>{
    if(app.platform!=='webapp')return false;
    try{return (!!app.url&&new URL(app.url,win.location.origin).href===manifest)|| (!!app.id&&new URL(app.id,win.location.origin).href===appId);}catch{return false;}
   }))installed();
  }).catch(()=>{/* Optional API: keep the display-mode and local-record result. */});
 }
 return ()=>{
  active=false;
  win.removeEventListener('beforeinstallprompt',prompt);win.removeEventListener('appinstalled',installed);win.removeEventListener('storage',storage);
  displays.forEach(item=>item.removeEventListener('change',display));
 };
}
