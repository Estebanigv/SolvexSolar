"use client";
import {useState} from 'react';
import {Tabs,TabsContent} from '@/components/ui/tabs';
import {SidebarProvider,SidebarInset} from '@/components/ui/sidebar';
import {AppNavigation} from '../../navigation';
import {AppToolbar} from '../../app-toolbar';
import {UserGuide} from '../../user-guide';
export default function Preview(){
 const [tab,setTab]=useState('guide');
 const [admin,setAdmin]=useState(true);
 return <Tabs value={tab} onValueChange={setTab} className="app-root"><SidebarProvider style={{'--sidebar-width':'248px'} as React.CSSProperties}><AppNavigation tab={tab} isAdmin={admin} usesSupabase/><SidebarInset className="app-main"><AppToolbar preview status="Vista local" profile={{id:'preview',full_name:'Dev',email:'dev@example.com',role:admin?'admin':'sales'}}/><main className="workspace"><div className="page-heading"><div><h1>Manual de uso</h1><p className="heading-sub">Consulta el manual visual o encuentra una respuesta por tema.</p></div><label style={{fontSize:12,display:'flex',alignItems:'center',gap:8}}><input type="checkbox" style={{width:18,height:18,margin:0}} checked={admin} onChange={event=>setAdmin(event.target.checked)}/> Vista administrador</label></div><TabsContent value="guide"><UserGuide/></TabsContent>{['quote','history','clients','dashboard','catalog','settings','members','activity','pending'].map(id=><TabsContent key={id} value={id}><p>Sección seleccionada: {id}. Esta vista local solo prueba la navegación.</p></TabsContent>)}</main></SidebarInset></SidebarProvider></Tabs>;
}
