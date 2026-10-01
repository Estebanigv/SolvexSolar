import type {SavedQuote} from '@/lib/quote';
import {money,systemNames} from '@/lib/quote';
import {assignedAdviser,netbillingScope,paymentBreakdown,preliminaryNote,proposalTitle} from '@/lib/commercial';
import {consumptionSummary} from '@/lib/energy';
import {proposalEquipment,proposalImages,proposalWarranties,proposalReadingSections} from '@/lib/proposal-document';
import {UserRound,Phone,Mail,MapPin,CalendarDays,Sun,Zap,BatteryCharging,ShieldCheck} from 'lucide-react';

export function Proposal({q}:{q:SavedQuote}){
 const {input,settings,calculation:c}=q;
 const adviser=assignedAdviser(input,settings),consumption=consumptionSummary(input.energy);
 const payments=paymentBreakdown(c.total,settings),netbilling=netbillingScope(input,settings);
 const equipment=proposalEquipment(q),warranties=proposalWarranties(settings.warranty),reading=proposalReadingSections(q);
 const facts=[{label:'Cliente',value:input.customer.name||'Por completar',icon:UserRound},{label:'Teléfono',value:input.customer.phone||'Por completar',icon:Phone},{label:'Correo',value:input.customer.email||'Por completar',icon:Mail},{label:'Región',value:input.customer.region||'Por completar',icon:MapPin},{label:'Comuna',value:input.customer.commune||'Por completar',icon:MapPin},{label:'Emisión',value:new Date(q.date).toLocaleDateString('es-CL'),icon:CalendarDays}];
 const footer=(section:string)=><div className="proposal-sheet-footer"><strong>{settings.name}</strong><span>{section}</span><span>{q.folio}</span></div>;
 return <article className="proposal proposal-brochure">
  <section className="proposal-sheet">
   <header className="proposal-masthead"><div className="proposal-brand"><img src="/logo.jpg" alt={settings.name}/><div><strong>{settings.name}</strong><p>Proyectos que iluminan</p></div></div><div className="proposal-ref"><p>{proposalTitle(input,c.official)}</p><strong>{q.folio}</strong></div></header>
   <div className="proposal-hero"><div className="proposal-hero-copy"><p>{systemNames[input.system]}</p><h2>Tu proyecto<br/>fotovoltaico</h2><strong>{c.kwp.toLocaleString('es-CL',{maximumFractionDigits:3})} <small>kWp</small></strong><p>{c.panels} paneles para tu proyecto</p></div><figure><img src={proposalImages.roof} alt="Paneles solares sobre una vivienda, imagen referencial"/><figcaption>Imagen referencial</figcaption></figure></div>
   <div className="proposal-sheet-content">
    <div className="proposal-facts">{facts.map(fact=><div key={fact.label}><fact.icon size={17}/><div><small>{fact.label}</small><strong>{fact.value}</strong></div></div>)}</div>
    {input.customer.address&&<p className="proposal-location"><MapPin size={15}/><span>{input.customer.address}</span></p>}
    <section className="proposal-overview"><h3>Sistema cotizado</h3><div className="proposal-keyfigures"><div><span>{c.complete?'Inversión total':'Subtotal parcial'}</span><strong>{money(c.total)}</strong><small>{c.tax===null?'IVA pendiente de confirmar':'Valor final con IVA'} · Pesos chilenos</small></div><div><span>Potencia del sistema</span><strong>{c.kwp.toLocaleString('es-CL',{maximumFractionDigits:3})} <small>kWp</small></strong><small>{c.panels} paneles · {systemNames[input.system]}</small></div></div>

    </section>
    {consumption&&input.energy&&<section className="proposal-consumption"><h3>Consumo de referencia</h3><div><div><small>Boleta informada</small><strong>{money(input.customer.bill)}</strong></div><div><small>Consumo del período</small><strong>{input.energy.consumptionKwh?.toLocaleString('es-CL')} <small>kWh</small></strong></div><div><small>Período facturado</small><strong>{input.energy.billingDays} <small>días</small></strong></div></div><p>{[input.energy.distributor,input.energy.tariff,input.energy.billReviewed?'Revisado con la boleta':'Pendiente de revisión'].filter(Boolean).join(' · ')}</p><p>Equivalente a 30 días: {consumption.equivalent30DaysKwh.toLocaleString('es-CL',{maximumFractionDigits:1})} kWh. No representa una proyección anual.</p></section>}
   </div>{footer('Resumen del proyecto')}
  </section>
  <section className="proposal-sheet">
   <header className="proposal-section-title"><p>{q.folio}</p><h2>Equipos y alcance</h2><p>Los equipos seleccionados para tu proyecto y su forma de pago.</p></header>
   <div className="proposal-sheet-content">
    <section className="proposal-project-includes"><h3>Tu proyecto incluye</h3><div className="proposal-project-equipment">{equipment.map((item,index)=><div className="proposal-project-equipment-row" key={item.kind+'-'+index}><span className="proposal-project-equipment-icon">{item.kind==='panels'?<Sun size={26}/>:item.kind==='battery'?<BatteryCharging size={26}/>:<Zap size={26}/>}</span><div><h4>{item.label}</h4><p className="proposal-project-model">{item.value}</p><p className="proposal-project-note">{item.note}</p></div></div>)}</div></section>
    <p className="proposal-validity">Vigencia de {settings.validDays} días desde la emisión.</p>
    <section className="proposal-payments"><h3>Forma de pago</h3><p>{input.payment}</p>{payments.length>0&&<div>{payments.map((row,index)=><div key={row.label}><span>{index+1}</span><div><p>{row.label}</p><small>{row.percent}% del total</small></div><strong>{money(row.amount)}</strong></div>)}</div>}</section>
    {c.warnings.length>0&&<section className="proposal-pending"><h3>Propuesta en revisión</h3><ul>{c.warnings.map(w=><li key={w}>{w}</li>)}</ul></section>}
   </div>{footer('Equipos y pagos')}
  </section>
  <section className="proposal-sheet">
   <div className="proposal-photo-band"><img src={proposalImages.home} alt="Vivienda con instalación fotovoltaica, imagen referencial"/><p>Imagen referencial</p></div>
   <div className="proposal-sheet-content">
    <section className="proposal-assurance"><h3><ShieldCheck size={22}/>Respaldo para tu proyecto</h3>{warranties.length>0&&<div className="proposal-warranties">{warranties.map(w=><div key={w.label}><strong>{w.years}<small> {w.years===1?'año':'años'}</small></strong><p>{w.label}</p></div>)}</div>}<div className="proposal-reading-grid">{reading.warranty.map(group=><section className="proposal-reading-block" key={group.title}><h4>{group.title}</h4><ul>{group.items.map((item,i)=><li key={i}>{item}</li>)}</ul></section>)}</div></section>
    <section className="proposal-scope"><h3>Alcance de tu proyecto</h3>{input.proposalType==='preliminary'&&<aside className="proposal-technical-note"><strong>Antes de la cotización final</strong><p>{preliminaryNote}</p></aside>}<div className="proposal-scope-list">{reading.scope.map(group=><section className="proposal-reading-block" key={group.title}><h4>{group.title}</h4><ul>{group.items.map((item,i)=><li key={i}>{item}</li>)}</ul></section>)}</div></section>
   </div>{footer('Garantías y alcance')}
  </section>
  <section className="proposal-sheet">
   <header className="proposal-section-title"><p>{q.folio}</p><h2>Condiciones claras</h2><p>Revisa los pagos, los servicios y las validaciones de tu propuesta.</p></header>
   <div className="proposal-sheet-content">
    <div className="proposal-commercial-list">{reading.commercial.map(group=><section className="proposal-reading-block" key={group.title}><h4>{group.title}</h4><ul>{group.items.map((item,i)=><li key={i}>{item}</li>)}</ul></section>)}</div>
    {netbilling&&<section className="proposal-reading-block proposal-netbilling"><h4>Certificación y Netbilling</h4><p>{netbilling}</p></section>}
    {input.financingNote?.trim()&&<section className="proposal-terms"><h3>Acompañamiento financiero</h3><p>{input.financingNote}</p></section>}
    <section className="proposal-contact"><div><h3>Conversemos sobre tu proyecto</h3><strong>{adviser?.name||settings.legal||settings.name}</strong><p>{[adviser?.email||settings.email,adviser?.phone||settings.phone].filter(Boolean).join(' · ')}</p></div><div>{adviser&&<strong>{settings.legal||settings.name}</strong>}{settings.rut&&<p>RUT: {settings.rut}</p>}{adviser&&adviser.email!==settings.email&&<p>{settings.email}</p>}</div></section>
    <p className="proposal-disclaimer">Las fotografías son referenciales y no representan la instalación cotizada. No se incluyen estimaciones de ahorro, generación o retorno sin parámetros técnicos validados.</p>
   </div>{footer('Condiciones comerciales')}
  </section>
 </article>;
}
