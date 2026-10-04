import assert from 'node:assert/strict';
import {test} from 'node:test';
import {observeAppInstallation,installationKey,type InstallPrompt} from '../lib/app-install';

function browser({stored=false,standalone=false,storageBlocked=false,related}:{stored?:boolean;standalone?:boolean;storageBlocked?:boolean;related?:()=>Promise<{platform:string;url?:string;id?:string}[]>}={}){
 const data=new Map<string,string>(stored?[[installationKey,'1']]:[]);
 const events=new EventTarget();
 const media=new Map<string,EventTarget&{matches:boolean}>();
 const win=Object.assign(events,{
  location:{origin:'https://cotizador.solvexsolar.cl'},
  localStorage:{getItem:(key:string)=>{if(storageBlocked)throw Error('Blocked');return data.get(key)??null;},setItem:(key:string,value:string)=>{if(storageBlocked)throw Error('Blocked');data.set(key,value);},removeItem:(key:string)=>{if(storageBlocked)throw Error('Blocked');data.delete(key);}},
  matchMedia:(query:string)=>{const item=Object.assign(new EventTarget(),{matches:standalone&&query==='(display-mode: standalone)'});media.set(query,item);return item;},
 });
 const nav={getInstalledRelatedApps:related};
 const values:boolean[]=[];
 const prompts:(InstallPrompt|null)[]=[];
 const subscribe=()=>observeAppInstallation(win as unknown as Window,nav as unknown as Navigator,value=>values.push(value),event=>prompts.push(event));
 return {events,values,prompts,data,media,subscribe};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('ordinary browser offers installation; confirmation survives a reload',async()=>{
 const b=browser();let stop=b.subscribe();await settle();assert.equal(b.values.at(-1),false);
 b.events.dispatchEvent(new Event('appinstalled'));assert.equal(b.values.at(-1),true);assert.equal(b.data.get(installationKey),'1');assert.equal(b.prompts.at(-1),null);
 stop();b.values.length=0;stop=b.subscribe();await settle();assert.deepEqual(b.values,[true]);stop();
});
test('standalone app never offers installation, including when storage is disabled',async()=>{
 const b=browser({standalone:true,storageBlocked:true});const stop=b.subscribe();await settle();assert.equal(b.values.at(-1),true);
 b.events.dispatchEvent(new Event('beforeinstallprompt',{cancelable:true}));assert.equal(b.values.at(-1),true);stop();
});
test('a fresh prompt clears old installation evidence after uninstall',async()=>{
 const b=browser({stored:true});const stop=b.subscribe();await settle();assert.equal(b.values.at(-1),true);
 const event=new Event('beforeinstallprompt',{cancelable:true});b.events.dispatchEvent(event);
 assert.equal(event.defaultPrevented,true);assert.equal(b.values.at(-1),false);assert.equal(b.data.has(installationKey),false);assert.equal(b.prompts.at(-1),event);stop();
});
test('same-origin installed PWA detected when opened in an ordinary browser',async()=>{
 const b=browser({related:async()=>[{platform:'webapp',url:'https://cotizador.solvexsolar.cl/manifest.webmanifest',id:'https://cotizador.solvexsolar.cl/'}]});const stop=b.subscribe();await settle();assert.equal(b.values.at(-1),true);stop();
});
test('unrelated apps and optional API errors do not hide the installation option',async()=>{
 for(const related of [async()=>[{platform:'webapp',url:'https://other.example/manifest.webmanifest'}],async()=>{throw Error('Unsupported');}]){
  const b=browser({related});const stop=b.subscribe();await settle();assert.equal(b.values.at(-1),false);stop();
 }
});
test('late installed-app lookup cannot override a newer fresh prompt',async()=>{
 let resolve!:(apps:{platform:string;id:string}[])=>void;
 const b=browser({related:()=>new Promise(done=>{resolve=done;})});const stop=b.subscribe();await settle();
 b.events.dispatchEvent(new Event('beforeinstallprompt'));resolve([{platform:'webapp',id:'/'}]);await settle();assert.equal(b.values.at(-1),false);stop();
});
test('other-tab installation updates state; disposal removes all observers',async()=>{
 const b=browser();const stop=b.subscribe();await settle();
 b.data.set(installationKey,'1');b.events.dispatchEvent(Object.assign(new Event('storage'),{key:installationKey}));assert.equal(b.values.at(-1),true);
 stop();const count=b.values.length;b.events.dispatchEvent(new Event('appinstalled'));b.events.dispatchEvent(new Event('beforeinstallprompt'));assert.equal(b.values.length,count);
});
