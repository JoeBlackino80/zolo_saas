// SK 2026 sadzby
export const PAYROLL_2026 = {
  // Zamestnanec
  emp_sp_rate: 0.094,          // sociálne poistenie zamestnanec 9.4%
  emp_zp_rate: 0.04,           // zdravotné poistenie zamestnanec 4%
  // Zamestnávateľ
  empr_sp_rate: 0.2520,        // 25.2% (SP 24.4% + GP 0.8%)
  empr_zp_rate: 0.11,          // 11% zdravotné zamestnávateľ
  // Daň
  income_tax_rate_19: 0.19,    // do 47 537.50 € základu
  income_tax_rate_25: 0.25,    // nad 47 537.50 €
  income_tax_threshold: 47537.50,
  // Nezdaniteľná suma 2026 (predpoklad)
  monthly_tax_relief: 479.48,
  // Daňový bonus na dieťa (mesiac, 2026)
  child_bonus: 50,
};

export function calcPayroll(gross: number, opts: { childCount?: number; isExecutive?: boolean } = {}) {
  const g = +gross || 0;
  const emp_sp = +(g * PAYROLL_2026.emp_sp_rate).toFixed(2);
  const emp_zp = +(g * PAYROLL_2026.emp_zp_rate).toFixed(2);
  const empr_sp = +(g * PAYROLL_2026.empr_sp_rate).toFixed(2);
  const empr_zp = +(g * PAYROLL_2026.empr_zp_rate).toFixed(2);
  const taxBase = Math.max(0, g - emp_sp - emp_zp - PAYROLL_2026.monthly_tax_relief);
  let tax: number;
  if (taxBase <= PAYROLL_2026.income_tax_threshold / 12) {
    tax = +(taxBase * PAYROLL_2026.income_tax_rate_19).toFixed(2);
  } else {
    const lower = PAYROLL_2026.income_tax_threshold / 12;
    tax = +(lower * PAYROLL_2026.income_tax_rate_19 + (taxBase - lower) * PAYROLL_2026.income_tax_rate_25).toFixed(2);
  }
  const childBonus = +((opts.childCount || 0) * PAYROLL_2026.child_bonus).toFixed(2);
  const taxAfterBonus = Math.max(0, tax - childBonus);
  const net = +(g - emp_sp - emp_zp - taxAfterBonus).toFixed(2);
  const totalCost = +(g + empr_sp + empr_zp).toFixed(2);
  return {
    gross: g,
    emp_sp, emp_zp,
    empr_sp, empr_zp,
    taxBase: +taxBase.toFixed(2),
    tax: taxAfterBonus,
    childBonus,
    net,
    totalCost,
    employee_deductions: +(emp_sp + emp_zp + taxAfterBonus).toFixed(2),
    employer_contributions: +(empr_sp + empr_zp).toFixed(2),
  };
}
