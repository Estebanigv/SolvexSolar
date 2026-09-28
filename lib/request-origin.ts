/** Match the browser origin to the incoming Host, not Next's internal proxy URL. */
export function sameRequestOrigin(request:Request,requireHttps=false):boolean{
  const origin=request.headers.get('origin'),host=request.headers.get('host');
  if(!origin||!host)return false;
  try{
    const parsed=new URL(origin);
    return parsed.origin===origin&&parsed.host===host.toLowerCase()&&
      (requireHttps?parsed.protocol==='https:':['http:','https:'].includes(parsed.protocol));
  }catch{return false}
}
