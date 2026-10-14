import {z} from 'zod';

// One contract for the form and server; whitespace from pasted emails is harmless.
export const customerEmailSchema=z.string().trim().pipe(z.union([z.literal(''),z.string().email()]));
export const invalidCustomerEmail=(email:string)=>!customerEmailSchema.safeParse(email).success;
