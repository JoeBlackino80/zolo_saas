import { test, expect } from '@playwright/test';
import { aggregateVat, generateDpDphXml } from '../../src/lib/vat';

test.describe('VAT calculations', () => {
  test('aggregates VAT correctly across rates', async () => {
    const out = [
      { vat_rate: 23, subtotal: 1000, vat_amount: 230 },
      { vat_rate: 19, subtotal: 500, vat_amount: 95 },
      { vat_rate: 10, subtotal: 200, vat_amount: 20 },
      { vat_rate: 0, subtotal: 300, vat_amount: 0 },
    ];
    const inb = [
      { vat_rate: 23, subtotal: 400, vat_amount: 92 },
    ];
    const t = aggregateVat(out, inb);
    expect(t.outBase23).toBe(1000);
    expect(t.outVat23).toBe(230);
    expect(t.outBase19).toBe(500);
    expect(t.outVat19).toBe(95);
    expect(t.outBase10).toBe(200);
    expect(t.outVat10).toBe(20);
    expect(t.outBaseEu).toBe(300);
    expect(t.totalOutVat).toBe(345);
    expect(t.totalInVat).toBe(92);
    expect(t.obligation).toBe(253);
  });

  test('generates DP DPH XML with correct namespace', async () => {
    const t = aggregateVat([{ vat_rate: 23, subtotal: 1000, vat_amount: 230 }], []);
    const xml = generateDpDphXml({ dic: '2020123456', ic_dph: 'SK2020123456', name: 'Test s.r.o.' }, '2026-06', t);
    expect(xml).toContain('<?xml version="1.0" encoding="windows-1250"?>');
    expect(xml).toContain('xmlns="http://www.financnasprava.sk/dphv24"');
    expect(xml).toContain('<DIC>2020123456</DIC>');
    expect(xml).toContain('<R01_Zaklad>1000.00</R01_Zaklad>');
    expect(xml).toContain('<R02_Dan>230.00</R02_Dan>');
    expect(xml).toContain('<R32_Povinnost>230.00</R32_Povinnost>');
  });

  test('handles negative obligation as nadmerny odpocet', async () => {
    const t = aggregateVat([{ vat_rate: 23, subtotal: 100, vat_amount: 23 }], [{ vat_rate: 23, subtotal: 1000, vat_amount: 230 }]);
    expect(t.obligation).toBe(-207);
    const xml = generateDpDphXml({ dic: '123', ic_dph: 'SK123', name: 'A' }, '2026-06', t);
    expect(xml).toContain('<R33_Nadmerny>207.00</R33_Nadmerny>');
    expect(xml).toContain('<R32_Povinnost>0.00</R32_Povinnost>');
  });
});
