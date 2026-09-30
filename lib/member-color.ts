import {z} from 'zod';
import type {CSSProperties} from 'react';
export const memberColors=[
  {id:'forest',name:'Verde bosque',foreground:'#12634e',background:'#e3f2ea',dot:'#298460'},
  {id:'blue',name:'Azul',foreground:'#235d9a',background:'#e7effb',dot:'#3777bd'},
  {id:'violet',name:'Violeta',foreground:'#794ba0',background:'#f2eafa',dot:'#9160b8'},
  {id:'amber',name:'Ámbar',foreground:'#805316',background:'#fcf1da',dot:'#a37728'},
  {id:'rose',name:'Rosa',foreground:'#9c4969',background:'#f9e9ef',dot:'#bd6082'},
  {id:'teal',name:'Turquesa',foreground:'#246a76',background:'#e3f3f5',dot:'#3595a5'},
  {id:'navy',name:'Azul marino',foreground:'#294366',background:'#e8edf5',dot:'#385b87'},
  {id:'sky',name:'Celeste',foreground:'#176181',background:'#e2f3fc',dot:'#2582ad'},
  {id:'indigo',name:'Índigo',foreground:'#46459b',background:'#eeedfc',dot:'#6664bf'},
  {id:'plum',name:'Ciruela',foreground:'#753a78',background:'#f4e8f5',dot:'#925196'},
  {id:'fuchsia',name:'Fucsia',foreground:'#923779',background:'#fbe8f5',dot:'#b34794'},
  {id:'burgundy',name:'Borgoña',foreground:'#873d4e',background:'#f7e8ec',dot:'#a7475e'},
  {id:'coral',name:'Coral',foreground:'#a04438',background:'#fcece7',dot:'#c25d4d'},
  {id:'orange',name:'Naranja',foreground:'#945019',background:'#fff0e1',dot:'#bc6b24'},
  {id:'copper',name:'Cobre',foreground:'#80513e',background:'#f4ebe5',dot:'#a17053'},
  {id:'olive',name:'Oliva',foreground:'#626523',background:'#f0f2df',dot:'#80863d'},
  {id:'mint',name:'Menta',foreground:'#226d57',background:'#e0f6ed',dot:'#398d72'},
  {id:'slate',name:'Pizarra',foreground:'#475569',background:'#edf1f5',dot:'#64748b'},
] as const;
export const memberColorSchema=z.enum(memberColors.map(c=>c.id) as [typeof memberColors[number]['id'],...typeof memberColors[number]['id'][]]);
export type MemberColor=z.infer<typeof memberColorSchema>;
export const colorRequestSchema=z.object({color:memberColorSchema.nullable()}).strict();
export function memberColor(color:string|null|undefined,identity:string){
  const selected=memberColors.find(c=>c.id===color);if(selected)return selected;
  let hash=0;for(const char of identity)hash=(hash*31+char.charCodeAt(0))>>>0;
  // Keep existing automatic assignments stable when the selectable palette grows.
  return memberColors[hash%6];
}
export function memberColorStyle(color:string|null|undefined,identity:string):CSSProperties{
  const c=memberColor(color,identity);
  return {'--person-fg':c.foreground,'--person-bg':c.background,'--person-dot':c.dot} as CSSProperties;
}
export function resolveResponsibleColor(adviserEmail:string|undefined,owner:{id:string;identification_color?:string|null},members:{id:string;email:string;identification_color?:string|null}[]){
  // A commercial contact is not automatically the author. Never match identities by name.
  if(adviserEmail!==undefined){
    const email=adviserEmail.trim().toLowerCase();
    const matches=email?members.filter(m=>m.email.trim().toLowerCase()===email):[];
    return matches.length===1?memberColor(matches[0].identification_color,matches[0].id).id:null;
  }
  return memberColor(owner.identification_color,owner.id).id;
}
