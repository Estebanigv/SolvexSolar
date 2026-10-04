"use client";
import {useEffect} from 'react';
import Image from 'next/image';
import {FileText,Package,History,Settings,ClipboardList,ShieldCheck,ChevronRight,X,Users,ChartNoAxesCombined,BookOpen} from 'lucide-react';
import {SignOutButton,type MemberProfile} from './workspace-access';
import {InstallAppButton} from './install-app';
import {memberColorStyle} from '@/lib/member-color';
import {TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Sidebar,SidebarHeader,SidebarContent,SidebarFooter,SidebarMenu,SidebarMenuItem,SidebarMenuButton,useSidebar} from '@/components/ui/sidebar';
import './navigation.css';

export function AppNavigation({tab,isAdmin=true,usesSupabase=false,profile}:{tab:string;isAdmin?:boolean;usesSupabase?:boolean;profile?:MemberProfile|null}){
 const {setOpenMobile,isMobile}=useSidebar();
 useEffect(()=>setOpenMobile(false),[tab,setOpenMobile]);
 const name=profile?.full_name?.trim()||profile?.email||'Mi cuenta';
 const initials=profile?.full_name?.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'SS';
 const groups=[
  {id:'commercial',name:'Cotizador',description:'Proyectos y clientes',items:[
   {id:'quote',name:'Cotizador',icon:FileText},
   {id:'history',name:'Cotizaciones',icon:History},
   ...(usesSupabase?[{id:'clients',name:'Clientes',icon:Users}]:[]),
  ]},
  {id:'company',name:'Empresa',description:'Gestión interna',items:[
   ...(usesSupabase&&isAdmin?[{id:'dashboard',name:'Resumen de gestión',icon:ChartNoAxesCombined}]:[]),
   ...(isAdmin?[{id:'catalog',name:'Equipos y precios',icon:Package},{id:'settings',name:'Datos de empresa',icon:Settings}]:[]),
   ...(usesSupabase&&isAdmin?[{id:'members',name:'Usuarios',icon:Users},{id:'activity',name:'Actividad',icon:ClipboardList}]:[]),
   {id:'pending',name:'Documentación',icon:ClipboardList},
  ]},
  {id:'help',name:'Ayuda',description:'Aprende a usar la plataforma',items:[{id:'guide',name:'Manual de uso',icon:BookOpen}]},
 ];
 return <Sidebar className="app-sidebar grouped-navigation screen-only" collapsible="offcanvas">
  <SidebarHeader className="nav-brand">
   {isMobile&&<button type="button" className="nav-close" aria-label="Cerrar navegación" onClick={()=>setOpenMobile(false)}><X size={20}/></button>}
   <Image src="/proposal/logo-transparent-v2.png" alt="Solvex Solar" width={140} height={90} unoptimized/>
   <span>Plataforma comercial</span>
  </SidebarHeader>
  <SidebarContent className="nav-content">
   <TabsList className="side-tabs grouped-tabs" aria-label="Navegación principal">
    {groups.filter(group=>group.items.length>0).map(group=><div className="nav-section" key={group.id} role="group" aria-labelledby={`nav-${group.id}`}>
     <div className="nav-section-heading"><h2 id={`nav-${group.id}`}>{group.name}</h2><p>{group.description}</p></div>
     <SidebarMenu>{group.items.map(({id,name,icon:Icon})=><SidebarMenuItem key={id}>
      <SidebarMenuButton asChild isActive={tab===id}><TabsTrigger value={id} onClick={()=>{if(tab===id)setOpenMobile(false)}}><Icon/><span>{name}</span>{tab===id&&<ChevronRight className="nav-arrow"/>}</TabsTrigger></SidebarMenuButton>
     </SidebarMenuItem>)}</SidebarMenu>
    </div>)}
   </TabsList>
  </SidebarContent>
  <SidebarFooter className="nav-footer nav-account-footer">
   <div className="nav-account-summary"><div className="nav-person"><div className="nav-person-avatar team-person-color" style={memberColorStyle(profile?.identification_color,profile?.id||'workspace')} aria-hidden="true">{initials}</div><div className="nav-person-details"><strong>{name}</strong><span><ShieldCheck size={12}/>{profile?.role==='admin'?'Administrador':profile?.role==='sales'?'Ejecutivo comercial':'Espacio de trabajo'}</span></div></div>
   {profile?.email&&<p className="nav-person-email" title={profile.email}>{profile.email}</p>}</div>
   <InstallAppButton/>{profile&&<SignOutButton/>}
  </SidebarFooter>
 </Sidebar>
}

