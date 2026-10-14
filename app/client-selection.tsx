'use client';
import {useId,useState} from 'react';
import type {QuoteInput} from '@/lib/quote';
import {searchClients,type SearchableClient} from '@/lib/client-search';

export function ClientSelection({customer,clientId,clients,onSelect,loading=false,unavailable=false,disabled=false}:{
  customer:QuoteInput['customer'];clientId:string|null;clients:SearchableClient[];
  onSelect:(client:SearchableClient)=>void;loading?:boolean;unavailable?:boolean;disabled?:boolean;
}){
  const [query,setQuery]=useState('');
  const id=useId();
  const matches=searchClients(clients,query);
  const searching=!!query.trim();
  return <div className="client-selection">
    <div className="client-current" aria-live="polite" aria-atomic="true">
      <span className="client-current-status">{clientId?'Cliente registrado':'Nuevo cliente · Pendiente de guardar'}</span>
      <strong>{customer.name.trim()||'Carga una boleta o ingresa los datos del cliente'}</strong>
      {customer.address&&<span>{[customer.address,customer.commune].filter(Boolean).join(' · ')}</span>}
      {(customer.email||customer.phone)&&<span>{[customer.email,customer.phone].filter(Boolean).join(' · ')}</span>}
    </div>
    <div className="client-search">
      <label htmlFor={id}>Buscar un cliente registrado</label>
      <input id={id} type="search" value={query} disabled={disabled} autoComplete="off"
        placeholder="Nombre, correo o teléfono" aria-describedby={`${id}-status`}
        onChange={event=>setQuery(event.target.value)}/>
      <p id={`${id}-status`} role="status">{!searching?'Los clientes aparecen al escribir. Los datos de la boleta se muestran arriba.':loading?'Cargando clientes…':unavailable?'No se pudo cargar la búsqueda. Reintenta más abajo.':matches.length?`${matches.length} ${matches.length===1?'coincidencia':'coincidencias'}${matches.length>8?' · Se muestran las primeras 8; precisa tu búsqueda.':''}`:clientId?'No hay coincidencias. Prueba otro nombre, correo o teléfono.':'No hay coincidencias. Puedes guardar el cliente cargado como nuevo.'}</p>
      {searching&&!loading&&!unavailable&&matches.length>0&&<ul className="client-search-results" aria-label="Clientes encontrados">
        {matches.slice(0,8).map(client=><li key={client.id}><button type="button" disabled={disabled||client.id===clientId}
          onClick={()=>{onSelect(client);setQuery('')}}>
          <strong>{client.details.name}</strong>
          <span>{[client.details.email,client.details.phone,client.details.commune].filter(Boolean).join(' · ')}</span>
          <small>{client.id===clientId?'Cliente actual':'Cargar cliente'}</small>
        </button></li>)}
      </ul>}
    </div>
  </div>;
}
