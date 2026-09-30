/** Interpret only the named fields inside a Chilean TED, never opaque payment digits. */
export function billCodeSummary(text:string){
  if(text.length>10000||/<!DOCTYPE|<!ENTITY/i.test(text)||!/^\s*<TED\b/.test(text))return null;
  const dd=text.match(/<DD>([\s\S]*?)<\/DD>/)?.[1];if(!dd)return null;
  const field=(tag:string)=>{
    const matches=[...dd.matchAll(new RegExp(`<${tag}>([^<>]{1,150})</${tag}>`,'g'))];
    return matches.length===1?matches[0][1].replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").trim():undefined;
  };
  const amount=field('MNT');
  return {recipient:field('RSR'),recipientRut:field('RR'),folio:field('F'),documentAmount:amount&&/^\d{1,9}$/.test(amount)?Number(amount):undefined};
}
