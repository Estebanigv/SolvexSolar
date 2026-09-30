"use client";
import {SignOutButton,type MemberProfile} from './workspace-access';
import {InstallAppButton} from './install-app';
import {memberColorStyle} from '@/lib/member-color';
import {useEffect} from 'react';
import {FileText,Package,History,Settings,ClipboardList,ShieldCheck,ChevronRight,X,Users,ChartNoAxesCombined,BookOpen} from 'lucide-react';
import {TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Sidebar,SidebarHeader,SidebarContent,SidebarFooter,SidebarMenu,SidebarMenuItem,SidebarMenuButton,useSidebar} from '@/components/ui/sidebar';

export function AppNavigation({tab,isAdmin=true,usesSupabase=false,profile}:{tab:string;isAdmin?:boolean;usesSupabase?:boolean;profile?:MemberProfile|null}){
 const {setOpenMobile,isMobile}=useSidebar();
 useEffect(()=>setOpenMobile(false),[tab,setOpenMobile]);
 const name=profile?.full_name?.trim()||profile?.email||'Mi cuenta';
 const initials=profile?.full_name?.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'SS';
 const items=[...(usesSupabase&&isAdmin?[{id:'dashboard',name:'Resumen',icon:ChartNoAxesCombined}]:[]),{id:'quote',name:'Cotizador',icon:FileText},...(usesSupabase?[{id:'clients',name:'Clientes',icon:Users}]:[]),{id:'catalog',name:'Equipos y precios',icon:Package},{id:'history',name:'Cotizaciones',icon:History},{id:'settings',name:'Empresa',icon:Settings},{id:'pending',name:'Documentación',icon:ClipboardList},{id:'guide',name:'Guía de uso',icon:BookOpen},...(usesSupabase&&isAdmin?[{id:'members',name:'Usuarios',icon:Users},{id:'activity',name:'Actividad',icon:ClipboardList}]:[])].filter(item=>isAdmin||!['catalog','settings'].includes(item.id));
 return <Sidebar className="app-sidebar screen-only" collapsible="offcanvas"><SidebarHeader className="nav-brand">{isMobile&&<button type="button" className="nav-close" aria-label="Cerrar navegación" onClick={()=>setOpenMobile(false)}><X size={20}/></button>}<img src="/logo.jpg" alt="Solvex Solar"/><span>Plataforma comercial</span></SidebarHeader><SidebarContent className="nav-content"><p className="nav-label">Tu espacio de trabajo</p><TabsList className="side-tabs" aria-label="Navegación principal"><SidebarMenu>{items.map(({id,name,icon:Icon})=><SidebarMenuItem key={id}><SidebarMenuButton asChild isActive={tab===id}><TabsTrigger value={id} onClick={()=>{if(tab===id)setOpenMobile(false)}}><Icon/><span>{name}</span>{tab===id&&<ChevronRight className="nav-arrow"/>}</TabsTrigger></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></TabsList></SidebarContent><SidebarFooter className="nav-footer nav-account-footer"><div className="nav-person"><div className="nav-person-avatar team-person-color" style={memberColorStyle(profile?.identification_color,profile?.id||'workspace')} aria-hidden="true">{initials}</div><div className="nav-person-details"><strong>{name}</strong><span><ShieldCheck size={12}/>{profile?.role==='admin'?'Administrador':profile?.role==='sales'?'Ejecutivo comercial':'Espacio de trabajo'}</span></div></div>{profile?.email&&<p className="nav-person-email" title={profile.email}>{profile.email}</p>}<InstallAppButton/>{profile&&<SignOutButton/>}<p className="nav-company-caption">Solvex Solar · Plataforma comercial</p></SidebarFooter></Sidebar>
}

