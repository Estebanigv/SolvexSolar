import assert from 'node:assert/strict';
import {contactIndicator,daysWithoutChanges,matchesSmartView,sortCrmEntries} from '../lib/crm-views';
import {newQuote} from '../lib/quote';
import type {CrmEntry} from '../lib/crm';
const today='2026-10-26';
const base:CrmEntry={id:'a',kind:'lead',stage:'new',client:{id:'a',details:newQuote().customer,owner_id:'sales',updated_at:'2026-10-26T12:00:00Z'},nextContact:null,expected:null,amount:null,quoteId:null,folio:null,revisions:0,updatedAt:'2026-10-26T12:00:00Z'};
const overdue={...base,id:'overdue',nextContact:'2026-10-25'};
const due={...base,id:'today',nextContact:today};
const future={...base,id:'future',nextContact:'2026-10-27'};
for(const view of ['due','overdue','unplanned','closing','stale'] as const){
 assert.equal(matchesSmartView({...overdue,stage:'accepted',expectedClose:today,updatedAt:'2020-01-01T12:00:00Z'},view,today),false,'Closed opportunities must never become pending work');
}
assert.equal(matchesSmartView(overdue,'overdue',today),true);
assert.equal(matchesSmartView(due,'overdue',today),false);
assert.equal(matchesSmartView(due,'due',today),true);
assert.equal(matchesSmartView(future,'due',today),false);
assert.equal(matchesSmartView(base,'unplanned',today),true);
assert.equal(matchesSmartView({...base,expectedClose:'2026-11-01'},'closing',today),false);
assert.equal(matchesSmartView({...base,expectedClose:'2026-10-01'},'closing',today),true);
assert.equal(matchesSmartView({...base,expectedClose:null},'closing',today),false);
// 02:00 UTC belongs to the previous calendar day in Santiago.
assert.equal(daysWithoutChanges({...base,updatedAt:'2026-10-20T02:00:00Z'},today),7);
assert.equal(matchesSmartView({...base,updatedAt:'2026-10-20T02:00:00Z'},'stale',today),true);
assert.equal(matchesSmartView({...base,updatedAt:'2026-10-20T12:00:00Z'},'stale',today),false);
assert.equal(daysWithoutChanges({...base,updatedAt:'2026-10-27T12:00:00Z'},today),0);
assert.deepEqual(contactIndicator(overdue,today),{tone:'overdue',label:'Vencido hace 1 día'});
assert.equal(contactIndicator({...base,nextContact:'2026-10-24'},today).label,'Vencido hace 2 días');
assert.equal(contactIndicator(due,today).tone,'today');
assert.equal(contactIndicator({...overdue,stage:'rejected'},today).tone,'closed');
const input=[future,base,due,overdue,{...overdue,id:'closed',stage:'accepted' as const}];
assert.deepEqual(sortCrmEntries(input,'attention',today).map(e=>e.id),['overdue','today','a','future','closed']);
assert.equal(input[0],future,'Sorting must not mutate the shared source');
assert.deepEqual(sortCrmEntries([base,{...base,id:'zero',amount:0},{...base,id:'priced',amount:10}],'value',today).map(e=>e.id),['priced','zero','a']);
assert.deepEqual(sortCrmEntries([base,{...base,id:'later',expectedClose:'2026-11-01'},{...base,id:'sooner',expectedClose:today}],'closing',today).map(e=>e.id),['sooner','later','a']);
console.log('CRM views: work queues, closed exclusions, Santiago date boundaries and stable non-mutating sort passed.');
