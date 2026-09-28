import {database} from '@/lib/platform-database';
export {database};
import {initialProducts,initialSettings} from './quote';
export async function state(owner:string){const row=await database().prepare('SELECT payload, revision FROM workspace_state WHERE owner = ?').bind(owner).first<{payload:string,revision:number}>();return row?{...JSON.parse(row.payload),revision:row.revision}:{products:initialProducts,settings:initialSettings,revision:0};}
