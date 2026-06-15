// Simple i18n framework — flat key-value translations
export type Locale = 'sk' | 'cs' | 'en';

const dict: Record<Locale, Record<string, string>> = {
  sk: {
    'nav.dashboard': 'Dashboard',
    'nav.invoices': 'Fakturácia',
    'nav.receivables': 'Pohľadávky',
    'nav.vat': 'Zadávanie DPH',
    'nav.calendar': 'Daňový kalendár',
    'nav.payroll': 'Mzdy',
    'nav.assets': 'Majetok',
    'nav.customers': 'Zákazníci',
    'nav.settings': 'Nastavenia',
    'btn.save': 'Uložiť',
    'btn.cancel': 'Zrušiť',
    'btn.delete': 'Zmazať',
    'btn.new': 'Nový',
    'btn.edit': 'Upraviť',
    'common.total': 'Spolu',
    'common.subtotal': 'Základ',
    'common.vat': 'DPH',
  },
  cs: {
    'nav.dashboard': 'Dashboard',
    'nav.invoices': 'Fakturace',
    'nav.receivables': 'Pohledávky',
    'nav.vat': 'Zadávání DPH',
    'nav.calendar': 'Daňový kalendář',
    'nav.payroll': 'Mzdy',
    'nav.assets': 'Majetek',
    'nav.customers': 'Zákazníci',
    'nav.settings': 'Nastavení',
    'btn.save': 'Uložit',
    'btn.cancel': 'Zrušit',
    'btn.delete': 'Smazat',
    'btn.new': 'Nový',
    'btn.edit': 'Upravit',
    'common.total': 'Celkem',
    'common.subtotal': 'Základ',
    'common.vat': 'DPH',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.invoices': 'Invoicing',
    'nav.receivables': 'Receivables',
    'nav.vat': 'VAT entry',
    'nav.calendar': 'Tax calendar',
    'nav.payroll': 'Payroll',
    'nav.assets': 'Assets',
    'nav.customers': 'Customers',
    'nav.settings': 'Settings',
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.delete': 'Delete',
    'btn.new': 'New',
    'btn.edit': 'Edit',
    'common.total': 'Total',
    'common.subtotal': 'Subtotal',
    'common.vat': 'VAT',
  },
};

export function t(key: string, locale: Locale = 'sk'): string {
  return dict[locale]?.[key] || dict.sk[key] || key;
}

export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'sk';
  const saved = localStorage.getItem('zolo_locale') as Locale;
  if (saved && ['sk', 'cs', 'en'].includes(saved)) return saved;
  const nav = navigator.language?.toLowerCase() || '';
  if (nav.startsWith('cs')) return 'cs';
  if (nav.startsWith('en')) return 'en';
  return 'sk';
}
