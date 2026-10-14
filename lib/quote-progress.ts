import type {QuoteInput} from './quote';

// Ignore object key insertion order, but retain array order and every input value.
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
 return value;
}
export function hasQuoteInProgress(input:QuoteInput,baseline:QuoteInput,context:{clientId:string|null;sourceQuoteId:string|null;fileCount:number}){
 return !!(context.clientId||context.sourceQuoteId||context.fileCount||JSON.stringify(canonical(input))!==JSON.stringify(canonical(baseline)));
}
