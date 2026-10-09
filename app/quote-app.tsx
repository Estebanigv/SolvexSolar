"use client";
import {isIssued,issuanceProblems} from '@/lib/quote-issuance';
import {DiscountField} from './discount-field';
import {FinalQuoteTotal} from './final-quote-total';
import {DraftStatus,useQuoteDraft} from './quote-draft';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Sun,ArrowUpRight,Plus,Download,Printer,Mail,MessageCircle,Save,Check,AlertCircle,FileText,Package,History,Settings as SettingsIcon,ClipboardList,RotateCcw,Share2,LockKeyhole,ChevronRight,CalendarDays,PanelsTopLeft,ArrowLeft,ArrowRight,Zap,BatteryCharging,Unplug,Grid2X2,UserRound,Wrench,CheckCircle2} from 'lucide-react';
import {Button} from '@/components/ui/button';import {Input} from '@/components/ui/input';import {Textarea} from '@/components/ui/textarea';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Table,TableHeader,TableBody,TableRow,TableCell,TableHead} from '@/components/ui/table';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogHeader} from '@/components/ui/dialog';
import {SidebarProvider,SidebarInset} from '@/components/ui/sidebar';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {isDemoDeployment} from '@/lib/deployment';
import {usesSupabase} from '@/lib/supabase/config';
import {ClientPicker,Members,useQuoteBillBackup,BillBackupStatus,OpenBills,type MemberProfile} from './workspace-access';
import {AppNavigation} from './navigation';
import {AppToolbar} from './app-toolbar';
import {ManagementDashboard} from './management-dashboard';
import {UserGuide} from './user-guide';
import {EquipmentCatalog} from './catalog';
import {ProjectLocation} from './project-location';
import {EnergyPanel} from './energy-panel';
import {DocumentShare} from './document-share';
import {autoFillBill,clearAutomaticBillValues,type BillValues} from '@/lib/bill-extraction';
import {BillUpload, useBillAttachment} from './bill-upload';
import {ActivityHistory} from './activity';
import {WorkspaceStatus} from './workspace-status';
import {CustomerLocationFields} from './customer-location';
import {ClientsDirectory} from './clients';
import {QuoteHistory} from './quote-history';
import {CommercialFields,PaymentSummary,RoiReference} from './commercial-panel';
import {workflowReadiness} from '@/lib/workflow';
import {proposalTitle,customerDocumentSettings} from '@/lib/commercial';
import {newEnergyInput} from '@/lib/energy';
import {Toaster,toast} from 'sonner';
import {calculate,initialProducts,initialSettings,newQuote,money,systems,systemNames,installation as defaultInstallation,type Product,type Settings,type QuoteInput,type SavedQuote,mergeQuotePatch,reconcileQuoteProducts,panelQuantities,followsPanelCount,productUnit,isInstallation} from '@/lib/quote';
import {Proposal} from './proposal';
import {ProposalEditor} from './proposal-editor';
import {AdditionalServices} from './additional-services';
import {serviceQuantities,isLinearDrop,equipmentCategories} from '@/lib/additional-services';
import {InstallationPanel} from './installation-panel';
import {ProjectionPanel} from './projection-panel';
import {proposalImages} from '@/lib/proposal-document';
import {SWRConfig} from 'swr';
import {documents,pending,received,remaining} from '@/lib/documents';

function Choice({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}){return <label>{label}<Select value={value} onValueChange={onChange}><SelectTrigger className="select-control" aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></label>}
function NumberField({label,value,onChange,step=1}:{label:string;value:number;onChange:(v:number)=>void;step?:number}){return <label>{label}<Input aria-label={label} type="number" min={0} max={1e10} step={step} value={value} onChange={e=>onChange(Math.max(0,Number(e.target.value)||0))}/></label>}
const labelCategory=(s:string)=>s.toLocaleLowerCase('es').replace(/^./,c=>c.toUpperCase());
async function request<T=Record<string,any>>(path:string,init?:RequestInit):Promise<T>{const r=await fetch(path,init);const body=await r.json() as T&{error?:string};if(!r.ok)throw Error(body.error||'No se pudo completar la operación.');return body;}
function downloadBlob(bytes:Uint8Array,name:string){const a=document.createElement('a');const blob=new Blob([bytes as BlobPart],{type:'application/pdf'});const url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}

export default function QuoteApp(){
 const [cacheConfig]=useState(()=>({provider:()=>new Map()}));
 return <SWRConfig value={cacheConfig}><QuoteWorkspace/></SWRConfig>;
}
function QuoteWorkspace(){

 const [profile,setProfile]=useState<MemberProfile|null>(null),[clientId,setClientId]=useState<string|null>(null),[installation,setInstallation]=useState(defaultInstallation);
 const backup=useQuoteBillBackup(profile?.id);
 const [sourceQuoteId,setSourceQuoteId]=useState<string|null>(null);
 const isAdmin=!usesSupabase||profile?.role==='admin';
 const [products,setProducts]=useState<Product[]>(initialProducts),[settings,setSettings]=useState<Settings>(initialSettings),[quote,setQuote]=useState<QuoteInput>(newQuote),[tab,setTab]=useState('quote');
 const [clientRefresh,setClientRefresh]=useState(0);
 const [historyRefresh,setHistoryRefresh]=useState(0);
 const [step,setStep]=useState('customer'),[resetOpen,setResetOpen]=useState(false);
 const stages = [{id:'customer',name:'Cliente y boleta'},{id:'system',name:'Equipos'},{id:'installation',name:'Instalación'},{id:'review',name:'Revisión y envío'}] as const;
 const [confirmed,setConfirmed]=useState<string[]>([]);
 const stageIndex=stages.findIndex(s=>s.id===step);
 const stageTitles=Object.fromEntries(stages.map(s=>[s.id,s.name]));
 function moveStep(next:string){setStep(next);requestAnimationFrame(()=>{document.getElementById('quote-stage-title')?.focus({preventScroll:true});document.querySelector('.stage-navigation')?.scrollIntoView({block:'start'})})}
 const [revision,setRevision]=useState(0),[loaded,setLoaded]=useState(false),[loadError,setLoadError]=useState(''),[configDirty,setConfigDirty]=useState(false),[busy,setBusy]=useState(false);
 const [saved,setSaved]=useState<SavedQuote|null>(null),[preview,setPreview]=useState<SavedQuote|null>(null);
 const [editorSource,setEditorSource]=useState<SavedQuote|null>(null);
 const [shareTarget,setShareTarget]=useState<{quote:SavedQuote;whatsapp:boolean}|null>(null);
 const emailInvalid=!!quote.customer.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quote.customer.email);
 const calculation=useMemo(()=>{try{return calculate(emailInvalid?{...quote,customer:{...quote.customer,email:''}}:quote,products,settings,installation)}catch{return null}},[quote,products,settings,emailInvalid,installation]);
 const ready=workflowReadiness(quote,products,calculation,installation);
 const update=(patch:Partial<QuoteInput>)=>{setQuote(q=>{const next=reconcileQuoteProducts(mergeQuotePatch(q,patch),products);return {...next,quantities:panelQuantities(next,products)}});setConfirmed(previous=>previous.filter(id=>id!=='review' && !(id==='customer'&&('customer' in patch||('energy' in patch&&['consumptionKwh','billingDays','distributor','tariff','billReviewed'].some(key=>patch.energy?.[key as keyof typeof patch.energy]!==quote.energy?.[key as keyof typeof quote.energy])))) && !(id==='system'&&('system' in patch||'quantities' in patch)) && !(id==='installation'&&['system','quantities','installationOverride','installationNote','customServices','extra','extraLabel','discount','discountPercent','showDiscount','hiddenLineIds','showItemDetails'].some(key=>key in patch))));setSaved(null)};
 const automaticBillValues=useRef<BillValues>({});
 const currentQuote=useRef(quote);currentQuote.current=quote;
 const bill=useBillAttachment(()=>{update(clearAutomaticBillValues(currentQuote.current,automaticBillValues.current));automaticBillValues.current={}},extraction=>{const merged=autoFillBill(currentQuote.current,extraction,automaticBillValues.current);automaticBillValues.current=merged.automatic;update(merged.patch);return merged.result});
 const draftFiles=useMemo(()=>bill.attachments.map(a=>a.file),[bill.attachments]);
 const draftValue=useMemo(()=>({input:quote,clientId,sourceQuoteId,step,files:draftFiles}),[quote,clientId,sourceQuoteId,step,draftFiles]);
 const draft=useQuoteDraft(profile?.id,draftValue,async recovered=>{await bill.restore(recovered.files);const recoveredQuote=reconcileQuoteProducts(recovered.input,products);setQuote({...recoveredQuote,quantities:panelQuantities(recoveredQuote,products)});if(recoveredQuote!==recovered.input)toast.warning('Se retiraron equipos que ya no están en el catálogo. Revisa la propuesta recuperada.');setClientId(recovered.clientId);setSourceQuoteId(recovered.sourceQuoteId);setStep(stages.some(s=>s.id===recovered.step)?recovered.step:'customer');setConfirmed([]);setSaved(null)});
 const complete={customer:ready.customer&&confirmed.includes('customer'),system:ready.system&&confirmed.includes('system'),installation:ready.installation&&confirmed.includes('installation'),review:ready.review&&['customer','system','installation'].every(id=>confirmed.includes(id))};
 function continueStep(){if(ready[step as keyof typeof ready])setConfirmed(previous=>Array.from(new Set([...previous,step])));moveStep(stages[Math.min(stageIndex+1,stages.length-1)].id)}
 const editCustomer=(k:keyof QuoteInput['customer'],v:string|number)=>update({customer:{...quote.customer,[k]:v}});
 const updateSettings=(patch:Partial<Settings>)=>{setSettings(s=>({...s,...patch}));setConfigDirty(true);setSaved(null)};
 const workspaceLoad=useRef<AbortController|null>(null);
 async function load(){
  if(isDemoDeployment)return;
  workspaceLoad.current?.abort();
  const controller=new AbortController();workspaceLoad.current=controller;
  let timedOut=false;
  const timeout=setTimeout(()=>{timedOut=true;controller.abort()},20000);
  setLoadError('');
  try{const data=await request('/api/workspace',{signal:controller.signal});if(controller.signal.aborted)return;setProducts(data.products);setQuote(q=>{const next=reconcileQuoteProducts(q,data.products);return {...next,quantities:panelQuantities(next,data.products)}});setSettings(data.settings);setRevision(data.revision);if(data.profile)setProfile(data.profile);if(data.installation)setInstallation(data.installation);setLoaded(true);setConfigDirty(false);}
  catch(e){if(timedOut)setLoadError('La carga está tardando más de lo esperado. Revisa tu conexión y vuelve a intentarlo.');else if(!controller.signal.aborted)setLoadError((e as Error).message)}
  finally{clearTimeout(timeout)}
 }
 useEffect(()=>{void load();return()=>workspaceLoad.current?.abort()},[]);
 const stateRef=useRef({quote,products,settings,installation});stateRef.current={quote,products,settings,installation};
 useEffect(()=>{const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown,options:unknown)=>unknown}}).modelContext;if(!context?.registerTool)return;const control=new AbortController();try{Promise.resolve(context.registerTool({name:'read_quote_summary',title:'Consultar cotización actual',description:'Lee el cálculo y validaciones de la propuesta que está en pantalla. No guarda ni envía.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw Error('No se aceptan parámetros.');const s=stateRef.current;return calculate(s.quote,s.products,s.settings,s.installation)}},{signal:control.signal})).catch(()=>{});}catch{}return()=>control.abort()},[]);
 useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(configDirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler)},[configDirty]);
 function changeSystem(system:QuoteInput['system']){const rows=products.filter(p=>p.system===system);const quantities:Record<string,number>={};for(const cat of ['PANEL FOTOVOLTAICO','TIPO DE ESTRUCTURA','MATERIAL DE TECHO']){const p=rows.find(p=>p.category===cat);if(p)quantities[p.id]=8;}const inverter=rows.find(p=>p.category.includes('INVERSOR'));if(inverter)quantities[inverter.id]=1;for(const p of rows)if(isLinearDrop(p))quantities[p.id]=15;update({system,quantities,installationOverride:null,installationNote:''})}
 function choose(cat:string,id:string){const quantities={...quote.quantities};for(const p of products.filter(p=>p.system===quote.system&&p.category===cat))delete quantities[p.id];if(id!=='none'){const p=products.find(p=>p.id===id)!;quantities[id]=cat==='PANEL FOTOVOLTAICO'?(calculation?.panels||8):followsPanelCount(p)?(calculation?.panels||8):1;}update({quantities})}
 const setQty=(p:Product,n:number)=>update({quantities:panelQuantities({...quote,quantities:serviceQuantities(quote,products,p,productUnit(p)==='panel'||p.unit==='unidad'?Math.floor(n):n)},products)});
 function removeProduct(id:string){
  if(!isAdmin||busy||!loaded||products.length<=1)return;
  const nextProducts=products.filter(p=>p.id!==id);
  if(nextProducts.length===products.length)return;
  setProducts(nextProducts);setConfigDirty(true);setSettings(s=>({...s,approved:false}));
  setQuote(q=>({...reconcileQuoteProducts(q,nextProducts),technicalReviewed:false}));setSaved(null);setPreview(null);setConfirmed([]);
  toast.info('Equipo retirado. Guarda el catálogo para confirmar la eliminación y revisa los totales de la propuesta en curso.');
 }
 async function saveConfig(){setBusy(true);try{const result=await request('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({products,settings,revision})});setRevision(result.revision);setConfigDirty(false);toast.success('Catálogo y configuración guardados.');}catch(e){toast.error((e as Error).message)}finally{setBusy(false)}}
 async function saveQuote():Promise<SavedQuote|null>{return saveQuoteInput(quote);}
 async function saveQuoteInput(editedInput:QuoteInput):Promise<SavedQuote|null>{
  if(busy||backup.busy)return null;
  if(backup.pending){toast.error('Completa el respaldo pendiente antes de guardar otra versión.');return null}
  if(emailInvalid){setStep('customer');toast.error('Revisa el correo electrónico del cliente.');return null}
  if(configDirty){toast.error('Guarda primero los cambios del catálogo o configuración.');return null}
  const files=bill.attachments.map(document=>document.file);
  setBusy(true);
  try{
   if(usesSupabase&&files.length){if(!profile)throw Error('Vuelve a iniciar sesión para respaldar las boletas.');await backup.validate(files)}
   const result=await request<SavedQuote>('/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:editedInput,revision,clientId,sourceQuoteId})});
   setSaved(result);setSourceQuoteId(result.id);if(result.clientId)setClientId(result.clientId);
   if(usesSupabase&&files.length&&profile){
    if(await backup.save(result,files,profile.id))toast.success('Cotización y boletas guardadas: '+result.folio);
    else toast.error('Cotización guardada. Falta completar el respaldo de las boletas.');
   }else toast.success('Versión guardada: '+result.folio);
   return result;
  }catch(e){toast.error((e as Error).message);return null}finally{setBusy(false)}
 }
 async function prepareRevision(q:SavedQuote){
  if(busy||backup.busy)return;
  setBusy(true);
  try{
   const files:File[]=[];
   if(usesSupabase){
    const source=await request<{files:{name:string;url:string}[]}>(`/api/quotes/${q.id}/bills`);
    files.push(...await Promise.all(source.files.map(async entry=>{
     const response=await fetch(entry.url);if(!response.ok)throw Error('No se pudo recuperar una boleta. Vuelve a intentar crear la revisión.');
     const blob=await response.blob();const extension=({'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'} as Record<string,string>)[blob.type];
     if(!extension)throw Error('No se pudo reconocer el formato de la boleta respaldada.');
     return new File([blob],`${entry.name}.${extension}`,{type:blob.type});
    })));
   }
   await bill.restore(files);
   setSourceQuoteId(q.id);setClientId(q.clientId??null);update({...q.input,customServices:q.input.customServices??[],energy:q.input.energy,documentTerms:q.input.documentTerms,documentWarranty:q.input.documentWarranty,documentValidDays:q.input.documentValidDays,proposalContent:q.input.proposalContent,documentPaymentSchedule:q.input.documentPaymentSchedule,finalTotalOverride:q.input.finalTotalOverride});if(reconcileQuoteProducts(q.input,products)!==q.input)toast.warning('La nueva revisión excluye equipos retirados del catálogo. Revisa y selecciona sus reemplazos.');setConfirmed([]);setTab('quote');moveStep('customer');
   toast.info('Copia preparada con los precios actuales'+(files.length?' y sus boletas.':'.')+' Revisa los cambios antes de guardar.');
   return {...reconcileQuoteProducts(q.input,products),technicalReviewed:false};
  }catch(e){toast.error((e as Error).message)}finally{setBusy(false)}
 }

 async function editProposal(q:SavedQuote){
  if(busy||backup.busy||configDirty){toast.info('Completa el guardado pendiente antes de editar la propuesta.');return;}
  const input=q.id==='draft'?q.input:await prepareRevision(q);
  if(input)setEditorSource({...q,input});
 }
 async function saveProposalEdits(input:QuoteInput){
  const result=await saveQuoteInput(input);
  if(!result)return false;
  setQuote(input);setPreview(result);setEditorSource(null);setHistoryRefresh(n=>n+1);
  return true;
 }
 const previewQuote:SavedQuote|null=calculation?{id:'draft',folio:'BORRADOR-SVX',date:new Date().toISOString(),input:quote,settings,calculation}:null;
 function snapshot():SavedQuote|null{if(emailInvalid){setStep('customer');toast.error('Revisa el correo electrónico del cliente.');return null}if(!calculation){toast.error('Revisa los datos, especialmente el correo electrónico.');return null}return saved||{id:'draft',folio:'BORRADOR-SVX',date:new Date().toISOString(),input:quote,settings,calculation}}
 async function pdfBytes(q:SavedQuote){const paths=['/proposal/logo-transparent-v2.png',proposalImages.roof,...(q.input.proposalContent?[]:[proposalImages.home])];const [pdf,assets]=await Promise.all([import('@/lib/pdf'),Promise.all(paths.map(async path=>{const response=await fetch(path);if(!response.ok)throw Error('No se pudo cargar una imagen de la propuesta.');return response.arrayBuffer()}))]);return pdf.quotePdf(q,assets[0],{roof:assets[1],home:assets[2]})}
 async function download(q:SavedQuote){setBusy(true);try{downloadBlob(await pdfBytes(q),q.folio+'.pdf');toast.success('PDF preparado para descargar.')}catch{toast.error('No se pudo generar el PDF. Inténtalo nuevamente.')}finally{setBusy(false)}}
 function openEmail(){window.open('https://mail.hostinger.com/','_blank','noopener,noreferrer');toast.info('Ingresa con tu correo corporativo y su contraseña. Si aparece otra cuenta, cambia de sesión en Hostinger. Adjunta el PDF descargado antes de enviar.',{duration:8000});}

 const rows=products.filter(p=>p.system===quote.system);const mainCats=equipmentCategories(rows);
 const services=rows.filter(p=>!mainCats.includes(p.category)&&!isInstallation(p));
 const issuing=useRef(false);
 async function issueForCustomer(q:SavedQuote){
  if(busy||issuing.current)return;
  const problems=issuanceProblems(q);
  if(problems.length){toast.error(problems.join(' '));return}
  if(backup.pending||bill.loading||bill.reading){toast.error('Completa la lectura y el respaldo de boletas antes de emitir.');return}
  issuing.current=true;
  try{
   const stored=q.id==='draft'?await saveQuote():q;
   if(!stored)return;
   // Keep the saved version in preview even if issuing fails, so retries reuse it.
   setPreview(stored);setBusy(true);
   const issued=await request<SavedQuote>(`/api/quotes/${stored.id}/issue`,{method:'POST'});
   setPreview(issued);setHistoryRefresh(n=>n+1);if(q.id==='draft'||saved?.id===issued.id)setSaved(issued);
   toast.success('Cotización emitida: '+issued.folio+'. Ya puedes descargarla o compartirla.');
  }catch(e){toast.error((e as Error).message)}finally{issuing.current=false;setBusy(false)}
 }
 const actions=(q:SavedQuote)=><>{!isIssued(q)&&<div className="quote-issue-panel"><div><strong>Preparar cotización para el cliente</strong><p>Emite esta versión para asignar su número correlativo y habilitar la descarga y el envío. Los importes y las condiciones se conservan.</p>{issuanceProblems(q).map(problem=><p key={problem} className="field-error">{problem}</p>)}</div><Button disabled={busy||!usesSupabase||issuanceProblems(q).length>0} onClick={()=>void issueForCustomer(q)}><CheckCircle2/>{busy?'Emitiendo…':'Emitir cotización para cliente'}</Button></div>}
 <div className="doc-actions"><Button variant="outline" disabled={busy} onClick={()=>void editProposal(q)}>Editar propuesta</Button><Button disabled={busy||!isIssued(q)} onClick={()=>download(q)}><Download/>Descargar PDF</Button><Button variant="outline" disabled={busy||!isIssued(q)} onClick={()=>{setPreview(q);setTimeout(()=>window.print(),250)}}><Printer/>Imprimir</Button><Button variant="outline" disabled={busy||!isIssued(q)} onClick={()=>setShareTarget({quote:q,whatsapp:true})}><MessageCircle/>WhatsApp</Button><Button variant="outline" disabled={busy||!isIssued(q)} onClick={openEmail} title="Abrir correo corporativo en Hostinger (nueva pestaña)"><Mail/>Correo</Button><Button variant="outline" disabled={busy||!isIssued(q)} onClick={()=>setShareTarget({quote:q,whatsapp:false})}><Share2/>Compartir archivo</Button></div></>;

 if(usesSupabase&&!loaded)return <WorkspaceStatus error={loadError||undefined} onRetry={()=>void load()}/>;
 return <Tabs className="app-root" orientation="vertical" value={tab} onValueChange={setTab}><SidebarProvider style={{'--sidebar-width':'248px'} as React.CSSProperties}><AppNavigation tab={tab} isAdmin={isAdmin} usesSupabase={usesSupabase}/><SidebarInset className="app-main"><Toaster richColors position="top-center"/><AppToolbar profile={profile} status={isDemoDeployment?"Demostración":loaded?"Espacio conectado":loadError?"Sin conexión":"Conectando…"}/><div className="workspace"><div className="screen-only">
 <div className="page-heading"><div><h1>{({quote:'Prepara tu próxima propuesta',dashboard:'Resumen de gestión',guide:'Manual de uso',clients:'Directorio de clientes',catalog:'Equipos y precios',history:'Tus cotizaciones',settings:'Tu empresa',members:'Usuarios del equipo',activity:'Historial de actividad',pending:'Documentación'} as Record<string,string>)[tab]}</h1><p className="heading-sub">{({quote:'Del consumo del cliente a una propuesta solar, paso a paso.',dashboard:'Actividad comercial del equipo, mes a mes.',guide:'Consulta el manual visual o encuentra una respuesta por tema.',clients:'Contactos, ubicaciones y datos de cada proyecto en un solo lugar.',catalog:'Un catálogo organizado para cotizar con confianza.',history:'Cada proyecto, con sus precios y versiones a mano.',settings:'La información que representa a Solvex Solar en cada propuesta.',members:'Un equipo de administradores para gestionar cada proyecto.',activity:'Quién cambió qué, cuándo y cómo quedó.',pending:'Respaldo técnico y comercial para tus proyectos.'} as Record<string,string>)[tab]}</p></div>{tab==='quote'&&<Button className="heading-preview" disabled={!calculation} onClick={()=>setPreview(snapshot())}><FileText size={17}/>Vista previa<ArrowUpRight size={16}/></Button>}</div>

 <BillBackupStatus backup={backup}/>{tab==='quote'&&<DraftStatus draft={draft}/>}
 {isDemoDeployment&&<div className="notice" role="status"><AlertCircle size={18}/><div><strong>Demostración con precios ficticios</strong><p>Puedes calcular y descargar borradores. Los cambios se pierden al cerrar o recargar. El acceso privado y el historial están pendientes de conectar.</p></div></div>}
 {loadError&&<div className="notice"><AlertCircle size={18}/><div>{loadError}<p>Puedes configurar una propuesta; el guardado necesita conexión.</p></div><Button variant="outline" onClick={()=>load()}>Reintentar</Button><a href={usesSupabase?'/acceso':'/signin-with-chatgpt?return_to=/'} target="_top">Iniciar sesión</a></div>}
 {configDirty&&<div className="notice">Tienes cambios del catálogo o de la empresa sin guardar.<Button disabled={busy||!loaded} onClick={saveConfig}>Guardar cambios</Button></div>}
 {usesSupabase&&isAdmin&&<TabsContent value="dashboard"><ManagementDashboard onNavigate={setTab}/></TabsContent>}<TabsContent value="guide"><UserGuide/></TabsContent>
 {usesSupabase&&<TabsContent value="clients"><ClientsDirectory onPreview={setPreview} isAdmin={isAdmin} onChange={client=>{setClientRefresh(v=>v+1);if(client.id===clientId){if(client.deleted_at){bill.clear();setSourceQuoteId(null);setClientId(null);update({customer:newQuote().customer,energy:undefined});setConfirmed([])}else update({customer:client.details})}}} onQuote={client=>{bill.clear();setSourceQuoteId(null);setClientId(client.id);update({customer:client.details,energy:undefined});setConfirmed([]);setStep("customer");setTab("quote")}}/></TabsContent>}
 <TabsContent value="quote"><Tabs value={step} onValueChange={moveStep} className="quote-stages"><TabsList className="stage-navigation" aria-label="Etapas de cotización">{stages.map((x,i)=><TabsTrigger key={x.id} value={x.id} data-complete={complete[x.id]}><span className="stage-number">{i+1}</span><span className="stage-copy"><strong>{x.name}</strong><small>{step===x.id?'Estás aquí':complete[x.id]?'Completado':ready[x.id]?'Por revisar':'Pendiente'}</small></span>{complete[x.id]&&<Check size={14} className="stage-check"/>}</TabsTrigger>)}</TabsList><div className="quote-layout"><div className="stage-workspace"><h2 id="quote-stage-title" className="sr-only" tabIndex={-1}>{stageTitles[step as keyof typeof stageTitles]}</h2><TabsContent value="system"><section className="card system-card"><div className="section-heading"><span className="step">2</span><div><h2>Sistema fotovoltaico</h2><p className="section-caption">Selecciona la configuración y los equipos.</p></div><PanelsTopLeft className="section-icon ml-auto" size={22}/></div><RadioGroup className="system-options" aria-label="Tipo de proyecto" value={quote.system} onValueChange={v=>changeSystem(v as QuoteInput['system'])}>{systems.map((s,i)=>{const Icon=s==='OFF GRID'?Unplug:s.includes('HIBRIDO')?BatteryCharging:Zap;return <label className="system-option" data-selected={quote.system===s} key={s}><RadioGroupItem value={s} aria-label={systemNames[s]}/><Icon size={23}/><strong>{s.includes('HIBRIDO')?'Híbrido':s==='OFF GRID'?'Off Grid':'On Grid'}</strong><span>{s==='OFF GRID'?'Sistema aislado':s.includes('TRIFASICO')?'Trifásico':'Monofásico'}</span></label>})}</RadioGroup><div className="equipment-grid">{mainCats.map(cat=>{const options=rows.filter(p=>p.category===cat),chosen=options.find(p=>(quote.quantities[p.id]||0)>0);return <div className="product-choice" key={cat}><span className="product-icon">{cat.includes('PANEL')?<Grid2X2 size={21}/>:cat.includes('INVERSOR')?<Zap size={21}/>:cat.includes('BATER')?<BatteryCharging size={21}/>:<PanelsTopLeft size={21}/>}</span><Choice label={labelCategory(cat)} value={chosen?.id||'none'} onChange={id=>choose(cat,id)} options={[{value:'none',label:'Sin seleccionar'},...options.map(p=>({value:p.id,label:p.name}))]}/>{chosen&&<div className="qty-line"><div><span className="unit-price">{chosen.price===null?'Precio pendiente':money(chosen.price)}</span><small> / {productUnit(chosen)}</small></div><label className="quantity-field"><span>{followsPanelCount(chosen)?'Según paneles':'Cantidad'}</span><Input readOnly={followsPanelCount(chosen)} type="number" aria-label={'Cantidad '+cat} min={0} step={chosen.unit==='metro'?0.1:1} value={followsPanelCount(chosen)?calculation?.panels||0:quote.quantities[chosen.id]||0} onChange={e=>setQty(chosen,Math.max(0,+e.target.value||0))}/></label></div>}</div>})}</div><div className="equipment-docs-note"><FileText size={19}/><div><strong>Fichas técnicas por vincular</strong><p>Los equipos se cargan desde el catálogo privado. Revisa y vincula las fichas recibidas antes de aprobar modelos y compatibilidad.</p><Button variant="link" onClick={()=>setTab('pending')}>Ver documentación</Button></div></div></section></TabsContent>
 <TabsContent value="installation"><section className="card"><div className="section-heading"><span className="step">3</span><div><h2>Instalación y adicionales</h2><p className="section-caption">Define los servicios y ajustes de la propuesta.</p></div></div><InstallationPanel quote={quote} panels={calculation?.panels||0} rates={installation} onChange={update}/><h3 className="form-subtitle">Servicios y materiales adicionales</h3><AdditionalServices priceLabel={settings.taxMode==='net'?'Precio unitario (CLP, neto)':settings.taxMode==='included'?'Precio unitario (CLP, IVA incluido)':'Precio unitario (CLP)'} services={services} quote={quote} onChange={update} onQuantityChange={setQty}/><div className="field-grid"><NumberField label="Otros costos (CLP)" value={quote.extra} onChange={extra=>update({extra})}/><DiscountField quote={quote} onChange={update}/></div><label>Detalle de otros costos<Input value={quote.extraLabel} onChange={e=>update({extraLabel:e.target.value})} placeholder="Flete, trabajos especiales u otro servicio"/></label></section></TabsContent>
 <TabsContent value="customer"><section className="card"><div className="section-heading"><span className="step">1</span><div><h2>Cliente y consumo eléctrico</h2><p className="section-caption">Puedes preparar una propuesta preliminar sin boleta; la propuesta final requiere consumo verificado.</p></div></div>{usesSupabase&&<ClientPicker refresh={clientRefresh} onManage={()=>setTab('clients')} customer={quote.customer} clientId={clientId} onSave={id=>{setClientId(id);setSaved(null)}} onSelect={client=>{bill.clear();setSourceQuoteId(null);setClientId(client?.id??null);update({customer:client?.details??newQuote().customer,energy:undefined});setConfirmed([])}}/>}<BillUpload bill={bill} quote={quote} onApply={patch=>{update(patch);toast.success('Datos cargados. Confirma el consumo y los días con la boleta.')}}/><h3 className="form-subtitle">Datos del cliente</h3><div className="field-grid">{([['name','Nombre y apellido'],['email','Correo electrónico'],['phone','Teléfono con código de país'],['address','Dirección (opcional)']] as const).map(([k,label])=><label key={k}>{label}<Input aria-label={label} aria-invalid={k==='email'&&emailInvalid||undefined} aria-describedby={k==='email'&&emailInvalid?'customer-email-error':undefined} type={k==='email'?'email':k==='phone'?'tel':'text'} value={quote.customer[k]} onChange={e=>editCustomer(k,e.target.value)} placeholder={k==='phone'?'+56 9 1234 5678':undefined}/>{k==='email'&&emailInvalid&&<span className="field-error" id="customer-email-error">Ingresa un correo válido, por ejemplo nombre@empresa.cl.</span>}</label>)}<CustomerLocationFields region={quote.customer.region} commune={quote.customer.commune} onChange={location=>update({customer:{...quote.customer,...location}})}/><NumberField label="Monto de la boleta (CLP)" value={quote.customer.bill} onChange={v=>editCustomer('bill',v)}/></div><ProjectLocation address={{address:quote.customer.address,commune:quote.customer.commune,region:quote.customer.region}} latitude={quote.energy?.latitude??null} longitude={quote.energy?.longitude??null} onChange={point=>update({energy:{...(quote.energy??newEnergyInput()),...point}})}/><EnergyPanel mode="consumption" value={quote.energy} peakPower={calculation?.kwp||0} onChange={energy=>update({energy})}/></section></TabsContent><TabsContent value="review"><section className="card review-card"><div className="section-heading"><span className="step">4</span><div><h2>Revisión y envío</h2><p className="section-caption">Comprueba el proyecto antes de preparar el documento.</p></div></div><div className="review-checklist">{stages.slice(0,3).map(stage=><button key={stage.id} type="button" onClick={()=>moveStep(stage.id)}><span className="review-state" data-complete={complete[stage.id]}>{complete[stage.id]?<CheckCircle2 size={19}/>:<AlertCircle size={19}/>}</span><span><strong>{stage.name}</strong><small>{complete[stage.id]?'Datos completados':ready[stage.id]?'Revisa esta etapa y pulsa Continuar':'Faltan datos por completar'}</small></span><ChevronRight size={18}/></button>)}</div><EnergyPanel mode="solar" onEditLocation={()=>moveStep('customer')} address={{address:quote.customer.address,commune:quote.customer.commune,region:quote.customer.region}} value={quote.energy} peakPower={calculation?.kwp||0} onChange={energy=>update({energy})}/><Choice label="Forma de pago propuesta" value={quote.payment} onChange={payment=>update({payment})} options={['Transferencia bancaria','Tarjeta Débito','Tarjeta Crédito'].map(s=>({value:s,label:s}))}/><label>Alcance y comentarios<Textarea rows={4} value={quote.notes} onChange={e=>update({notes:e.target.value})} placeholder="Describe inclusiones, exclusiones y observaciones de la visita."/></label><CommercialFields quote={quote} settings={settings} onChange={update}/><RoiReference quote={quote} calculation={calculation} settings={settings}/>{calculation&&<ProjectionPanel q={previewQuote!} onChange={projection=>update({projection})}/>}<FinalQuoteTotal quote={quote} calculation={calculation} onChange={update}/><PaymentSummary total={calculation?.total||0} settings={customerDocumentSettings(quote,settings)}/><p className="help-text">Las validaciones pendientes aparecerán en el borrador. Revisa precios, IVA y condiciones aprobadas antes de enviarlo al cliente.</p><div className="review-delivery"><FileText size={22}/><div><h3>Prepara el documento del cliente</h3><p>En la vista previa puedes descargar el PDF, imprimirlo o compartirlo.</p></div></div></section></TabsContent><div className="stage-actions"><Button variant="outline" disabled={stageIndex===0} onClick={()=>moveStep(stages[stageIndex-1].id)}><ArrowLeft/>Anterior</Button><span>Paso {stageIndex+1} de 4</span>{step==='review'?<Button disabled={!calculation} onClick={()=>setPreview(snapshot())}>Vista previa y envío<FileText/></Button>:<Button onClick={continueStep}>Continuar<ArrowRight/></Button>}</div></div>
 <aside className="summary"><div className="summary-head"><div className="solar-emblem" aria-hidden="true"><Sun size={30}/><Grid2X2 size={68}/></div><div className="summary-title"><span>Resumen del proyecto</span><Sun size={20}/></div><h2>{(calculation?.kwp||0).toLocaleString('es-CL',{maximumFractionDigits:3})} <small>kWp</small></h2><p>{calculation?.panels||0} paneles · {systemNames[quote.system]}</p></div><div className="summary-body"><div className="workflow-status"><strong>Avance de la propuesta</strong><span>{Object.values(complete).filter(Boolean).length} de 4 etapas completadas</span><div className="workflow-track" aria-hidden="true">{Object.entries(complete).map(([id,done])=><span key={id} data-complete={done} data-current={step===id}/>)}</div></div><div className="summary-row"><span>Equipos e instalación</span><strong>{money(calculation?.subtotal||0)}</strong></div><div className="summary-row"><span>Descuento</span><strong>− {money(calculation?.discount||0)}</strong></div><div className="summary-row"><span>IVA {settings.taxMode==='included'?'incluido':settings.taxMode==='net'?'adicional':''}</span><strong>{calculation?.tax==null?'Por confirmar':money(calculation.tax)}</strong></div>{!!calculation?.totalAdjustment&&<div className="summary-row"><span>Ajuste final {settings.taxMode!=='pending'?'(IVA incluido)':''}</span><strong>{calculation.totalAdjustment>0?'+ ':'− '}{money(Math.abs(calculation.totalAdjustment))}</strong></div>}<div className="total-box"><p>{calculation?.complete?(quote.finalTotalOverride!=null?'Total final':'Total calculado'):'Subtotal parcial'}</p><strong className="money">{money(calculation?.total||0)}</strong><span>Valor expresado en pesos chilenos</span></div><div className="draft-status"><FileText size={16}/>{saved&&isIssued(saved)?'COTIZACIÓN EMITIDA':proposalTitle(quote,saved?.calculation.official??false)}</div><Button className="primary" disabled={busy||!calculation} onClick={()=>setPreview(snapshot())}><FileText/>Ver propuesta<ChevronRight className="ml-auto" size={16}/></Button><Button className="secondary-button" disabled={busy||backup.pending||bill.loading||bill.reading||!loaded||!calculation||configDirty} onClick={saveQuote}><Save/>{busy?'Guardando…':saved?'Guardar nueva versión':'Guardar en historial'}</Button>{saved&&<p className="saved-caption"><Check size={14}/>{saved.folio}</p>}<Button variant="ghost" className="reset-button" onClick={()=>setResetOpen(true)}><Plus/>Nueva cotización</Button><details className="validation"><summary>{calculation?.warnings.length||0} validaciones pendientes</summary>{calculation?.warnings.map((w,i)=><p key={i}>{w}</p>)}{!calculation&&<p>Revisa los datos ingresados y el correo electrónico.</p>}</details><p className="hint">Consulta el ahorro automático en Revisión y envío. Revisa consumo, generación solar y supuestos antes de incluirlo en el PDF.</p></div></aside></div><div className="mobile-quote-bar"><div><span>{calculation?.complete?(quote.finalTotalOverride!=null?'Total final':'Total calculado'):'Subtotal parcial'}</span><strong>{money(calculation?.total||0)}</strong></div><Button disabled={!calculation} onClick={()=>setPreview(snapshot())}>Ver propuesta<ArrowUpRight size={16}/></Button></div></Tabs></TabsContent>
 <TabsContent value="catalog"><EquipmentCatalog products={products} dirty={configDirty} busy={busy} loaded={loaded} canEdit={isAdmin} demo={isDemoDeployment} onRemove={removeProduct} onSave={saveConfig} onApply={product=>{setProducts(ps=>ps.some(p=>p.id===product.id)?ps.map(p=>p.id===product.id?product:p):[...ps,product]);setConfigDirty(true);setSettings(s=>({...s,approved:false}));setSaved(null);setConfirmed([]);setQuote(q=>({...q,technicalReviewed:false}));toast.info('Cambios aplicados. Guarda el catálogo para compartirlos.')}}/></TabsContent>
 <TabsContent value="history"><QuoteHistory key={historyRefresh} isAdmin={profile?.role==='admin'} onPreview={setPreview} onDeleted={id=>{if(saved?.id===id)setSaved(null);if(preview?.id===id)setPreview(null);if(shareTarget?.quote.id===id)setShareTarget(null);}} renderAttachments={usesSupabase?q=><OpenBills quoteId={q.id}/>:undefined} onRevision={q=>void prepareRevision(q)}/></TabsContent>
 <TabsContent value="activity">{profile?.role==='admin'&&<ActivityHistory/>}</TabsContent><TabsContent value="members">{profile?.role==='admin'&&<Members currentId={profile.id} onColorChange={color=>setProfile(p=>p?{...p,identification_color:color}:p)}/>}</TabsContent><TabsContent value="settings"><section className="card"><div className="section-heading"><h2>Datos de la empresa</h2><Button className="ml-auto" disabled={busy||!configDirty||!loaded} onClick={saveConfig}><Save/>Guardar configuración</Button></div><p>Completar y validar antes de emitir propuestas definitivas.</p><div className="field-grid">{([['name','Nombre comercial'],['legal','Razón social'],['rut','RUT'],['address','Dirección'],['email','Correo comercial'],['phone','Teléfono comercial']] as const).map(([k,label])=><label key={k}>{label}<Input value={settings[k]} onChange={e=>updateSettings({[k]:e.target.value})}/></label>)}<NumberField label="Vigencia de cotización (días)" value={settings.validDays} onChange={validDays=>updateSettings({validDays})}/><Choice label="Precios del catálogo e IVA" value={settings.taxMode} onChange={v=>updateSettings({taxMode:v as Settings['taxMode'],approved:false})} options={[{value:'pending',label:'Pendiente de confirmar'},{value:'included',label:'Precios incluyen IVA'},{value:'net',label:'Precios netos: agregar IVA'}]}/><NumberField label="Tasa IVA (%)" value={settings.taxRate} step={.1} onChange={taxRate=>updateSettings({taxRate,approved:false})}/></div><div className="notice"><AlertCircle size={18}/>El cliente confirmó que los precios incluyen IVA y margen. La instalación usa la columna “Monto IVA incl”; no se vuelve a aplicar el factor 1,4.</div><label>Condiciones de pago, inclusiones y exclusiones<Textarea rows={5} value={settings.terms} onChange={e=>updateSettings({terms:e.target.value,approved:false})}/></label><label className="spaced">Garantías de equipos e instalación<Textarea rows={4} value={settings.warranty} onChange={e=>updateSettings({warranty:e.target.value,approved:false})}/></label><label className="check-label"><Checkbox checked={settings.approved} onCheckedChange={v=>updateSettings({approved:v===true})}/>La empresa ha aprobado estos datos, precios y condiciones.</label></section></TabsContent>
 <TabsContent value="pending"><div className="pending-layout"><section><h2 className="mb-5">Información pendiente de completar</h2>{(settings.requirementsVersion?remaining:pending).map(p=><div className="card pending-card" key={p.title}><span className="document-marker"><ClipboardList size={19}/></span><div><h3>{p.title}</h3><p>{p.text}</p></div></div>)}</section><section className="card"><h2>Respuestas del cliente</h2>{settings.requirementsVersion?<><p className="hint">Cotizador - Fogeli.docx y ROI.xlsx · Recibidos el 29 de septiembre de 2026.</p>{received.map(item=><div className="technical-status" key={item.title}><h3>{item.title}</h3><p>{item.text}</p></div>)}</>:<p>Las respuestas comerciales aún no se han cargado en este espacio.</p>}<p className="hint">Las fichas técnicas recibidas requieren asociación al modelo definitivo. Los datos y precios del catálogo se consultan desde el espacio privado.</p>{documents.map(d=><a className="document-link" href={d.url} target="_blank" rel="noreferrer" key={d.url}><FileText size={18}/><div><strong>{d.name}</strong><p>{d.detail}</p></div><ArrowUpRight size={16}/></a>)}</section></div></TabsContent>
 <footer><strong>Solvex Solar</strong><span>Gestión de propuestas fotovoltaicas</span><span className="footer-access"><LockKeyhole size={12}/> Uso interno</span></footer></div>
 {shareTarget&&<DocumentShare quote={shareTarget.quote} whatsapp={shareTarget.whatsapp} onClose={()=>setShareTarget(null)}/>}
 <Dialog open={!!preview} onOpenChange={open=>{if(!open){if(editorSource){toast.info('Guarda o cancela la edición antes de cerrar.');return;}setPreview(null);}}}><DialogContent className="preview-dialog"><DialogHeader className="screen-only"><DialogTitle>Propuesta para el cliente</DialogTitle><DialogDescription>Descarga el PDF, imprímelo o prepara el archivo para compartirlo por WhatsApp. Correo abre Hostinger en otra pestaña: ingresa con tu cuenta corporativa y adjunta el PDF descargado.</DialogDescription></DialogHeader>{preview&&(editorSource?<ProposalEditor q={editorSource} products={products} settings={settings} rates={installation} busy={busy} onSave={saveProposalEdits} onCancel={()=>setEditorSource(null)}/>:<><div className="screen-only">{actions(preview)}</div><Proposal q={preview}/></>)}</DialogContent></Dialog>

 <AlertDialog open={resetOpen} onOpenChange={setResetOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Comenzar una nueva cotización?</AlertDialogTitle><AlertDialogDescription>Se restablecerán los datos de la propuesta en pantalla. Las versiones guardadas permanecerán en el historial.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Seguir editando</AlertDialogCancel><AlertDialogAction onClick={()=>{bill.clear();setSourceQuoteId(null);setClientId(null);update({...newQuote(),documentPaymentSchedule:undefined,energy:undefined,documentTerms:undefined,documentWarranty:undefined,documentValidDays:undefined});setConfirmed([]);moveStep('customer');toast.info('Nueva propuesta preparada.')}}>Nueva cotización</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div></SidebarInset></SidebarProvider></Tabs>
}
