/* eslint-disable @typescript-eslint/no-unused-vars */
// Synthetic smoke test for SK tax XML generators.
// Run with: npx tsx scripts/test-tax-xml.ts

import { aggregateVat, generateDpDphXml, generateKvDphXml, generateSvDphXml } from '../src/lib/vat';
import { calcDzp, generateDppoXml, generateDpfoBXml, calcDpfoA, generateDpfoAXml, generateDpmvXml, generateWithholdingXml, calcDpmv } from '../src/lib/dzp';

const firm = { dic: '2020123456', ic_dph: 'SK2020123456', name: 'Test Firma s.r.o.' };
const period = '2026-05';
const year = 2026;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ZOLO SK TAX XML — END-TO-END SMOKE TEST');
console.log('═══════════════════════════════════════════════════════════════\n');

// ──────────────────────────────────────────────────────────────
// TEST 1: DP DPH (mesačné priznanie)
// ──────────────────────────────────────────────────────────────
console.log('▌ TEST 1 — DP DPH');
console.log('─────────────────────────────────────────────────────────────');

const outItems = [
  { vat_rate: 23, subtotal: 1000, vat_amount: 230 },   // FA1
  { vat_rate: 23, subtotal: 500, vat_amount: 115 },    // FA2
  { vat_rate: 10, subtotal: 200, vat_amount: 20 },     // FA3 znížená sadzba
  { vat_rate: 0, subtotal: 800, vat_amount: 0 },       // EU dodanie
];
const inItems = [
  { vat_rate: 23, subtotal: 600, vat_amount: 138 },    // prijatá FA
  { vat_rate: 10, subtotal: 100, vat_amount: 10 },
];
const totals = aggregateVat(outItems, inItems);

console.log('Vstupné dáta:');
console.log('  Výnosy 23%: 1500 € base, 345 € vat (2 FA)');
console.log('  Výnosy 10%:  200 € base,  20 € vat');
console.log('  EU dodania:  800 € base (oslobodené)');
console.log('  Náklady 23%: 600 € base, 138 € vat');
console.log('  Náklady 10%: 100 € base,  10 € vat');
console.log('');
console.log('Vypočítané sumy:');
console.log(`  outBase23 = ${totals.outBase23} (očakávané 1500) ${totals.outBase23 === 1500 ? '✓' : '✗'}`);
console.log(`  outVat23  = ${totals.outVat23}  (očakávané 345)  ${totals.outVat23 === 345 ? '✓' : '✗'}`);
console.log(`  outBase10 = ${totals.outBase10}  (očakávané 200)  ${totals.outBase10 === 200 ? '✓' : '✗'}`);
console.log(`  outBaseEu = ${totals.outBaseEu}  (očakávané 800)  ${totals.outBaseEu === 800 ? '✓' : '✗'}`);
console.log(`  totalOutVat = ${totals.totalOutVat} (očakávané 365) ${totals.totalOutVat === 365 ? '✓' : '✗'}`);
console.log(`  totalInVat  = ${totals.totalInVat}  (očakávané 148)  ${totals.totalInVat === 148 ? '✓' : '✗'}`);
console.log(`  obligation  = ${totals.obligation}  (očakávané 217)  ${totals.obligation === 217 ? '✓' : '✗'}`);
console.log('');

const dpDphXml = generateDpDphXml(firm, period, totals);
console.log('XML (skrátené, kľúčové riadky):');
const dpLines = dpDphXml.split('\n').filter(l => l.includes('R01') || l.includes('R02') || l.includes('R05') || l.includes('R06') || l.includes('R13') || l.includes('R19') || l.includes('R20') || l.includes('R29') || l.includes('R32') || l.includes('R33') || l.includes('R34'));
dpLines.forEach(l => console.log('   ', l.trim()));
console.log('');

// ──────────────────────────────────────────────────────────────
// TEST 2: KV DPH (rozšírené sekcie A1, B1, B2, B3, C1, C2)
// ──────────────────────────────────────────────────────────────
console.log('▌ TEST 2 — KV DPH (sekcie A1/B1/B2/B3/C1/C2)');
console.log('─────────────────────────────────────────────────────────────');

const outInvs = [
  { number: 'FA001', issue_date: '2026-05-15', customer_name: 'SK Klient s.r.o.', customer_ic_dph: 'SK1234567890',
    items: [{ vat_rate: 23, subtotal: 1000, vat_amount: 230 }] },
  { number: 'FA002', issue_date: '2026-05-20', customer_name: 'CZ Klient', customer_ic_dph: 'CZ12345678',
    items: [{ vat_rate: 0, subtotal: 800, vat_amount: 0 }] },
];
const inInvs = [
  { number: 'PFA001', issue_date: '2026-05-10', supplier_name: 'SK Dodávateľ', supplier_ic_dph: 'SK9876543210',
    items: [{ vat_rate: 23, subtotal: 600, vat_amount: 138 }] },
  { number: 'PFA002', issue_date: '2026-05-12', supplier_name: 'AT Dodávateľ (samozdanenie)', supplier_ic_dph: 'AT12345678',
    items: [{ vat_rate: 23, subtotal: 500, vat_amount: 115 }] },
  { number: 'PFA003', issue_date: '2026-05-18', supplier_name: 'Drobný nákup', supplier_ic_dph: null,
    items: [{ vat_rate: 23, subtotal: 50, vat_amount: 11.5 }] }, // <100€ celkom → B3
];
const creditNotesOut = [
  { number: 'DOB001', issue_date: '2026-05-25', customer_name: 'SK Klient s.r.o.', customer_ic_dph: 'SK1234567890',
    items: [{ vat_rate: 23, subtotal: -100, vat_amount: -23 }] },
];
const ekasaOut = { base23: 250, vat23: 57.5, base19: 0, vat19: 0, base10: 100, vat10: 10 };

const kvXml = generateKvDphXml(firm, period, outInvs, inInvs, { creditNotesOut, ekasaOut });
console.log('Vstupné dáta:');
console.log('  A1 (vystavené SK): FA001 - 1000€ / 230€ DPH');
console.log('  B1 (prijaté SK): PFA001 - 600€ / 138€ DPH');
console.log('  B2 (prijaté AT, ≥100€): PFA002 - 500€ / 115€ DPH');
console.log('  B3 (prijaté <100€): PFA003 - 50€ / 11.5€ DPH');
console.log('  C1 (dobropis out): DOB001 - -100€ / -23€ DPH');
console.log('  D1 (eKasa out): 250€ pri 23%, 100€ pri 10%');
console.log('');
const hasA1 = kvXml.includes('FA001') && kvXml.includes('SK1234567890');
const hasB1 = kvXml.includes('PFA001');
const hasB2 = kvXml.includes('PFA002') && kvXml.includes('AT12345678');
const hasB3 = kvXml.includes('PFA003') && kvXml.includes('ZjednFA');
const hasC1 = kvXml.includes('DOB001') && kvXml.includes('OpravnyDoklad');
const hasD1 = kvXml.includes('SekciaD1') && kvXml.includes('250.00');
console.log(`  A1 obsahuje FA001 + SK IC DPH:    ${hasA1 ? '✓' : '✗'}`);
console.log(`  B1 obsahuje PFA001:               ${hasB1 ? '✓' : '✗'}`);
console.log(`  B2 obsahuje PFA002 + AT IC DPH:   ${hasB2 ? '✓' : '✗'}`);
console.log(`  B3 má PFA003 ako <ZjednFA>:       ${hasB3 ? '✓' : '✗'}`);
console.log(`  C1 má DOB001 ako <OpravnyDoklad>: ${hasC1 ? '✓' : '✗'}`);
console.log(`  D1 má eKasa sumár 250.00:         ${hasD1 ? '✓' : '✗'}`);
console.log('');

// ──────────────────────────────────────────────────────────────
// TEST 3: SV DPH (EU dodania súhrnný výkaz)
// ──────────────────────────────────────────────────────────────
console.log('▌ TEST 3 — SV DPH (EU dodania)');
console.log('─────────────────────────────────────────────────────────────');
const euInvs = [
  { customer_ic_dph: 'CZ12345678', baseEu: 800 },
  { customer_ic_dph: 'CZ12345678', baseEu: 500 },   // ten istý partner — má sa zlúčiť
  { customer_ic_dph: 'DE111111111', baseEu: 1200 },
];
const svXml = generateSvDphXml(firm, period, euInvs);
const czGrouped = svXml.includes('CZ12345678') && svXml.includes('1300.00');
const deOk = svXml.includes('DE111111111') && svXml.includes('1200.00');
console.log('Vstup: 2× CZ + 1× DE');
console.log(`  CZ12345678 zoskupené na 1300.00 € (800+500): ${czGrouped ? '✓' : '✗'}`);
console.log(`  DE111111111 = 1200.00:                       ${deOk ? '✓' : '✗'}`);
console.log('');

// ──────────────────────────────────────────────────────────────
// TEST 4: DPPO + DPFO-B (daň z príjmu PO + FO podnikateľ)
// ──────────────────────────────────────────────────────────────
console.log('▌ TEST 4 — DPPO (PO) + DPFO-B (FO podnikateľ)');
console.log('─────────────────────────────────────────────────────────────');

// PO malá firma (obrat 50k → 15% sadzba)
const poRes = calcDzp({ type: 'PO', revenue: 50000, expenses: 30000, prepaid: 1000 });
console.log('Vstup PO: výnosy 50000, náklady 30000, preddavky 1000');
console.log(`  profit         = ${poRes.profit}  (očakávané 20000)   ${poRes.profit === 20000 ? '✓' : '✗'}`);
console.log(`  taxBase        = ${poRes.taxBase} (očakávané 20000)   ${poRes.taxBase === 20000 ? '✓' : '✗'}`);
console.log(`  tax 15%        = ${poRes.tax}    (očakávané 3000)    ${poRes.tax === 3000 ? '✓' : '✗'}`);
console.log(`  toPay          = ${poRes.toPay}  (očakávané 2000 po -1000 preddavku) ${poRes.toPay === 2000 ? '✓' : '✗'}`);
const dppoXml = generateDppoXml(firm, year, poRes);
console.log(`  XML má R510=15:    ${dppoXml.includes('<R510_DanovaSadzba>15</R510_DanovaSadzba>') ? '✓' : '✗'}`);
console.log(`  XML má R900=2000:  ${dppoXml.includes('<R900_VysledokDane>2000.00</R900_VysledokDane>') ? '✓' : '✗'}`);
console.log('');

// PO veľká firma (obrat 100k → 21%)
const poBigRes = calcDzp({ type: 'PO', revenue: 100000, expenses: 50000 });
console.log('Vstup PO veľká: výnosy 100000, náklady 50000');
console.log(`  tax 21%        = ${poBigRes.tax} (očakávané 10500)   ${poBigRes.tax === 10500 ? '✓' : '✗'}`);
console.log('');

// FO-B s 2 deťmi
const foRes = calcDzp({ type: 'FO-B', revenue: 30000, expenses: 10000, childCount: 2 });
console.log('Vstup FO-B: príjmy 30000, výdavky 10000, 2 deti');
console.log(`  profit         = ${foRes.profit} (očakávané 20000) ${foRes.profit === 20000 ? '✓' : '✗'}`);
// taxBase = profit - nezdaniteľná (5753.76) = 14246.24
console.log(`  taxBase        = ${foRes.taxBase} (očakávané 14246.24)`);
console.log(`  tax 19%        = ${foRes.tax}   (≈2706.79)`);
console.log(`  daňový bonus   = ${2 * 600} (2×600)`);
console.log(`  taxAfterBonus  = ${foRes.taxAfterBonus} (tax - 1200)`);
console.log('');

// ──────────────────────────────────────────────────────────────
// TEST 5: DPFO-A (závislá činnosť — zamestnanec)
// ──────────────────────────────────────────────────────────────
console.log('▌ TEST 5 — DPFO-A (zamestnanec)');
console.log('─────────────────────────────────────────────────────────────');
const dpaRes = calcDpfoA({ brutto_year: 18000, preddavky_paid: 1500, socialne: 1692, zdravotne: 720, childCount: 1 });
console.log('Vstup: brutto 18000, soc 1692, zdr 720, preddavky 1500, 1 dieťa');
console.log(`  odvody         = ${dpaRes.odvody}        (očakávané 2412)         ${dpaRes.odvody === 2412 ? '✓' : '✗'}`);
console.log(`  ciastkovyZakl  = ${dpaRes.ciastkovyZaklad} (očakávané 15588)        ${dpaRes.ciastkovyZaklad === 15588 ? '✓' : '✗'}`);
console.log(`  nezdaniteľná   = ${dpaRes.nezdanitelna}   (default 5753.76)`);
console.log(`  taxBase        = ${dpaRes.taxBase}        (15588-5753.76=9834.24)`);
console.log(`  tax 19%        = ${dpaRes.tax}            (≈9834.24 × 0.19 = 1868.51)`);
console.log(`  bonus          = ${dpaRes.bonus}          (1 dieťa × 600 = 600)    ${dpaRes.bonus === 600 ? '✓' : '✗'}`);
console.log(`  taxAfterBonus  = ${dpaRes.taxAfterBonus}  (tax-600 = ~1268.51)`);
console.log(`  vysledok       = ${dpaRes.vysledok}      (po -1500 preddavku, môže byť záporný = preplatok)`);
const dpaXml = generateDpfoAXml(firm, year, dpaRes);
console.log(`  XML má <DPFOAv26>: ${dpaXml.includes('<DPFOAv26') ? '✓' : '✗'}`);
console.log(`  XML má R36 brutto: ${dpaXml.includes('<R36_PrijmyZavisla>18000.00') ? '✓' : '✗'}`);
console.log('');

// ──────────────────────────────────────────────────────────────
// TEST 6: DPMV (motorové vozidlá)
// ──────────────────────────────────────────────────────────────
console.log('▌ TEST 6 — DPMV (motorové vozidlá)');
console.log('─────────────────────────────────────────────────────────────');
const vehicles = [
  { plate: 'BA-123-AB', type: 'osobné',  weight_kg: 1500, engine_cm3: 1600, fuel: 'diesel'   as const, first_registration: '2020-01-01', annual_tax: 148 },
  { plate: 'BA-456-CD', type: 'nákladné', weight_kg: 3500, engine_cm3: 2500, fuel: 'diesel'   as const, first_registration: '2019-06-01', annual_tax: 420 },
];
const dpmvCalc = calcDpmv(vehicles);
console.log(`  Spolu daň: ${dpmvCalc.total} € (očakávané 568) ${dpmvCalc.total === 568 ? '✓' : '✗'}`);
const dpmvXml = generateDpmvXml(firm, year, vehicles);
console.log(`  XML má 2 vozidlá: ${(dpmvXml.match(/<Vozidlo /g) || []).length === 2 ? '✓' : '✗'}`);
console.log(`  XML má R10=2:      ${dpmvXml.includes('<R10_CelkovyPocetVozidiel>2</R10_CelkovyPocetVozidiel>') ? '✓' : '✗'}`);
console.log(`  XML má R20=568.00: ${dpmvXml.includes('<R20_CelkovaSuma>568.00</R20_CelkovaSuma>') ? '✓' : '✗'}`);
console.log('');

// ──────────────────────────────────────────────────────────────
// TEST 7: Zrážková daň §43
// ──────────────────────────────────────────────────────────────
console.log('▌ TEST 7 — Zrážková daň §43');
console.log('─────────────────────────────────────────────────────────────');
const whRows = [
  { recipient_name: 'Ján Autor', recipient_rc: '8001011234', payment_type: 'autorský honorár', payment_date: '2026-05-10', brutto: 1000, rate: 19, withheld: 190 },
  { recipient_name: 'Mária Lic', recipient_rc: '7505052345', payment_type: 'licenčný poplatok', payment_date: '2026-05-20', brutto: 2000, rate: 19, withheld: 380 },
];
const whXml = generateWithholdingXml(firm, period, whRows);
console.log(`  XML má 2 záznamy:        ${(whXml.match(/<Zaznam /g) || []).length === 2 ? '✓' : '✗'}`);
console.log(`  XML má sumár 570.00:     ${whXml.includes('<CelkomZrazka>570.00</CelkomZrazka>') ? '✓' : '✗'}`);
console.log(`  XML má autorský honorár: ${whXml.includes('autorský honorár') ? '✓' : '✗'}`);
console.log('');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  HOTOVO. Ak vidíš ✗ niekde, daj vedieť.');
console.log('═══════════════════════════════════════════════════════════════');
