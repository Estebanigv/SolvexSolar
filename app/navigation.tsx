"use client";
import {isDemoDeployment} from '@/lib/deployment';
import {useEffect} from 'react';
import {FileText,Package,History,Settings,ClipboardList,LockKeyhole,ChevronRight,Sun} from 'lucide-react';
import {TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Sidebar,SidebarHeader,SidebarContent,SidebarFooter,SidebarMenu,SidebarMenuItem,SidebarMenuButton,useSidebar} from '@/components/ui/sidebar';

export function AppNavigation({tab}:{tab:string}){
 const {setOpenMobile}=useSidebar();
 useEffect(()=>setOpenMobile(false),[tab,setOpenMobile]);
 const items=[{id:'quote',name:'Cotizador',icon:FileText},{id:'catalog',name:'Equipos y precios',icon:Package},{id:'history',name:'Cotizaciones',icon:History},{id:'settings',name:'Empresa',icon:Settings},{id:'pending',name:'Documentación',icon:ClipboardList}];
 return <Sidebar className="app-sidebar screen-only" collapsible="offcanvas"><SidebarHeader className="nav-brand"><img src="/logo.jpg" alt="Solvex Solar"/><span>Plataforma comercial</span></SidebarHeader><SidebarContent className="nav-content"><p className="nav-label">Tu espacio de trabajo</p><TabsList className="side-tabs" aria-label="Navegación principal"><SidebarMenu>{items.map(({id,name,icon:Icon})=><SidebarMenuItem key={id}><SidebarMenuButton asChild isActive={tab===id}><TabsTrigger value={id} onClick={()=>setOpenMobile(false)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setOpenMobile(false)}}><Icon/><span>{name}</span>{tab===id&&<ChevronRight className="nav-arrow"/>}</TabsTrigger></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></TabsList><div className="nav-note"><Sun size={22}/><strong>De la idea a la propuesta</strong><p>Define los equipos, revisa el alcance y prepara el documento.</p></div></SidebarContent><SidebarFooter className="nav-footer"><div className="nav-avatar">SS</div><div><strong>Solvex Solar</strong><span><LockKeyhole size={11}/>{isDemoDeployment?'Demostración pública':'Espacio privado'}</span></div></SidebarFooter></Sidebar>
}

