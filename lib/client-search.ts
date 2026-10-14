import type {QuoteInput} from './quote';

export type SearchableClient = {id:string;details:QuoteInput['customer']};
const normalize = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

export function searchClients(clients:SearchableClient[],query:string){
  const search=normalize(query);
  if(!search)return [];
  const digits=search.replace(/\D/g,'');
  const isPhone=digits.length>=3&&/^[+\d\s().-]+$/.test(search);
  return clients.filter(({details})=>{
    const text=normalize(`${details.name} ${details.email} ${details.phone}`);
    return search.split(/\s+/).every(word=>text.includes(word)) ||
      (isPhone&&details.phone.replace(/\D/g,'').includes(digits));
  });
}
