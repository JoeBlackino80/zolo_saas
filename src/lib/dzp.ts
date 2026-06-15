// SK 2026 — Daň z príjmov
export const DZP_2026 = {
  // FO sadzby
  fo_rate_19: 0.19,
  fo_rate_25: 0.25,
  fo_threshold: 47537.50,
  fo_nezdanitelna_rocne: 5753.76,  // odpočítateľná suma
  // PO sadzba
  po_rate: 0.21,                    // 21% pre veľké firmy
  po_rate_small: 0.15,               // 15% pre obrat do 60 000 €
  po_small_threshold: 60000,
};

export type DzpInput = {
  type: 'FO-A' | 'FO-B' | 'PO';
  revenue: number;
  expenses: number;
  nezdanitelna?: number;     // FO only
  prepaid?: number;          // už zaplatené preddavky
  childCount?: number;       // FO daňový bonus
};

export type DzpResult = {
  revenue: number;
  expenses: number;
  profit: number;
  taxBase: number;
  tax: number;
  taxAfterBonus: number;
  prepaid: number;
  toPay: number;
  effectiveRate: number;
};

export function calcDzp(i: DzpInput): DzpResult {
  const revenue = +i.revenue || 0;
  const expenses = +i.expenses || 0;
  const profit = revenue - expenses;
  let taxBase: number;
  let tax = 0;

  if (i.type === 'PO') {
    taxBase = Math.max(0, profit);
    const rate = revenue <= DZP_2026.po_small_threshold ? DZP_2026.po_rate_small : DZP_2026.po_rate;
    tax = +(taxBase * rate).toFixed(2);
  } else {
    const nezdan = +(i.nezdanitelna || DZP_2026.fo_nezdanitelna_rocne);
    taxBase = Math.max(0, profit - nezdan);
    if (taxBase <= DZP_2026.fo_threshold) {
      tax = +(taxBase * DZP_2026.fo_rate_19).toFixed(2);
    } else {
      tax = +(DZP_2026.fo_threshold * DZP_2026.fo_rate_19 + (taxBase - DZP_2026.fo_threshold) * DZP_2026.fo_rate_25).toFixed(2);
    }
  }

  const childBonus = i.type !== 'PO' ? (i.childCount || 0) * 600 : 0; // ročný bonus ~600€/dieťa
  const taxAfterBonus = Math.max(0, tax - childBonus);
  const prepaid = +(i.prepaid || 0);
  const toPay = taxAfterBonus - prepaid;
  const effectiveRate = profit > 0 ? taxAfterBonus / profit : 0;

  return {
    revenue, expenses, profit,
    taxBase: +taxBase.toFixed(2),
    tax,
    taxAfterBonus,
    prepaid,
    toPay: +toPay.toFixed(2),
    effectiveRate: +(effectiveRate * 100).toFixed(2),
  };
}
