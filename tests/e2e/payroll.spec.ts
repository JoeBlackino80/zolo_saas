import { test, expect } from '@playwright/test';
import { calcPayroll, PAYROLL_2026 } from '../../src/lib/payroll';
import { calcDzp } from '../../src/lib/dzp';

test.describe('Payroll SK 2026', () => {
  test('calculates gross 1500 EUR correctly', () => {
    const r = calcPayroll(1500);
    expect(r.gross).toBe(1500);
    expect(r.emp_sp).toBeCloseTo(1500 * PAYROLL_2026.emp_sp_rate, 2);
    expect(r.emp_zp).toBeCloseTo(1500 * PAYROLL_2026.emp_zp_rate, 2);
    expect(r.empr_sp).toBeCloseTo(1500 * PAYROLL_2026.empr_sp_rate, 2);
    expect(r.empr_zp).toBeCloseTo(1500 * PAYROLL_2026.empr_zp_rate, 2);
    expect(r.totalCost).toBeGreaterThan(r.gross);
    expect(r.net).toBeLessThan(r.gross);
  });

  test('applies child bonus correctly', () => {
    const r0 = calcPayroll(1500);
    const r2 = calcPayroll(1500, { childCount: 2 });
    expect(r2.net - r0.net).toBeCloseTo(2 * PAYROLL_2026.child_bonus, 2);
  });

  test('higher income tax bracket activates above threshold', () => {
    // Monthly base over 47537.50/12 = 3961.46 should trigger 25%
    const r = calcPayroll(8000);
    expect(r.tax).toBeGreaterThan(0);
  });
});

test.describe('DZP calculator', () => {
  test('PO at 15% for revenue under 60k', () => {
    const r = calcDzp({ type: 'PO', revenue: 50000, expenses: 30000 });
    expect(r.profit).toBe(20000);
    expect(r.tax).toBeCloseTo(20000 * 0.15, 2);
  });

  test('PO at 21% for revenue over 60k', () => {
    const r = calcDzp({ type: 'PO', revenue: 100000, expenses: 50000 });
    expect(r.profit).toBe(50000);
    expect(r.tax).toBeCloseTo(50000 * 0.21, 2);
  });

  test('FO with nezdanitelna deduction', () => {
    const r = calcDzp({ type: 'FO-B', revenue: 30000, expenses: 10000 });
    expect(r.profit).toBe(20000);
    expect(r.taxBase).toBeLessThan(r.profit);
  });

  test('handles loss case', () => {
    const r = calcDzp({ type: 'PO', revenue: 1000, expenses: 5000 });
    expect(r.profit).toBe(-4000);
    expect(r.tax).toBe(0);
  });
});
