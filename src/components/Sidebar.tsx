'use client';

import {
  LayoutDashboard,
  FileText,
  Users,
  Tag,
  Repeat,
  ReceiptText,
  Landmark,
  Wallet,
  PiggyBank,
  Banknote,
  ClipboardList,
  Clock,
  Percent,
  Target,
  BookOpen,
  Library,
  Briefcase,
  LayoutGrid,
  Boxes,
  Plane,
  HardHat,
  CalendarDays,
  History,
  Send,
  ShoppingBag,
  Coins,
  Archive,
  Sparkles,
  Link2,
  TrendingUp,
  BarChart3,
  Users2,
  ShieldCheck,
  Activity,
  HelpCircle,
  Settings as SettingsIcon,
  Plus,
  Search,
  LogOut,
  ChevronDown,
  Car,
  Building2,
  Scissors,
  Wallet2,
  Receipt,
  BookMarked,
} from 'lucide-react';
import { useRouter, useSelectedLayoutSegment, usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from './NotificationBell';
import { SECTION_MODULES, hasModule, type Module } from '@/lib/modules';

type Company = {
  id: string;
  name: string;
  ico: string | null;
  dic: string | null;
  ic_dph: string | null;
  is_vat_payer: boolean | null;
  plan?: string | null;
  enabled_modules?: string[] | null;
};

type NavItemDef = {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  href: string;
  segments: string[];
  beta?: boolean;
  shortcut?: string;
  children?: NavSubItem[];
};

type NavSubItem = {
  label: string;
  href: string;
};

type NavSection = {
  label: string;
  items: NavItemDef[];
};

const SECTIONS: NavSection[] = [
  {
    label: 'Prehľad',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', segments: [''], shortcut: '⌘D' },
    ],
  },
  {
    label: 'Predaj',
    items: [
      { icon: FileText, label: 'Fakturácia', href: '/dashboard/invoices', segments: ['invoices'], shortcut: '⌘I',
        children: [
          { label: 'Všetky doklady',      href: '/dashboard/invoices' },
          { label: 'Vydané faktúry',       href: '/dashboard/invoices?type=invoice' },
          { label: 'Prijaté faktúry',      href: '/dashboard/invoices/received' },
          { label: 'Zálohové faktúry',     href: '/dashboard/invoices?type=proforma' },
          { label: 'Preddavkové FA',        href: '/dashboard/invoices?type=advance_invoice' },
          { label: 'Prijaté zálohové FA',   href: '/dashboard/invoices?type=received_proforma' },
          { label: 'Dobropisy',             href: '/dashboard/invoices?type=credit_note' },
          { label: 'Prijaté dobropisy',     href: '/dashboard/invoices?type=received_credit_note' },
          { label: 'Ťarchopisy',            href: '/dashboard/invoices?type=debit_note' },
          { label: 'Storno',                href: '/dashboard/invoices?type=storno' },
          { label: 'Dodacie listy',         href: '/dashboard/invoices?type=delivery_note' },
          { label: 'Cenové ponuky',         href: '/dashboard/invoices?type=quote' },
          { label: 'Príjmový PPD',          href: '/dashboard/cash-book/quick?type=cash_receipt' },
          { label: 'Výdavkový VPD',          href: '/dashboard/cash-book/quick?type=cash_payout' },
          { label: 'Interné doklady',       href: '/dashboard/journal/new' },
        ],
      },
      { icon: ReceiptText, label: 'Ponuky', href: '/dashboard/quotes', segments: ['quotes'] },
      { icon: ShoppingBag, label: 'Objednávky', href: '/dashboard/orders', segments: ['orders'],
        children: [
          { label: 'Všetky',     href: '/dashboard/orders' },
          { label: 'Nová',       href: '/dashboard/orders/new' },
        ],
      },
      { icon: Repeat, label: 'Opakované', href: '/dashboard/recurring', segments: ['recurring'],
        children: [
          { label: 'Aktívne',    href: '/dashboard/recurring' },
          { label: 'Nová',       href: '/dashboard/recurring/new' },
        ],
      },
      { icon: Users, label: 'Zákazníci', href: '/dashboard/customers', segments: ['customers'], shortcut: '⌘U',
        children: [
          { label: 'Všetci',     href: '/dashboard/customers' },
          { label: 'Nový',       href: '/dashboard/customers/new' },
        ],
      },
      { icon: Tag, label: 'Cenník', href: '/dashboard/products', segments: ['products'],
        children: [
          { label: 'Produkty',      href: '/dashboard/products' },
          { label: 'Nový produkt',  href: '/dashboard/products/new' },
          { label: 'CSV import',    href: '/dashboard/products/import' },
          { label: 'Hromadné ceny', href: '/dashboard/products/reprice' },
        ],
      },
    ],
  },
  {
    label: 'Financie',
    items: [
      { icon: Landmark, label: 'Banka', href: '/dashboard/bank', segments: ['bank'], shortcut: '⌘B',
        children: [
          { label: 'Prehľad',            href: '/dashboard/bank' },
          { label: 'Import výpisu (CSV)', href: '/dashboard/bank/import' },
          { label: 'Pravidlá párovania',  href: '/dashboard/bank/rules' },
          { label: 'Platobné príkazy',    href: '/dashboard/bank/payment-orders' },
        ],
      },
      { icon: TrendingUp, label: 'Cash flow', href: '/dashboard/cashflow', segments: ['cashflow'] },
      { icon: Wallet, label: 'Pokladnica', href: '/dashboard/cash-book', segments: ['cash-book'],
        children: [
          { label: 'Pohyby',      href: '/dashboard/cash-book' },
          { label: 'Nový doklad', href: '/dashboard/cash-book/new' },
        ],
      },
      { icon: Banknote, label: 'Bankové účty', href: '/dashboard/bank-accounts', segments: ['bank-accounts'],
        children: [
          { label: 'Účty', href: '/dashboard/bank-accounts' },
          { label: 'Nový', href: '/dashboard/bank-accounts/new' },
        ],
      },
      { icon: Clock, label: 'Pohľadávky', href: '/dashboard/receivables', segments: ['receivables'] },
      { icon: Receipt, label: 'Záväzky', href: '/dashboard/payables', segments: ['payables'] },
      { icon: ClipboardList, label: 'Schvaľovanie dokladov', href: '/dashboard/approvals', segments: ['approvals'] },
    ],
  },
  {
    label: 'Účtovníctvo',
    items: [
      { icon: BookOpen, label: 'Denník', href: '/dashboard/journal', segments: ['journal'], shortcut: '⌘J',
        children: [
          { label: 'Denník',            href: '/dashboard/journal' },
          { label: 'Nový zápis',         href: '/dashboard/journal/new' },
          { label: 'Časové rozlíšenie',  href: '/dashboard/journal/accruals' },
          { label: 'Hromadne zaúčtovať', href: '/dashboard/journal/bulk-post' },
        ],
      },
      { icon: Library, label: 'Účtovná osnova', href: '/dashboard/chart-of-accounts', segments: ['chart-of-accounts'],
        children: [
          { label: 'Osnova',    href: '/dashboard/chart-of-accounts' },
          { label: 'Nový účet', href: '/dashboard/chart-of-accounts/new' },
        ],
      },
      { icon: Briefcase, label: 'Projekty', href: '/dashboard/projects', segments: ['projects'],
        children: [
          { label: 'Projekty', href: '/dashboard/projects' },
          { label: 'Nový',     href: '/dashboard/projects/new' },
        ],
      },
      { icon: LayoutGrid, label: 'Nákladové strediská', href: '/dashboard/cost-centers', segments: ['cost-centers'] },
      { icon: PiggyBank, label: 'Majetok', href: '/dashboard/assets', segments: ['assets'],
        children: [
          { label: 'Karty majetku', href: '/dashboard/assets' },
          { label: 'Nový majetok',  href: '/dashboard/assets/new' },
        ],
      },
      { icon: Boxes, label: 'Sklad', href: '/dashboard/stock', segments: ['stock', 'stock-movements'],
        children: [
          { label: 'Stav skladu', href: '/dashboard/stock' },
          { label: 'Pohyby',       href: '/dashboard/stock-movements' },
          { label: 'Nový pohyb',   href: '/dashboard/stock-movements/new' },
          { label: 'Prevodka',     href: '/dashboard/stock-movements/transfer' },
          { label: 'Inventúra',    href: '/dashboard/stock/inventory' },
        ],
      },
      { icon: HardHat, label: 'Mzdy', href: '/dashboard/payroll', segments: ['payroll'], beta: true,
        children: [
          { label: 'Prehľad',          href: '/dashboard/payroll' },
          { label: 'Zamestnanci',       href: '/dashboard/employees' },
          { label: 'Nový zamestnanec',  href: '/dashboard/payroll/new' },
          { label: 'Výpočet mzdy',      href: '/dashboard/payroll/calc' },
          { label: 'Spracovať mzdy',    href: '/dashboard/payroll/run' },
        ],
      },
      { icon: Plane, label: 'Pracovné cesty', href: '/dashboard/travel', segments: ['travel'],
        children: [
          { label: 'Vyúčtovania',     href: '/dashboard/travel' },
          { label: 'Nová cesta',       href: '/dashboard/travel/new' },
          { label: 'Kalkulátor diét',  href: '/dashboard/travel/calc' },
          { label: 'Kniha jázd',       href: '/dashboard/travel/log' },
        ],
      },
    ],
  },
  {
    label: 'Dane',
    items: [
      { icon: Percent, label: 'DPH', href: '/dashboard/vat', segments: ['vat'],
        children: [
          { label: 'Zápisy DPH',          href: '/dashboard/vat' },
          { label: 'Záznamová povinnosť', href: '/dashboard/vat/records' },
          { label: 'DPH koeficient',       href: '/dashboard/vat/coefficient' },
          { label: 'DPH optimalizátor',    href: '/dashboard/optimize' },
        ],
      },
      { icon: Coins, label: 'Priznania', href: '/dashboard/vat-return',
        segments: ['income-tax', 'dpfo-a', 'dpmv', 'withholding', 'real-estate', 'vat-return', 'control-statement', 'summary-statement'],
        children: [
          { label: 'Priznanie DPH',        href: '/dashboard/vat-return' },
          { label: 'Kontrolný výkaz',       href: '/dashboard/control-statement' },
          { label: 'Súhrnný výkaz',         href: '/dashboard/summary-statement' },
          { label: 'Daň z príjmov',         href: '/dashboard/income-tax' },
          { label: 'Daň zo mzdy',           href: '/dashboard/dpfo-a' },
          { label: 'Daň z vozidiel',        href: '/dashboard/dpmv' },
          { label: 'Zrážková daň',          href: '/dashboard/withholding' },
          { label: 'Daň z nehnuteľností',   href: '/dashboard/real-estate' },
        ],
      },
      { icon: Send, label: 'eDane', href: '/dashboard/edane', segments: ['edane'] },
      { icon: ShoppingBag, label: 'eKasa', href: '/dashboard/ekasa', segments: ['ekasa'] },
      { icon: CalendarDays, label: 'Daňový kalendár', href: '/dashboard/calendar', segments: ['calendar'] },
      { icon: History, label: 'Podané priznania', href: '/dashboard/tax-returns', segments: ['tax-returns'] },
      { icon: BookMarked, label: 'Závierka', href: '/dashboard/closing', segments: ['closing'],
        children: [
          { label: 'Závierka',            href: '/dashboard/closing' },
          { label: 'Poznámky k závierke', href: '/dashboard/closing/notes' },
        ],
      },
    ],
  },
  {
    label: 'Reporty',
    items: [
      { icon: BarChart3, label: 'Reporty', href: '/dashboard/reports', segments: ['reports'], shortcut: '⌘R',
        children: [
          { label: 'Prehľad',    href: '/dashboard/reports' },
          { label: 'Súvaha',      href: '/dashboard/reports/balance-sheet' },
          { label: 'Výsledovka',   href: '/dashboard/reports/income-statement' },
          { label: 'INTRASTAT',    href: '/dashboard/reports/intrastat' },
        ],
      },
      { icon: Archive, label: 'Digitálny archív', href: '/dashboard/archive', segments: ['archive'] },
      { icon: Sparkles, label: 'AI asistent', href: '/dashboard/import', segments: ['import'], beta: true },
    ],
  },
  {
    label: 'Nastavenia',
    items: [
      { icon: Users2, label: 'Tím', href: '/dashboard/team', segments: ['team'] },
      { icon: ShieldCheck, label: 'Bezpečnosť', href: '/dashboard/settings/security', segments: [] },
      { icon: HelpCircle, label: 'Pomoc', href: '/dashboard/help', segments: ['help'] },
      { icon: SettingsIcon, label: 'Konfigurácia', href: '/dashboard/settings', segments: ['settings'],
        children: [
          { label: 'Profil firmy',   href: '/dashboard/settings' },
          { label: 'Branding',       href: '/dashboard/settings/branding' },
          { label: 'E-maily',         href: '/dashboard/settings/email' },
          { label: 'Platby',          href: '/dashboard/settings/payments' },
          { label: 'Cenové úrovne',   href: '/dashboard/settings/price-levels' },
          { label: 'Notifikácie',     href: '/dashboard/settings/notifications' },
          { label: 'Monitorovanie',   href: '/dashboard/settings/monitoring' },
          { label: 'Predplatné',      href: '/dashboard/settings/subscription' },
          { label: 'Aktivované moduly', href: '/dashboard/settings/modules' },
          { label: 'Preferencie',     href: '/dashboard/settings/preferences' },
        ],
      },
      { icon: CalendarDays, label: 'Účtovné obdobia', href: '/dashboard/fiscal-years', segments: ['fiscal-years'] },
      { icon: Library, label: 'Predkontácie', href: '/dashboard/predkontacie', segments: ['predkontacie'] },
      { icon: Link2, label: 'Integrácie', href: '/dashboard/links', segments: ['links'],
        children: [
          { label: 'Integrácie', href: '/dashboard/links' },
          { label: 'API kľúče',  href: '/dashboard/settings/api-keys' },
          { label: 'Webhooks',   href: '/dashboard/settings/webhooks' },
        ],
      },
      { icon: Activity, label: 'Audit', href: '/dashboard/audit', segments: ['audit'],
        children: [
          { label: 'Audit log',         href: '/dashboard/audit' },
          { label: 'Kontroly dokladov', href: '/dashboard/audit/checks' },
        ],
      },
    ],
  },
];

const COLLAPSED_KEY = 'zolo_sidebar_collapsed_v2';
const RECENT_KEY = 'zolo_sidebar_recent';
const MAX_RECENT = 4;

// Default: iba Prehľad + Predaj otvorené; ostatné collapsed
const DEFAULT_COLLAPSED: Record<string, boolean> = {
  'Prehľad': false,
  'Predaj': false,
  'Financie': true,
  'Účtovníctvo': true,
  'Dane': true,
  'Reporty': true,
  'Nastavenia': true,
};

// Global route → label pre "Naposledy použité"
const ALL_ROUTES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const s of SECTIONS) {
    for (const item of s.items) {
      map[item.href] = item.label;
      for (const sub of item.children || []) {
        // strip query string for path key
        const key = sub.href.split('?')[0];
        if (!map[key]) map[key] = `${item.label} · ${sub.label}`;
      }
    }
  }
  return map;
})();

export default function Sidebar({ companies, userEmail }: { companies: Company[]; userEmail: string }) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const pathname = usePathname();
  const [currentFirmId, setCurrentFirmId] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') || '' : ''
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(DEFAULT_COLLAPSED);
  const [recent, setRecent] = useState<{ href: string; label: string }[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      if (raw) setCollapsed({ ...DEFAULT_COLLAPSED, ...JSON.parse(raw) });
    } catch {}
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }, []);

  // Track recent pages
  useEffect(() => {
    if (typeof window === 'undefined' || !pathname) return;
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/search')) return;
    const label = ALL_ROUTES[pathname];
    if (!label) return;
    setRecent((prev) => {
      const next = [{ href: pathname, label }, ...prev.filter((r) => r.href !== pathname)].slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [pathname]);

  // Global keyboard shortcuts
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!e.metaKey && !e.ctrlKey) return;
    // Skip if user is typing in an input
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
    const map: Record<string, string> = {
      d: '/dashboard',
      i: '/dashboard/invoices',
      u: '/dashboard/customers',
      b: '/dashboard/bank',
      j: '/dashboard/journal',
      r: '/dashboard/reports',
    };
    const target = map[e.key.toLowerCase()];
    if (target) {
      e.preventDefault();
      router.push(target);
    }
  }, [router]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  function toggleSection(label: string) {
    setCollapsed((c) => {
      const next = { ...c, [label]: !c[label] };
      if (typeof window !== 'undefined') localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function logout() {
    if (!confirm('Odhlásiť sa?')) return;
    const sb = createClient();
    await sb.auth.signOut();
    localStorage.removeItem('zolo_firm');
    router.push('/login');
    router.refresh();
  }

  function selectFirm(id: string) {
    setCurrentFirmId(id);
    localStorage.setItem('zolo_firm', id);
    router.refresh();
  }

  const currentSegment = segment || '';

  return (
    <aside className="sidebar-aside bg-zinc-950 text-zinc-300 flex flex-col h-screen md:sticky md:top-0 border-r border-white/[0.06] md:!w-auto md:!z-auto hidden md:flex">
      {/* Header — logo + firm + search */}
      <div className="px-3 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white text-zinc-900 flex items-center justify-center font-black text-base tracking-tight">
              Z
            </div>
            <div className="leading-none">
              <div className="font-semibold text-white text-[15px] tracking-tight">ZOLO</div>
            </div>
          </div>
          <NotificationBell />
        </div>

        <button
          onClick={() => router.push('/dashboard/search')}
          className="w-full flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg px-2.5 py-2 text-[13px] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Search size={13} strokeWidth={2.2} />
          <span className="flex-1 text-left">Hľadať</span>
          <span className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded font-mono text-zinc-400">⌘K</span>
        </button>

        <div className="relative">
          <select
            value={currentFirmId}
            onChange={(e) => selectFirm(e.target.value)}
            className="w-full appearance-none bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg pl-2.5 pr-7 py-2 text-[13px] text-zinc-200 font-medium cursor-pointer outline-none transition-colors"
          >
            <option value="" className="bg-zinc-900">Všetky firmy ({companies.length})</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id} className="bg-zinc-900">
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 [&_a]:block [&_a]:text-current scrollbar-thin">
        {recent.length > 0 && (
          <div className="mb-1">
            <div className="px-2.5 pt-3 pb-1.5 text-[10px] uppercase font-semibold text-zinc-500 tracking-[0.1em]">
              Naposledy
            </div>
            <div className="space-y-px">
              {recent.map((r) => (
                <button
                  key={r.href}
                  onClick={() => router.push(r.href)}
                  className="w-full flex items-center gap-2 px-2.5 py-1 rounded-md text-[12px] text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200 transition-colors"
                >
                  <Clock size={11} className="text-zinc-600 flex-shrink-0" />
                  <span className="truncate text-left">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {SECTIONS.map((section) => {
          const isCollapsed = collapsed[section.label];
          // Module gating: skryť sekciu ak firma nemá aktivovaný modul
          const requiredModule = SECTION_MODULES[section.label];
          const activeCompany = companies.find((c) => c.id === currentFirmId) || companies[0];
          const isLocked = requiredModule && activeCompany?.enabled_modules && !hasModule(activeCompany.enabled_modules, requiredModule as Module);
          return (
            <div key={section.label} className="mb-1">
              <button
                onClick={() => toggleSection(section.label)}
                className={`w-full px-2.5 pt-3 pb-1.5 flex items-center justify-between text-[10px] uppercase font-semibold tracking-[0.1em] transition-colors ${
                  isLocked ? 'text-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {section.label}
                  {isLocked && <span className="text-[9px] text-zinc-600 normal-case tracking-normal">🔒</span>}
                </span>
                <ChevronDown
                  size={10}
                  className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                />
              </button>
              {!isCollapsed && !isLocked && (
                <div className="space-y-px">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.href}
                      icon={item.icon}
                      label={item.label}
                      href={item.href}
                      active={item.segments.includes(currentSegment)}
                      beta={item.beta}
                      shortcut={item.shortcut}
                      children={item.children}
                      currentSegment={currentSegment}
                    />
                  ))}
                </div>
              )}
              {!isCollapsed && isLocked && (
                <button
                  onClick={() => router.push('/dashboard/settings/subscription')}
                  className="w-full text-left px-2.5 py-2 mx-1 rounded-md text-[11px] text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                >
                  Upgradovať pre prístup →
                </button>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer — primary action + user */}
      <div className="border-t border-white/[0.06] p-2 space-y-1.5">
        <button
          onClick={() => router.push('/dashboard/invoices/new')}
          className="w-full bg-white text-zinc-900 hover:bg-zinc-100 font-semibold rounded-lg py-2 flex items-center justify-center gap-2 text-[13px] tracking-tight transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} /> Nová faktúra
        </button>
        <div className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500 text-zinc-900 flex items-center justify-center font-bold text-[11px]">
            {(userEmail[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[12px] text-zinc-200 font-medium truncate">{userEmail}</div>
            <div className="text-[10px] text-zinc-500 flex items-center gap-1">
              <span className="w-1 h-1 bg-emerald-400 rounded-full" /> online
            </div>
          </div>
          <button
            onClick={logout}
            className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded transition-colors"
            title="Odhlásiť"
          >
            <LogOut size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  icon: Icon,
  label,
  href,
  active,
  beta,
  shortcut,
  children,
  currentSegment,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  href: string;
  active?: boolean;
  beta?: boolean;
  shortcut?: string;
  children?: NavSubItem[];
  currentSegment?: string;
}) {
  const router = useRouter();
  const hasChildren = !!children && children.length > 0;
  const [expanded, setExpanded] = useState(!!active);

  useEffect(() => { if (active) setExpanded(true); }, [active]);

  function navigateOrToggle(e: React.MouseEvent) {
    if (hasChildren && e.altKey) {
      setExpanded((v) => !v);
      return;
    }
    if (hasChildren) setExpanded(true);
    router.push(href);
  }

  return (
    <>
      <button
        onClick={navigateOrToggle}
        className={`w-full group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
          active
            ? 'bg-white/[0.08] text-white font-medium'
            : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100 font-normal'
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-white rounded-r-full" />
        )}
        <Icon
          size={14}
          strokeWidth={active ? 2.2 : 1.8}
          className={active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}
        />
        <span className="flex-1 text-left tracking-tight">{label}</span>
        {shortcut && (
          <span className="hidden group-hover:inline text-[9px] bg-white/[0.06] text-zinc-400 px-1.5 py-0.5 rounded font-mono tracking-tight">
            {shortcut}
          </span>
        )}
        {beta && (
          <span className="text-[9px] uppercase tracking-wider bg-white/[0.08] text-zinc-300 px-1.5 py-0.5 rounded font-semibold">
            Beta
          </span>
        )}
        {hasChildren && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded transition-colors cursor-pointer"
          >
            <ChevronDown size={11} className={`transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`} />
          </span>
        )}
      </button>
      {hasChildren && expanded && (
        <div className="ml-[26px] mt-0.5 mb-1.5 pl-3 border-l border-white/[0.04] space-y-0">
          {children!.map((sub) => (
            <NavSubLink key={sub.href} label={sub.label} href={sub.href} currentSegment={currentSegment} />
          ))}
        </div>
      )}
    </>
  );
}

function NavSubLink({ label, href, currentSegment }: { label: string; href: string; currentSegment?: string }) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(href, window.location.origin);
    const onSegment = url.pathname.includes(`/dashboard/${currentSegment}`) || (currentSegment === '' && url.pathname === '/dashboard');
    const qsMatch = url.search === window.location.search;
    setIsActive(onSegment && qsMatch);
  }, [href, currentSegment]);

  return (
    <button
      onClick={() => router.push(href)}
      className={`relative w-full text-left pl-2.5 pr-2 py-1 rounded-md text-[12.5px] tracking-tight transition-colors ${
        isActive
          ? 'text-white font-medium'
          : 'text-zinc-500 hover:text-zinc-200'
      }`}
    >
      {isActive && (
        <span className="absolute left-[-13px] top-1/2 -translate-y-1/2 h-3 w-0.5 bg-white rounded-r-full" />
      )}
      {label}
    </button>
  );
}
