import type { Invoice } from './types';

export type VatTotals = {
  outBase23: number;
  outVat23: number;
  outBase19: number;
  outVat19: number;
  outBase10: number;
  outVat10: number;
  outBaseEu: number;
  inBase23: number;
  inVat23: number;
  inBase19: number;
  inVat19: number;
  inBase10: number;
  inVat10: number;
  totalOutVat: number;
  totalInVat: number;
  obligation: number;
};

// Aggregate invoice_items per VAT rate from a list of invoices
export function aggregateVat(
  outRows: { vat_rate: number; subtotal: number; vat_amount: number }[],
  inRows: { vat_rate: number; subtotal: number; vat_amount: number }[]
): VatTotals {
  const t: VatTotals = {
    outBase23: 0, outVat23: 0, outBase19: 0, outVat19: 0, outBase10: 0, outVat10: 0, outBaseEu: 0,
    inBase23: 0, inVat23: 0, inBase19: 0, inVat19: 0, inBase10: 0, inVat10: 0,
    totalOutVat: 0, totalInVat: 0, obligation: 0,
  };
  for (const r of outRows) {
    const rate = Number(r.vat_rate);
    const base = Number(r.subtotal || 0);
    const vat = Number(r.vat_amount || 0);
    if (rate === 23) { t.outBase23 += base; t.outVat23 += vat; }
    else if (rate === 19) { t.outBase19 += base; t.outVat19 += vat; }
    else if (rate === 10) { t.outBase10 += base; t.outVat10 += vat; }
    else if (rate === 0) t.outBaseEu += base;
  }
  for (const r of inRows) {
    const rate = Number(r.vat_rate);
    const base = Number(r.subtotal || 0);
    const vat = Number(r.vat_amount || 0);
    if (rate === 23) { t.inBase23 += base; t.inVat23 += vat; }
    else if (rate === 19) { t.inBase19 += base; t.inVat19 += vat; }
    else if (rate === 10) { t.inBase10 += base; t.inVat10 += vat; }
  }
  t.totalOutVat = t.outVat23 + t.outVat19 + t.outVat10;
  t.totalInVat = t.inVat23 + t.inVat19 + t.inVat10;
  t.obligation = t.totalOutVat - t.totalInVat;
  return t;
}

export function escapeXml(s: string | null | undefined): string {
  return String(s || '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] || c));
}

export function generateDpDphXml(firm: { dic: string | null; ic_dph: string | null; name: string }, period: string, t: VatTotals): string {
  const [y, m] = period.split('-');
  const r = (n: number) => n.toFixed(2);
  return `<?xml version="1.0" encoding="windows-1250"?>
<DPHv24 xmlns="http://www.financnasprava.sk/dphv24">
  <Identifikacia>
    <DIC>${escapeXml(firm.dic)}</DIC>
    <ICDPH>${escapeXml(firm.ic_dph)}</ICDPH>
    <Nazov>${escapeXml(firm.name)}</Nazov>
    <Obdobie><Rok>${y}</Rok><Mesiac>${m}</Mesiac></Obdobie>
  </Identifikacia>
  <Transakcie>
    <R01_Zaklad>${r(t.outBase23)}</R01_Zaklad>
    <R02_Dan>${r(t.outVat23)}</R02_Dan>
    <R03_Zaklad>${r(t.outBase19)}</R03_Zaklad>
    <R04_Dan>${r(t.outVat19)}</R04_Dan>
    <R05_Zaklad>${r(t.outBase10)}</R05_Zaklad>
    <R06_Dan>${r(t.outVat10)}</R06_Dan>
    <R13_Zaklad>${r(t.outBaseEu)}</R13_Zaklad>
    <R14_Dan>0.00</R14_Dan>
    <R19_Vystup>${r(t.totalOutVat)}</R19_Vystup>
    <R20_Zaklad>${r(t.inBase23)}</R20_Zaklad>
    <R20_Dan>${r(t.inVat23)}</R20_Dan>
    <R21_Zaklad>${r(t.inBase19)}</R21_Zaklad>
    <R21_Dan>${r(t.inVat19)}</R21_Dan>
    <R22_Zaklad>${r(t.inBase10)}</R22_Zaklad>
    <R22_Dan>${r(t.inVat10)}</R22_Dan>
    <R29_Vstup>${r(t.totalInVat)}</R29_Vstup>
    <R32_Povinnost>${t.obligation > 0 ? r(t.obligation) : '0.00'}</R32_Povinnost>
    <R33_Nadmerny>${t.obligation < 0 ? r(-t.obligation) : '0.00'}</R33_Nadmerny>
    <R34_Vysledok>${r(t.obligation)}</R34_Vysledok>
  </Transakcie>
</DPHv24>`;
}

export type KvInvoice = {
  number: string;
  issue_date: string;
  customer_name?: string | null;
  customer_ic_dph?: string | null;
  supplier_name?: string | null;
  supplier_ic_dph?: string | null;
  items: { vat_rate: number; subtotal: number; vat_amount: number }[];
};

export function generateKvDphXml(firm: { dic: string | null; ic_dph: string | null; name: string }, period: string, outInvoices: KvInvoice[], inInvoices: KvInvoice[]): string {
  const [y, m] = period.split('-');
  const r = (n: number) => n.toFixed(2);
  const renderRow = (i: KvInvoice, partnerIcDph: string | null | undefined, partnerName: string | null | undefined) => {
    const lines: string[] = [];
    for (const it of i.items) {
      const rate = Number(it.vat_rate);
      if (rate !== 23 && rate !== 19 && rate !== 10) continue;
      const base = Number(it.subtotal || 0);
      const vat = Number(it.vat_amount || 0);
      if (base === 0 && vat === 0) continue;
      lines.push(`      <Faktura>
        <Cislo>${escapeXml(i.number)}</Cislo>
        <Datum>${escapeXml(i.issue_date)}</Datum>
        <IcDphPartnera>${escapeXml(partnerIcDph)}</IcDphPartnera>
        <NazovPartnera>${escapeXml(partnerName)}</NazovPartnera>
        <Zaklad>${r(base)}</Zaklad>
        <Sadzba>${rate}</Sadzba>
        <Dan>${r(vat)}</Dan>
      </Faktura>`);
    }
    return lines.join('\n');
  };
  const a1 = outInvoices.filter((i) => (i.customer_ic_dph || '').toUpperCase().startsWith('SK'));
  const b1 = inInvoices.filter((i) => (i.supplier_ic_dph || '').toUpperCase().startsWith('SK'));
  return `<?xml version="1.0" encoding="windows-1250"?>
<KVDPHv21 xmlns="http://www.financnasprava.sk/kvdphv21">
  <Identifikacia>
    <DIC>${escapeXml(firm.dic)}</DIC>
    <ICDPH>${escapeXml(firm.ic_dph)}</ICDPH>
    <Nazov>${escapeXml(firm.name)}</Nazov>
    <Obdobie><Rok>${y}</Rok><Mesiac>${m}</Mesiac></Obdobie>
  </Identifikacia>
  <SekciaA1>
${a1.map((i) => renderRow(i, i.customer_ic_dph, i.customer_name)).filter(Boolean).join('\n')}
  </SekciaA1>
  <SekciaB1>
${b1.map((i) => renderRow(i, i.supplier_ic_dph, i.supplier_name)).filter(Boolean).join('\n')}
  </SekciaB1>
</KVDPHv21>`;
}

export function generateSvDphXml(firm: { dic: string | null; ic_dph: string | null; name: string }, period: string, euInvoices: { customer_ic_dph: string | null; baseEu: number }[]): string {
  const [y, m] = period.split('-');
  const grouped: Record<string, number> = {};
  for (const i of euInvoices) {
    const key = (i.customer_ic_dph || 'UNKNOWN').toUpperCase();
    grouped[key] = (grouped[key] || 0) + i.baseEu;
  }
  return `<?xml version="1.0" encoding="windows-1250"?>
<SVDPHv21 xmlns="http://www.financnasprava.sk/svdphv21">
  <Identifikacia>
    <DIC>${escapeXml(firm.dic)}</DIC>
    <ICDPH>${escapeXml(firm.ic_dph)}</ICDPH>
    <Nazov>${escapeXml(firm.name)}</Nazov>
    <Obdobie><Rok>${y}</Rok><Mesiac>${m}</Mesiac></Obdobie>
  </Identifikacia>
  <Transakcie>
${Object.entries(grouped).map(([icDph, sum]) => `    <Zaznam>
      <IcDphNadobudatela>${escapeXml(icDph)}</IcDphNadobudatela>
      <HodnotaTovaru>${sum.toFixed(2)}</HodnotaTovaru>
      <KodPlnenia>0</KodPlnenia>
    </Zaznam>`).join('\n')}
  </Transakcie>
</SVDPHv21>`;
}
