import {installation, type QuoteInput, type Product, type Calculation} from './quote';
import {consumptionSummary} from './energy';

export function workflowReadiness(quote: QuoteInput, products: Product[], calculation: Calculation | null) {
  const selected = products.filter(p => p.system === quote.system && quote.quantities[p.id] > 0);
  const stages = {
    system: !!calculation && calculation.panels > 0 && selected.some(p => p.category.includes('INVERSOR')) &&
      (quote.system !== 'OFF GRID' || selected.some(p => p.category.includes('BATER'))) &&
      selected.every(p => p.price !== null && (!['panel','unidad'].includes(p.unit) || Number.isInteger(quote.quantities[p.id])) && (p.category !== 'PANEL FOTOVOLTAICO' || !!p.watts)),
    installation: !!calculation && (quote.installationOverride !== null ? !!quote.installationNote.trim() : installation.some(i => i.panels === calculation.panels)) &&
      (quote.extra === 0 || !!quote.extraLabel.trim()) && (quote.discountPercent!==undefined ? Number.isInteger(quote.discountPercent)&&quote.discountPercent>=0&&quote.discountPercent<=30 : quote.discount===0),
    customer: !!quote.customer.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quote.customer.email) &&
      !!quote.customer.phone.trim() && !!quote.customer.region.trim() && !!quote.customer.commune.trim() &&
      quote.customer.bill > 0 && !!consumptionSummary(quote.energy) && !!quote.energy?.billReviewed,
  };
  return {...stages, review: stages.customer && stages.system && stages.installation && (quote.proposalType==='preliminary'||quote.technicalReviewed)};
}
