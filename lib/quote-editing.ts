import {z} from 'zod';
import {calculate,quoteSchema,installation,type QuoteInput,type Product,type Settings} from './quote';
import {invalidCustomerEmail} from './customer-email';

// Local recovery must preserve text that the user is still typing. Server saves
// continue to use quoteSchema, which rejects an invalid email.
export const editableQuoteSchema=quoteSchema.extend({customer:quoteSchema.shape.customer.extend({email:z.string()})});

export function calculateEditingQuote(input:QuoteInput,products:Product[],settings:Settings,rates=installation){
 // Contact formatting does not change equipment or monetary calculations.
 // Sanitize a copy only; keep the exact email in the form and local draft.
 const calculationInput=invalidCustomerEmail(input.customer.email)?{...input,customer:{...input.customer,email:''}}:input;
 return calculate(calculationInput,products,settings,rates);
}
