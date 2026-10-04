import type {QuoteInput} from './quote';
import {persistentEnergy} from './energy';
export function persistentQuote(input:QuoteInput):QuoteInput{
  return input.energy?.googlePlaceId?{...input,energy:persistentEnergy(input.energy)}:input;
}
