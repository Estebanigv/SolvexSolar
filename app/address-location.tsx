"use client";
import {useEffect,useRef,useState} from 'react';
import {MapPin,LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {addressQuerySchema,type AddressQuery,type LocationCandidate} from '@/lib/geocoding';

export type LocationLookup=(address:AddressQuery,signal:AbortSignal)=>Promise<LocationCandidate[]>;
export function AddressLocation({address,onChoose,lookup}:{address:AddressQuery;onChoose:(point:LocationCandidate)=>void;lookup?:LocationLookup}){
  const [locations,setLocations]=useState<LocationCandidate[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState('');
  const controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  async function search(){
    controller.current?.abort();const control=new AbortController();controller.current=control;
    setLoading(true);setError('');setLocations([]);setSelected('');
    try{let found:LocationCandidate[];if(lookup){found=await lookup(address,control.signal)}else{const response=await fetch('/api/energy/location',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(address),signal:control.signal});const data=await response.json() as {locations:LocationCandidate[];error?:string};
      if(!response.ok)throw Error(data.error||'No se pudo buscar la dirección.');
      found=data.locations;}
      if(control.signal.aborted)return;
      setLocations(found);if(!found.length)setError('No se encontró una dirección en esa comuna. Revisa calle y número o ingresa las coordenadas manualmente.');
    }catch(e){if(!control.signal.aborted)setError((e as Error).message)}finally{if(!control.signal.aborted)setLoading(false)}
  }
  return <div className="address-location">
    <strong>Buscar el lugar de instalación</strong>
    <p>{[address.address,address.commune,address.region].filter(Boolean).join(', ')||'Completa la dirección del cliente en el paso 1.'}</p>
    <p className="energy-explanation">Al buscar se envían la dirección, comuna y región a Photon (Komoot), basado en OpenStreetMap. Confirma que el resultado corresponda al lugar de instalación.</p>
    <Button variant="outline" disabled={loading||!addressQuerySchema.safeParse(address).success} onClick={search}>{loading?<LoaderCircle className="animate-spin"/>:<MapPin/>}{loading?'Buscando ubicación…':'Buscar coordenadas por dirección'}</Button>
    {!addressQuerySchema.safeParse(address).success&&<p className="energy-explanation">Completa calle y número, región y una comuna de esa región para buscar.</p>}
    {error&&<p className="energy-error" role="alert">{error}</p>}
    <div className="location-candidates">{locations.map(point=><div key={`${point.latitude},${point.longitude}`}><strong>{point.label}</strong><p>{point.approximate?'Ubicación aproximada de calle o sector; ajusta el punto de instalación.':'Dirección con numeración; verifica el punto de instalación.'}</p><small>{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</small><div><a href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=18/${point.latitude}/${point.longitude}`} target="_blank" rel="noreferrer">Ver en mapa</a><Button variant="outline" onClick={()=>{onChoose(point);setSelected(point.label)}}>Usar esta ubicación</Button></div></div>)}</div>
    {selected&&<p role="status">Latitud y longitud cargadas. Puedes ajustarlas en los campos de abajo.</p>}
    <small>Fuente: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · Photon / Komoot</small>
  </div>;
}
