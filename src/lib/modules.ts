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

// Named plans → default module sets + resource limits
export type PlanLimits = {
  maxCompanies: number;      // koľko firiem pod účtom (-1 = neobmedzene)
  maxInvoicesTotal: number;  // koľko FA celkovo (-1 = neobmedzene) — Free tvrdý limit
  maxContacts: number;       // koľko partnerov/kontaktov (-1 = neobmedzene)
  maxAiExtractsPerMonth: number; // PFA AI extraction (-1 = neobmedzene, 0 = zakázané)
  maxTeamMembers: number;    // tím veľkosť (-1 = neobmedzene)
};

export const PLANS: Record<string, { label: string; modules: Module[]; price: string; description: string; limits: PlanLimits }> = {
  free: {
    label: 'Free',
    price: 'zdarma',
    description: '1 firma, 10 dokladov celkovo, 5 kontaktov — na vyskúšanie',
    modules: ['invoicing', 'reports'],
    limits: { maxCompanies: 1, maxInvoicesTotal: 10, maxContacts: 5, maxAiExtractsPerMonth: 0, maxTeamMembers: 1 },
  },
  pro: {
    label: 'Pro',
    price: '€15 / mes',
    description: '3 firmy, neobmedzene dokladov, banka, dane, AI 100/mes',
    modules: ['invoicing', 'finance', 'taxes', 'reports', 'ai'],
    limits: { maxCompanies: 3, maxInvoicesTotal: -1, maxContacts: -1, maxAiExtractsPerMonth: 100, maxTeamMembers: 5 },
  },
  business: {
    label: 'Business',
    price: '€49 / mes',
    description: 'Kompletné účtovníctvo, mzdy, sklad, API — neobmedzene',
    modules: ['invoicing', 'finance', 'accounting', 'taxes', 'reports', 'payroll', 'warehouse', 'ai', 'api', 'multi_company'],
    limits: { maxCompanies: -1, maxInvoicesTotal: -1, maxContacts: -1, maxAiExtractsPerMonth: -1, maxTeamMembers: 50 },
  },
  enterprise: {
    label: 'Enterprise',
    price: 'na vyžiadanie',
    description: 'Vlastné integrácie, SLA, prioritná podpora',
    modules: ['invoicing', 'finance', 'accounting', 'taxes', 'reports', 'payroll', 'warehouse', 'ai', 'api', 'multi_company'],
    limits: { maxCompanies: -1, maxInvoicesTotal: -1, maxContacts: -1, maxAiExtractsPerMonth: -1, maxTeamMembers: -1 },
  },
};

// Subscription status stavy
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'expired' | 'canceled' | 'free';

// Kontrola: má firma aktívne (platené alebo trial) predplatné?
export function isSubscriptionActive(status: SubscriptionStatus | string | null | undefined, plan: string | null | undefined): boolean {
  if (plan === 'free') return true; // Free plán vždy aktívny (v rámci limitov)
  return status === 'active' || status === 'trialing';
}

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
