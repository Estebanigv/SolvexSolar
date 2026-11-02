import assert from 'node:assert/strict';
import {taskCreateSchema,taskUpdateSchema,contactProfileSchema,taskDue,taskBuckets,orderTasks,readAllTasks,type CrmTask,type CrmWorkSource} from '../lib/crm-work';
const id='00000000-0000-4000-8000-000000000001';
const fields={title:'Visita técnica',kind:'visit' as const,due_on:'2026-10-27',priority:'normal' as const,details:'Revisar orientación de la cubierta'};
assert.equal(taskCreateSchema.safeParse({...fields,id,client_id:id,due_on:'2026-02-30'}).success,false);
assert.equal(taskCreateSchema.safeParse({...fields,id,client_id:id,title:' '}).success,false);
assert.equal(taskCreateSchema.parse({...fields,id,client_id:id}).kind,'visit');
assert.equal(taskUpdateSchema.safeParse({...fields,id,status:'completed'}).success,false,'An update requires the last version');
const metadata={client_id:id,source:'referral',priority:'high',tags:[' Solar ','Solar'],expected:null};
assert.deepEqual(contactProfileSchema.parse(metadata).tags,['Solar']);
assert.equal(contactProfileSchema.safeParse({...metadata,tags:Array(13).fill('tag')}).success,false);
assert.equal(contactProfileSchema.safeParse({...metadata,tags:['a'.repeat(31)]}).success,false);
const task:CrmTask={...fields,id,client_id:id,status:'pending',created_at:'2026-10-26T12:00:00Z',updated_at:'2026-10-26T12:00:00Z',updated_by:id,completed_at:null};
assert.equal(taskDue(task,'2026-10-27'),true);
assert.equal(taskDue({...task,status:'completed'},'2026-10-27'),false);
assert.equal(taskDue({...task,status:'cancelled'},'2026-10-27'),false);
const buckets=taskBuckets([{...task,id:'old',due_on:'2026-10-26'},task,{...task,id:'future',due_on:'2026-10-28'},{...task,id:'done',status:'completed'}],'2026-10-27');
assert.deepEqual(Object.values(buckets).map(rows=>rows.length),[1,1,1,1]);
assert.equal(orderTasks([task,{...task,id:'urgent',priority:'high'}])[0].id,'urgent');
async function verifyPagination(){
 const offsets:number[]=[];
 const source={tasks:async(_client:string|null,_status:string,offset:number)=>{offsets.push(offset);return {tasks:offset===0?Array.from({length:100},(_,i)=>({...task,id:String(i)})):[{...task,id:'last'}],total:101}}} as CrmWorkSource;
 const rows=await readAllTasks(source,null,'pending');
 assert.equal(rows.length,101);assert.deepEqual(offsets,[0,100]);
 await assert.rejects(readAllTasks({tasks:async()=>({tasks:[],total:1})} as unknown as CrmWorkSource,null,'pending'),/agenda cambió/);
 console.log('CRM tasks: dates, priorities, states, concurrency versions, contact tags and complete pagination passed.');
}
void verifyPagination();
