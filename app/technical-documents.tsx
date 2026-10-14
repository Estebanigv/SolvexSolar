'use client';
import {FileText,ArrowUpRight} from 'lucide-react';
import type {Product} from '@/lib/quote';
import {productDocuments,type TechnicalLibrary,type TechnicalDocument} from '@/lib/technical-documents';

function DocumentLink({document}:{document:TechnicalDocument}){
  return <a className="technical-document-link" href={document.url} target="_blank" rel="noopener noreferrer"><FileText size={18} aria-hidden="true"/><span><strong>{document.model}</strong><small>{document.name}</small>{document.note&&<small className={document.reviewRequired?'technical-document-warning':undefined}>{document.note}</small>}</span><ArrowUpRight size={16} aria-hidden="true"/></a>;
}
export function ProductTechnicalDocuments({product,library}:{product:Product;library?:TechnicalLibrary}){
  const {linked,candidates}=productDocuments(product,library);
  if(!candidates.length)return /PANEL|INVERSOR|BATER/i.test(product.category)?<p className="technical-document-empty">Ficha técnica pendiente para este equipo.</p>:null;
  return <div className="product-technical-documents">
    {linked?<><strong>Ficha asociada al equipo</strong><DocumentLink document={linked}/><small>La asociación no acredita compatibilidad ni certificación; confirma el modelo instalado.</small></>:<details><summary>{candidates.length} fichas de referencia · confirmar modelo</summary><p>Coinciden con la potencia del panel. Confirma marca, modelo y versión antes de asociar una ficha en Equipos y precios.</p>{candidates.map(doc=><DocumentLink key={doc.id} document={doc}/>)}</details>}
  </div>;
}
export function TechnicalDocumentsLibrary({library}:{library?:TechnicalLibrary}){
  if(!library?.documents.length)return <p>No hay fichas técnicas vinculadas todavía.</p>;
  return <section className="technical-library" aria-label="Biblioteca de fichas técnicas"><h3>{library.documents.length} fichas técnicas disponibles</h3><p>Consulta los originales de Drive. El acceso conserva los permisos de la carpeta. La marca y el modelo definitivos se confirman en el catálogo.</p><a href={library.folderUrl} target="_blank" rel="noopener noreferrer">Abrir carpeta de fichas en Drive ↗</a>{library.documents.map(doc=><DocumentLink key={doc.id} document={doc}/>)}</section>;
}
