import {newQuote,reconcileQuoteProducts,panelQuantities,type Product} from './quote';
export function freshQuote(products:Product[]){const quote=reconcileQuoteProducts(newQuote(),products);return {...quote,quantities:panelQuantities(quote,products)}}
