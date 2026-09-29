import territories from './chile-territories.json';

// SUBDERE, CUT 2018 (includes Ñuble), downloaded 2026-09-29.
// https://www.subdere.gov.cl/sites/default/files/documentos/CUT_2018_v04.xls
export const locationKey=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
export function findCommune(text:string){return territories.find(item=>locationKey(item.commune)===locationKey(text));}
export function regionMatches(text:string,region:string){
  const key=locationKey(text).replace(/^region\s+(?:de\s+|del\s+)?/,'');
  return key===locationKey(region)||(region==='Metropolitana de Santiago'&&['rm','metropolitana','xiii'].includes(key));
}
export function locationFromAddress(address:string){
  // Only match the final municipality in a customer address, not arbitrary mentions of cities.
  const clean=address.trim().replace(/[,.\s]+$/,'');
  const key=locationKey(clean);
  const matches=territories.filter(item=>key.endsWith(', '+locationKey(item.commune))||key.endsWith(','+locationKey(item.commune))||key.endsWith(' '+locationKey(item.commune))).sort((a,b)=>b.commune.length-a.commune.length);
  const place=matches[0];if(!place)return null;
  const start=key.length-locationKey(place.commune).length;
  // Names and accents preserve length after normalizing the whitespace here.
  const normalized=clean.replace(/\s+/g,' ');
  const street=normalized.slice(0,start).replace(/[,\s]+$/,'');
  if(!/\d/.test(street))return null;
  return {place,street};
}
