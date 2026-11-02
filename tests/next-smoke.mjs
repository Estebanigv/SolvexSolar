import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3014';
const page=await fetch(base,{redirect:'manual'});
if(page.status===307){
 assert.match(page.headers.get('location'),/\/acceso$/);
}else{
 // Next.js 16 can flush loading.tsx before the protected page redirects.
 assert.equal(page.status,200);
 const html=await page.text();
 assert.match(html,/<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=\/acceso"\/>/);
 assert.match(html,/NEXT_REDIRECT;replace;\/acceso;307;/);
 assert.doesNotMatch(html,/class="app-root/,'Private workspace must never render before sign-in');
}
const login=await fetch(new URL('/acceso',base));
const crm=await fetch(new URL('/crm',base),{redirect:'manual'});
if(crm.status===307)assert.equal(crm.headers.get('location'),'/acceso?next=%2Fcrm');
else{
 assert.equal(crm.status,200);
 const html=await crm.text();
 assert.match(html,/NEXT_REDIRECT;replace;\/acceso\?next=%2Fcrm;307;/);
 assert.doesNotMatch(html,/class="app-root/,'CRM never renders private workspace without sign-in');
}
assert.match(crm.headers.get('cache-control'),/no-store/);
assert.equal(login.status,200);assert.match(await login.text(),/Ingresa a tu espacio/);
assert.equal((await fetch(new URL('/logo.jpg',base))).status,200);
for(const forged of [{},{'oai-authenticated-user-id':'forged-owner','oai-authenticated-user-email':'forged@example.test'}]){
 for(const [path,method] of [['/api/crm/tasks','GET'],['/api/crm/tasks','POST'],['/api/crm/tasks','PATCH'],['/api/crm/contact','PUT'],['/api/crm','GET'],['/api/crm','PUT'],['/api/crm/notes','GET'],['/api/crm/notes','POST'],['/api/workspace','GET'],['/api/workspace','PUT'],['/api/quotes','GET'],['/api/quotes','POST'],['/api/clients','GET'],['/api/clients','POST'],['/api/members','GET'],['/api/members','PATCH'],['/api/quotes/00000000-0000-4000-8000-000000000000/bills','GET']]){
  const response=await fetch(new URL(path,base),{method,headers:{...forged,Origin:base,'Content-Type':'application/json'},...(method==='GET'?{}:{body:'{}'})});
  assert.equal(response.status,401,`${method} ${path}`);assert.match(response.headers.get('cache-control'),/no-store/);
 }
}
const crossOrigin=await fetch(new URL('/api/quotes',base),{method:'POST',headers:{Origin:'https://other.example','Content-Type':'application/json'},body:'{}'});
assert.equal(crossOrigin.status,403);
console.log('Acceso privado: redirección, formulario, recursos, APIs, encabezados falsificados y origen: OK');
