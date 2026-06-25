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

function esc(s: string | null | undefined): string {
  return String(s || '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] || c));
}

export function generateDppoXml(firm: { dic: string | null; ic_dph: string | null; name: string }, year: number | string, r: DzpResult): string {
  const fmt = (n: number) => n.toFixed(2);
  return `<?xml version="1.0" encoding="windows-1250"?>
<DPPOv26 xmlns="http://www.financnasprava.sk/dppov26">
  <Identifikacia>
    <DIC>${esc(firm.dic)}</DIC>
    <ICDPH>${esc(firm.ic_dph)}</ICDPH>
    <Nazov>${esc(firm.name)}</Nazov>
    <ZdanovacieObdobie>${year}</ZdanovacieObdobie>
  </Identifikacia>
  <Vykaz>
    <R01_Vynosy>${fmt(r.revenue)}</R01_Vynosy>
    <R02_Naklady>${fmt(r.expenses)}</R02_Naklady>
    <R301_VysledokHospodarenia>${fmt(r.profit)}</R301_VysledokHospodarenia>
    <R500_ZakladDane>${fmt(r.taxBase)}</R500_ZakladDane>
    <R510_DanovaSadzba>${r.revenue <= 60000 ? '15' : '21'}</R510_DanovaSadzba>
    <R610_DanRiadnaSadzba>${fmt(r.tax)}</R610_DanRiadnaSadzba>
    <R820_ZaplateneZalohy>${fmt(r.prepaid)}</R820_ZaplateneZalohy>
    <R900_VysledokDane>${fmt(r.toPay)}</R900_VysledokDane>
  </Vykaz>
</DPPOv26>`;
}

export function generateDpfoBXml(firm: { dic: string | null; name: string }, year: number | string, r: DzpResult, opts: { childCount?: number } = {}): string {
  const fmt = (n: number) => n.toFixed(2);
  const bonus = (opts.childCount || 0) * 600;
  return `<?xml version="1.0" encoding="windows-1250"?>
<DPFOBv26 xmlns="http://www.financnasprava.sk/dpfobv26">
  <Identifikacia>
    <DIC>${esc(firm.dic)}</DIC>
    <Nazov>${esc(firm.name)}</Nazov>
    <ZdanovacieObdobie>${year}</ZdanovacieObdobie>
  </Identifikacia>
  <Vykaz>
    <R01_Prijmy>${fmt(r.revenue)}</R01_Prijmy>
    <R02_Vydavky>${fmt(r.expenses)}</R02_Vydavky>
    <R03_CiastkovyZaklad>${fmt(r.profit)}</R03_CiastkovyZaklad>
    <R31_Nezdanitelna>${fmt(Math.min(5753.76, r.profit))}</R31_Nezdanitelna>
    <R39_ZakladDane>${fmt(r.taxBase)}</R39_ZakladDane>
    <R56_Dan>${fmt(r.tax)}</R56_Dan>
    <R65_BonusNaDieta>${fmt(bonus)}</R65_BonusNaDieta>
    <R76_DanovaPovinnost>${fmt(r.taxAfterBonus)}</R76_DanovaPovinnost>
    <R83_ZaplateneZalohy>${fmt(r.prepaid)}</R83_ZaplateneZalohy>
    <R90_VysledokDane>${fmt(r.toPay)}</R90_VysledokDane>
  </Vykaz>
</DPFOBv26>`;
}
