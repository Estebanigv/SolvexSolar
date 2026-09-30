'use client';
import {useId} from 'react';
import {chileRegions,communesForRegion,locationKey,regionMatches} from '@/lib/chile-location';

export function CustomerLocationFields({region,commune,onChange}:{region:string;commune:string;onChange:(location:{region:string;commune:string})=>void}){
  const id=useId();
  const selectedRegion=chileRegions.find(name=>regionMatches(region,name));
  const communes=selectedRegion?communesForRegion(selectedRegion):[];
  const selectedCommune=communes.find(name=>locationKey(name)===locationKey(commune));
  const unknownRegion=!!region&&!selectedRegion,unknownCommune=!!commune&&!selectedCommune;
  return <>
    <label className="customer-location-field" htmlFor={id+'-region'}>Región
      <select id={id+'-region'} aria-label="Región" value={selectedRegion??region} aria-invalid={unknownRegion||undefined} aria-describedby={unknownRegion?id+'-region-help':undefined} onChange={e=>{
        const nextRegion=e.target.value;
        const nextCommune=communesForRegion(nextRegion).find(name=>locationKey(name)===locationKey(commune))??'';
        onChange({region:nextRegion,commune:nextCommune});
      }}>
        <option value="">Selecciona una región</option>
        {unknownRegion&&<option value={region} disabled>{region} (por revisar)</option>}
        {chileRegions.map(name=><option key={name} value={name}>{name}</option>)}
      </select>
      {unknownRegion&&<small id={id+'-region-help'}>Revisa la región detectada y selecciona una de la lista.</small>}
    </label>
    <label className="customer-location-field" htmlFor={id+'-commune'}>Comuna
      <select id={id+'-commune'} aria-label="Comuna" value={selectedCommune??commune} disabled={!selectedRegion} aria-invalid={unknownCommune||undefined} aria-describedby={id+'-commune-help'} onChange={e=>onChange({region:selectedRegion!,commune:e.target.value})}>
        <option value="">{selectedRegion?'Selecciona una comuna':'Primero selecciona una región'}</option>
        {unknownCommune&&<option value={commune} disabled>{commune} (por revisar)</option>}
        {communes.map(name=><option key={name} value={name}>{name}</option>)}
      </select>
      <small id={id+'-commune-help'}>{unknownCommune?'Revisa la comuna detectada; debe pertenecer a la región seleccionada.':selectedRegion?'Comunas de la región seleccionada, en orden alfabético.':'Selecciona la región para ver sus comunas.'}</small>
    </label>
  </>;
}
