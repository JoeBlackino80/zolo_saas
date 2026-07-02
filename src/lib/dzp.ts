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
  return `<?xml version="1.0" encoding="UTF-8"?>
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

// DPFO-A — Daňové priznanie typu A pre zamestnancov (závislá činnosť)
// Použiteľné iba pre zamestnaneckú mzdu (5xx príjmy podľa §5).
export type DpfoAInput = {
  brutto_year: number;       // hrubý ročný príjem zo závislej činnosti
  preddavky_paid: number;     // už zaplatené preddavky (zamestnávateľ)
  nezdanitelna?: number;      // odpočítateľná suma (default 5753.76 €)
  childCount?: number;        // daňový bonus na dieťa
  socialne: number;            // odvody na sociálne poistenie
  zdravotne: number;           // odvody na zdravotné poistenie
};

export type DpfoAResult = {
  brutto: number;
  odvody: number;
  ciastkovyZaklad: number;
  nezdanitelna: number;
  taxBase: number;
  tax: number;
  bonus: number;
  taxAfterBonus: number;
  preddavky: number;
  vysledok: number;
};

export function calcDpfoA(i: DpfoAInput): DpfoAResult {
  const brutto = +i.brutto_year || 0;
  const odvody = +(i.socialne + i.zdravotne).toFixed(2);
  const ciastkovyZaklad = +(brutto - odvody).toFixed(2);
  const nezdan = +(i.nezdanitelna ?? DZP_2026.fo_nezdanitelna_rocne);
  const taxBase = Math.max(0, +(ciastkovyZaklad - nezdan).toFixed(2));
  let tax = 0;
  if (taxBase <= DZP_2026.fo_threshold) {
    tax = +(taxBase * DZP_2026.fo_rate_19).toFixed(2);
  } else {
    tax = +(DZP_2026.fo_threshold * DZP_2026.fo_rate_19 + (taxBase - DZP_2026.fo_threshold) * DZP_2026.fo_rate_25).toFixed(2);
  }
  const bonus = (i.childCount || 0) * 600;
  const taxAfterBonus = Math.max(0, +(tax - bonus).toFixed(2));
  const preddavky = +(i.preddavky_paid || 0);
  const vysledok = +(taxAfterBonus - preddavky).toFixed(2);
  return { brutto, odvody, ciastkovyZaklad, nezdanitelna: nezdan, taxBase, tax, bonus, taxAfterBonus, preddavky, vysledok };
}

export function generateDpfoAXml(firm: { dic: string | null; name: string }, year: number | string, r: DpfoAResult): string {
  const fmt = (n: number) => n.toFixed(2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<DPFOAv26 xmlns="http://www.financnasprava.sk/dpfoav26">
  <Identifikacia>
    <DIC>${esc(firm.dic)}</DIC>
    <Nazov>${esc(firm.name)}</Nazov>
    <ZdanovacieObdobie>${year}</ZdanovacieObdobie>
  </Identifikacia>
  <Vykaz>
    <R36_PrijmyZavisla>${fmt(r.brutto)}</R36_PrijmyZavisla>
    <R37_Odvody>${fmt(r.odvody)}</R37_Odvody>
    <R38_CiastkovyZaklad>${fmt(r.ciastkovyZaklad)}</R38_CiastkovyZaklad>
    <R39_Nezdanitelna>${fmt(r.nezdanitelna)}</R39_Nezdanitelna>
    <R56_ZakladDane>${fmt(r.taxBase)}</R56_ZakladDane>
    <R57_Dan>${fmt(r.tax)}</R57_Dan>
    <R65_BonusNaDieta>${fmt(r.bonus)}</R65_BonusNaDieta>
    <R76_DanovaPovinnost>${fmt(r.taxAfterBonus)}</R76_DanovaPovinnost>
    <R83_ZaplatenePreddavky>${fmt(r.preddavky)}</R83_ZaplatenePreddavky>
    <R90_VysledokDane>${fmt(r.vysledok)}</R90_VysledokDane>
  </Vykaz>
</DPFOAv26>`;
}

// Hlásenie o zrazenej a odvedenej dani — §43 zrážková daň
// Použiteľné pre úroky, licenčné poplatky, autorské honoráre, výhry atď.
export type WithholdingRow = {
  recipient_name: string;
  recipient_rc: string | null;          // rodné číslo alebo DIČ
  payment_type: string;                  // licencia/úrok/autorský honorár/výhra
  payment_date: string;                  // YYYY-MM-DD
  brutto: number;                        // hrubá suma
  rate: number;                          // 7% / 19% / 35%
  withheld: number;                      // zrazená daň
};

export function generateWithholdingXml(firm: { dic: string | null; ic_dph: string | null; name: string }, period: string, rows: WithholdingRow[]): string {
  const [y, m] = period.split('-');
  const fmt = (n: number) => n.toFixed(2);
  const total = rows.reduce((s, r) => s + r.withheld, 0);
  const lines = rows.map((r, i) => `
    <Zaznam poradie="${i + 1}">
      <NazovPrijemcu>${esc(r.recipient_name)}</NazovPrijemcu>
      <RCalebo DIC>${esc(r.recipient_rc)}</RCalebo>
      <DruhPrijmu>${esc(r.payment_type)}</DruhPrijmu>
      <DatumVyplaty>${esc(r.payment_date)}</DatumVyplaty>
      <Brutto>${fmt(r.brutto)}</Brutto>
      <Sadzba>${r.rate}</Sadzba>
      <ZrazkaDan>${fmt(r.withheld)}</ZrazkaDan>
    </Zaznam>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<HlZD43v26 xmlns="http://www.financnasprava.sk/hlzd43v26">
  <Identifikacia>
    <DIC>${esc(firm.dic)}</DIC>
    <ICDPH>${esc(firm.ic_dph)}</ICDPH>
    <Nazov>${esc(firm.name)}</Nazov>
    <Obdobie><Rok>${y}</Rok><Mesiac>${m}</Mesiac></Obdobie>
  </Identifikacia>
  <Zaznamy>${lines}
  </Zaznamy>
  <Sumar>
    <CelkomZrazka>${fmt(total)}</CelkomZrazka>
  </Sumar>
</HlZD43v26>`;
}

export function generateDpfoBXml(firm: { dic: string | null; name: string }, year: number | string, r: DzpResult, opts: { childCount?: number } = {}): string {
  const fmt = (n: number) => n.toFixed(2);
  const bonus = (opts.childCount || 0) * 600;
  return `<?xml version="1.0" encoding="UTF-8"?>
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

// DPMV — Daň z motorových vozidiel (motor vehicle tax)
// Slovenský elektronický formulár DMPVv26.
export type Vehicle = {
  plate: string;
  type: string;
  weight_kg: number;
  engine_cm3: number;
  fuel: 'diesel' | 'gasoline' | 'electric' | 'other';
  first_registration: string;
  annual_tax: number;
};

export function calcDpmv(vehicles: Vehicle[]): { total: number; per_vehicle: { plate: string; tax: number }[] } {
  const per_vehicle = vehicles.map((v) => ({ plate: v.plate, tax: +v.annual_tax.toFixed(2) }));
  const total = +per_vehicle.reduce((s, v) => s + v.tax, 0).toFixed(2);
  return { total, per_vehicle };
}

export function generateDpmvXml(firm: { dic: string | null; ic_dph: string | null; name: string }, year: number | string, vehicles: Vehicle[]): string {
  const r = calcDpmv(vehicles);
  const fmt = (n: number) => n.toFixed(2);
  const vehLines = vehicles.map((v, i) => `
    <Vozidlo poradie="${i + 1}">
      <EvCislo>${esc(v.plate)}</EvCislo>
      <DruhVozidla>${esc(v.type)}</DruhVozidla>
      <Hmotnost>${v.weight_kg}</Hmotnost>
      <ObjemMotora>${v.engine_cm3}</ObjemMotora>
      <DruhPaliva>${esc(v.fuel)}</DruhPaliva>
      <PrvaEvidencia>${esc(v.first_registration)}</PrvaEvidencia>
      <RocnaDan>${fmt(v.annual_tax)}</RocnaDan>
    </Vozidlo>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<DMPVv26 xmlns="http://www.financnasprava.sk/dmpvv26">
  <Identifikacia>
    <DIC>${esc(firm.dic)}</DIC>
    <ICDPH>${esc(firm.ic_dph)}</ICDPH>
    <Nazov>${esc(firm.name)}</Nazov>
    <ZdanovacieObdobie>${year}</ZdanovacieObdobie>
  </Identifikacia>
  <Vozidla>${vehLines}
  </Vozidla>
  <Vykaz>
    <R10_CelkovyPocetVozidiel>${vehicles.length}</R10_CelkovyPocetVozidiel>
    <R20_CelkovaSuma>${fmt(r.total)}</R20_CelkovaSuma>
  </Vykaz>
</DMPVv26>`;
}
