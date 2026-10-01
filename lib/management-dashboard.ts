import {quoteGroups} from './followup';
import {chileDate,responsible,quotePersonColor,type HistoryQuote} from './quote-history';
export function managementSummary(quotes:HistoryQuote[],month:string){
 const active=quoteGroups(quotes.filter(q=>!q.deletedAt));
 const created=active.filter(rows=>chileDate(rows[rows.length-1].date).startsWith(month)).map(rows=>({...rows[0],sentOn:rows.find(q=>q.sentOn)?.sentOn??null}));
 const sent=active.flatMap(rows=>{const sent=rows.filter(q=>q.sentOn?.startsWith(month)).sort((a,b)=>b.sentOn!.localeCompare(a.sentOn!)||b.date.localeCompare(a.date));return sent.length?[sent[0]]:[]});
 const valued=sent.filter(q=>q.calculation.complete&&Number.isFinite(q.calculation.total));
 const people=new Map<string,{id:string;name:string;color:number;created:number;sent:number;amount:number}>();
 for(const q of [...created,...sent]){const person=responsible(q);if(!people.has(person.id))people.set(person.id,{...person,color:quotePersonColor(q),created:0,sent:0,amount:0})}
 for(const q of created)people.get(responsible(q).id)!.created++;
 for(const q of sent){const row=people.get(responsible(q).id)!;row.sent++;if(q.calculation.complete&&Number.isFinite(q.calculation.total))row.amount+=q.calculation.total}
 return {created:created.length,sent:sent.length,pending:created.filter(q=>!q.sentOn).length,amount:valued.reduce((sum,q)=>sum+q.calculation.total,0),unvalued:sent.length-valued.length,people:[...people.values()].sort((a,b)=>b.sent-a.sent||a.name.localeCompare(b.name,'es'))};
}
// Calculate only after every page is present, never from a truncated first page.
export async function loadAllHistory(loadPage:(offset:number)=>Promise<{quotes:HistoryQuote[];total:number}>,signal:AbortSignal){
 const records=new Map<string,HistoryQuote>();let offset=0,expected:number|undefined;
 while(true){signal.throwIfAborted();const page=await loadPage(offset);signal.throwIfAborted();
  if(!Number.isSafeInteger(page.total)||page.total<0||(expected!==undefined&&page.total!==expected))throw Error('El historial cambió durante la consulta. Actualiza el resumen.');
  expected=page.total;const previous=records.size;for(const quote of page.quotes)records.set(quote.id,quote);
  offset+=page.quotes.length;if(records.size===page.total)return [...records.values()];
  if(records.size===previous||offset>100000||records.size<offset)throw Error('No se pudo completar el historial. Actualiza el resumen.');
 }
}
