import {installation, type QuoteInput, type Product, type Calculation} from './quote';
import {consumptionSummary} from './energy';

export function workflowReadiness(quote: QuoteInput, products: Product[], calculation: Calculation | null) {
  const selected = products.filter(p => p.system === quote.system && quote.quantities[p.id] > 0);
  return {
    system: !!calculation && calculation.panels > 0 && selected.some(p => p.category.includes('INVERSOR')) &&
      (quote.system !== 'OFF GRID' || selected.some(p => p.category.includes('BATER'))) &&
      selected.every(p => p.price !== null && (!['panel','unidad'].includes(p.unit) || Number.isInteger(quote.quantities[p.id])) && (p.category !== 'PANEL FOTOVOLTAICO' || !!p.watts)),
    installation: !!calculation && (quote.installationOverride !== null ? !!quote.installationNote.trim() : installation.some(i => i.panels === calculation.panels)) &&
      (quote.extra === 0 || !!quote.extraLabel.trim()) && quote.discount <= calculation.subtotal,
    customer: !!quote.customer.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quote.customer.email) &&
      !!quote.customer.phone.trim() && !!quote.customer.region.trim() && !!quote.customer.commune.trim() &&
      quote.customer.bill > 0 && quote.technicalReviewed && !!consumptionSummary(quote.energy) && !!quote.energy?.billReviewed,
  };
}
