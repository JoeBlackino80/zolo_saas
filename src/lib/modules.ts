// Module-based access control.
// Defines které moduly musí byť aktívne pre danú sekciu/stránku.

export type Module =
  | 'invoicing'   // Predaj (FA, PFA, ZF, atď., Zákazníci, Cenník)
  | 'finance'     // Financie (Banka, Cashflow, Pokladnica, Účty, Pohľadávky, Záväzky)
  | 'accounting'  // Účtovníctvo (Denník, Osnova, Projekty, Strediská, Majetok, Sklad, Mzdy, Cesty)
  | 'taxes'       // Dane (DPH, Priznania, eDane, eKasa, Kalendár, Závierka)
  | 'reports'     // Reporty (Reporty, Archív, AI asistent)
  | 'payroll'     // Mzdy (submodul accounting)
  | 'warehouse'   // Sklad (submodul accounting)
  | 'ai'          // AI asistent + PFA extract
  | 'api'         // REST API
  | 'multi_company'; // Viac firiem naraz

// Sidebar sekcia → povinný modul (undefined = always visible)
export const SECTION_MODULES: Record<string, Module | undefined> = {
  'Prehľad': undefined,
  'Predaj': 'invoicing',
  'Financie': 'finance',
  'Účtovníctvo': 'accounting',
  'Dane': 'taxes',
  'Reporty': 'reports',
  'Nastavenia': undefined,
};

// Named plans → default module sets
export const PLANS: Record<string, { label: string; modules: Module[]; price: string; description: string }> = {
  free: {
    label: 'Free',
    price: 'zdarma',
    description: 'Základ pre živnostníkov — fakturácia + reporty',
    modules: ['invoicing', 'reports'],
  },
  pro: {
    label: 'Pro',
    price: '€15 / mes',
    description: 'Pre malé firmy — pridáva bankový modul, dane, AI',
    modules: ['invoicing', 'finance', 'taxes', 'reports', 'ai'],
  },
  business: {
    label: 'Business',
    price: '€49 / mes',
    description: 'Kompletné účtovníctvo, mzdy, sklad, API',
    modules: ['invoicing', 'finance', 'accounting', 'taxes', 'reports', 'payroll', 'warehouse', 'ai', 'api', 'multi_company'],
  },
  enterprise: {
    label: 'Enterprise',
    price: 'na vyžiadanie',
    description: 'Vlastné integrácie, SLA, prioritná podpora',
    modules: ['invoicing', 'finance', 'accounting', 'taxes', 'reports', 'payroll', 'warehouse', 'ai', 'api', 'multi_company'],
  },
};

export function hasModule(enabledModules: string[] | null | undefined, module: Module): boolean {
  if (!enabledModules || enabledModules.length === 0) return true; // fallback: assume all if unset
  return enabledModules.includes(module);
}

// URL path → required module (pre middleware/page-level gate)
export const PATH_MODULE_MAP: { prefix: string; module: Module }[] = [
  { prefix: '/dashboard/invoices', module: 'invoicing' },
  { prefix: '/dashboard/customers', module: 'invoicing' },
  { prefix: '/dashboard/products', module: 'invoicing' },
  { prefix: '/dashboard/quotes', module: 'invoicing' },
  { prefix: '/dashboard/orders', module: 'invoicing' },
  { prefix: '/dashboard/recurring', module: 'invoicing' },

  { prefix: '/dashboard/bank', module: 'finance' },
  { prefix: '/dashboard/bank-accounts', module: 'finance' },
  { prefix: '/dashboard/cash-book', module: 'finance' },
  { prefix: '/dashboard/cashflow', module: 'finance' },
  { prefix: '/dashboard/receivables', module: 'finance' },
  { prefix: '/dashboard/payables', module: 'finance' },
  { prefix: '/dashboard/approvals', module: 'finance' },

  { prefix: '/dashboard/journal', module: 'accounting' },
  { prefix: '/dashboard/chart-of-accounts', module: 'accounting' },
  { prefix: '/dashboard/predkontacie', module: 'accounting' },
  { prefix: '/dashboard/cost-centers', module: 'accounting' },
  { prefix: '/dashboard/projects', module: 'accounting' },
  { prefix: '/dashboard/assets', module: 'accounting' },
  { prefix: '/dashboard/travel', module: 'accounting' },
  { prefix: '/dashboard/fiscal-years', module: 'accounting' },

  { prefix: '/dashboard/stock', module: 'warehouse' },
  { prefix: '/dashboard/stock-movements', module: 'warehouse' },

  { prefix: '/dashboard/payroll', module: 'payroll' },
  { prefix: '/dashboard/employees', module: 'payroll' },

  { prefix: '/dashboard/vat', module: 'taxes' },
  { prefix: '/dashboard/vat-return', module: 'taxes' },
  { prefix: '/dashboard/control-statement', module: 'taxes' },
  { prefix: '/dashboard/summary-statement', module: 'taxes' },
  { prefix: '/dashboard/income-tax', module: 'taxes' },
  { prefix: '/dashboard/dpfo-a', module: 'taxes' },
  { prefix: '/dashboard/dpmv', module: 'taxes' },
  { prefix: '/dashboard/withholding', module: 'taxes' },
  { prefix: '/dashboard/real-estate', module: 'taxes' },
  { prefix: '/dashboard/edane', module: 'taxes' },
  { prefix: '/dashboard/ekasa', module: 'taxes' },
  { prefix: '/dashboard/calendar', module: 'taxes' },
  { prefix: '/dashboard/tax-returns', module: 'taxes' },
  { prefix: '/dashboard/closing', module: 'taxes' },
  { prefix: '/dashboard/optimize', module: 'taxes' },

  { prefix: '/dashboard/reports', module: 'reports' },
  { prefix: '/dashboard/archive', module: 'reports' },
  { prefix: '/dashboard/import', module: 'ai' },
];

export function requiredModule(pathname: string): Module | undefined {
  const match = PATH_MODULE_MAP.find((m) => pathname.startsWith(m.prefix));
  return match?.module;
}
