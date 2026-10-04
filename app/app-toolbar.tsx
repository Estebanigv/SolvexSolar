"use client";
import {ChevronDown,ChevronRight,ShieldCheck} from 'lucide-react';
import {SidebarTrigger,useSidebar} from '@/components/ui/sidebar';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {memberColorStyle} from '@/lib/member-color';
import {InstallAppButton} from './install-app';
import {SignOutButton,type MemberProfile} from './workspace-access';
import {ChangePasswordButton} from './change-password';
import './navigation.css';

export function AppToolbar({profile,status,preview=false}:{profile?:MemberProfile|null;status:string;preview?:boolean}){
 const {open,isMobile}=useSidebar();
 const name=profile?.full_name?.trim()||profile?.email||'Mi cuenta';
 const role=profile?.role==='admin'?'Administrador':profile?.role==='sales'?'Ejecutivo comercial':'Espacio de trabajo';
 const initials=profile?.full_name?.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'SS';
 return <header className="app-toolbar workspace-toolbar screen-only">
  <div className="toolbar-location">
   {(!open||isMobile)&&<SidebarTrigger id="workspace-menu-toggle" onClick={()=>{if(!isMobile)requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".nav-collapse")?.focus())}}/>}
   <span className="toolbar-brand-name">Solvex Solar</span><ChevronRight size={14} className="toolbar-breadcrumb-arrow" aria-hidden="true"/><strong>Gestión comercial</strong>
  </div>
  <div className="toolbar-utilities">
   <span className="toolbar-connection" title={status} aria-label={status} data-offline={status==='Sin conexión'}><i aria-hidden="true"/><span>{status}</span></span>
   <InstallAppButton compact/>
   <Popover><PopoverTrigger asChild><button type="button" className="toolbar-account" aria-label={'Mi cuenta: '+name+', '+role} title="Mi cuenta">
    <span className="toolbar-avatar team-person-color" style={memberColorStyle(profile?.identification_color,profile?.id||'workspace')} aria-hidden="true">{initials}</span>
    <span className="toolbar-account-copy"><strong>{name}</strong><small>{role}</small></span><ChevronDown size={14} aria-hidden="true"/>
   </button></PopoverTrigger><PopoverContent align="end" sideOffset={12} collisionPadding={12} className="toolbar-account-popover" aria-label="Mi cuenta">
    <strong>{name}</strong>{profile?.email&&<p>{profile.email}</p>}<span className="toolbar-role"><ShieldCheck size={15}/>{role}</span>
    {profile&&<div className="toolbar-account-actions"><ChangePasswordButton preview={preview}/></div>}
   </PopoverContent></Popover>
   {profile&&<SignOutButton compact preview={preview}/>}
  </div>
 </header>;
}
