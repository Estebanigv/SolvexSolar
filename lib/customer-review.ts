import type {QuoteInput} from './quote';

// A review applies only to these customer values and this document reading.
export function customerReviewKey(customer:QuoteInput['customer'],documents:{id:string;rotation?:number}[],readId:number|null){
  if(!documents.length)return null;
  return JSON.stringify({customer:[customer.name,customer.email,customer.phone,customer.address,customer.commune,customer.region,customer.bill],documents:documents.map(d=>[d.id,d.rotation??0]),readId});
}

export function needsCustomerReview(key:string|null,accepted:string|null){return key!==null&&key!==accepted}
