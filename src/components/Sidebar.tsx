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
  CircleDollarSign,
  Banknote,
  ClipboardList,
  Clock,
  Percent,
  FileSpreadsheet,
  Globe,
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
} from 'lucide-react';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type Company = {
  id: string;
  name: string;
  ico: string | null;
  dic: string | null;
  ic_dph: string | null;
  is_vat_payer: boolean | null;
};

type NavItemDef = {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  href: string;
  segments: string[];
  beta?: boolean;
};

type NavSection = {
  label: string;
  items: NavItemDef[];
};

const SECTIONS: NavSection[] = [
  {
    label: 'Prehľad',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', segments: [''] },
    ],
  },
  {
    label: 'Predaj',
    items: [
      { icon: FileText, label: 'Faktúry', href: '/dashboard/invoices', segments: ['invoices'] },
      { icon: ReceiptText, label: 'Ponuky', href: '/dashboard/quotes', segments: ['quotes'] },
      { icon: Repeat, label: 'Opakované', href: '/dashboard/recurring', segments: ['recurring'] },
      { icon: Users, label: 'Zákazníci', href: '/dashboard/customers', segments: ['customers'] },
      { icon: Tag, label: 'Cenník', href: '/dashboard/products', segments: ['products'] },
    ],
  },
  {
    label: 'Financie',
    items: [
      { icon: Landmark, label: 'Banka', href: '/dashboard/bank', segments: ['bank'] },
      { icon: TrendingUp, label: 'Cashflow', href: '/dashboard/cashflow', segments: ['cashflow'] },
      { icon: Wallet, label: 'Pokladnica', href: '/dashboard/cash-book', segments: ['cash-book'] },
      { icon: Banknote, label: 'Účty', href: '/dashboard/bank-accounts', segments: ['bank-accounts'] },
      { icon: Clock, label: 'Pohľadávky', href: '/dashboard/receivables', segments: ['receivables'] },
      { icon: ClipboardList, label: 'Schvaľovanie', href: '/dashboard/approvals', segments: ['approvals'] },
    ],
  },
  {
    label: 'DPH',
    items: [
      { icon: Percent, label: 'Zápisy', href: '/dashboard/vat', segments: ['vat'] },
      { icon: FileSpreadsheet, label: 'Priznanie', href: '/dashboard/vat-return', segments: ['vat-return'] },
      { icon: FileSpreadsheet, label: 'KV DPH', href: '/dashboard/control-statement', segments: ['control-statement'] },
      { icon: Globe, label: 'SV DPH', href: '/dashboard/summary-statement', segments: ['summary-statement'] },
      { icon: Target, label: 'Optimalizácia', href: '/dashboard/optimize', segments: ['optimize'] },
    ],
  },
  {
    label: 'Účtovníctvo',
    items: [
      { icon: BookOpen, label: 'Denník', href: '/dashboard/journal', segments: ['journal'] },
      { icon: Library, label: 'Osnova', href: '/dashboard/chart-of-accounts', segments: ['chart-of-accounts'] },
      { icon: Briefcase, label: 'Projekty', href: '/dashboard/projects', segments: ['projects'] },
      { icon: LayoutGrid, label: 'Strediská', href: '/dashboard/cost-centers', segments: ['cost-centers'] },
      { icon: PiggyBank, label: 'Majetok', href: '/dashboard/assets', segments: ['assets'] },
      { icon: Boxes, label: 'Sklady', href: '/dashboard/stock', segments: ['stock', 'stock-movements'] },
      { icon: HardHat, label: 'Mzdy', href: '/dashboard/payroll', segments: ['payroll'], beta: true },
      { icon: Plane, label: 'Cestovné', href: '/dashboard/travel', segments: ['travel'] },
    ],
  },
  {
    label: 'Podania a koniec roka',
    items: [
      { icon: Send, label: 'eDane', href: '/dashboard/edane', segments: ['edane'] },
      { icon: ShoppingBag, label: 'eKasa', href: '/dashboard/ekasa', segments: ['ekasa'] },
      { icon: CalendarDays, label: 'Kalendár', href: '/dashboard/calendar', segments: ['calendar'] },
      { icon: History, label: 'História', href: '/dashboard/tax-returns', segments: ['tax-returns'] },
      { icon: Coins, label: 'Daň z príjmov', href: '/dashboard/income-tax', segments: ['income-tax'] },
      { icon: Archive, label: 'Závierka', href: '/dashboard/closing', segments: ['closing'] },
    ],
  },
  {
    label: 'Reporty a nástroje',
    items: [
      { icon: BarChart3, label: 'Reporty', href: '/dashboard/reports', segments: ['reports'] },
      { icon: Sparkles, label: 'AI Import', href: '/dashboard/import', segments: ['import'], beta: true },
      { icon: Link2, label: 'Prepojenia', href: '/dashboard/links', segments: ['links'] },
    ],
  },
  {
    label: 'Účet',
    items: [
      { icon: Users2, label: 'Tím', href: '/dashboard/team', segments: ['team'] },
      { icon: ShieldCheck, label: 'Bezpečnosť', href: '/dashboard/settings/security', segments: [] },
      { icon: Activity, label: 'Audit', href: '/dashboard/audit', segments: ['audit'] },
      { icon: HelpCircle, label: 'Pomoc', href: '/dashboard/help', segments: ['help'] },
      { icon: SettingsIcon, label: 'Nastavenia', href: '/dashboard/settings', segments: ['settings'] },
    ],
  },
];

const COLLAPSED_KEY = 'zolo_sidebar_collapsed';

export default function Sidebar({ companies, userEmail }: { companies: Company[]; userEmail: string }) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const [currentFirmId, setCurrentFirmId] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') || '' : ''
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      if (raw) setCollapsed(JSON.parse(raw));
    } catch {}
  }, []);

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
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-lg bg-white text-zinc-900 flex items-center justify-center font-black text-base tracking-tight">
            Z
          </div>
          <div className="leading-none">
            <div className="font-semibold text-white text-[15px] tracking-tight">ZOLO</div>
          </div>
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
        {SECTIONS.map((section) => {
          const isCollapsed = collapsed[section.label];
          return (
            <div key={section.label} className="mb-1">
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full px-2.5 pt-3 pb-1.5 flex items-center justify-between text-[10px] uppercase font-semibold text-zinc-500 hover:text-zinc-300 tracking-[0.1em] transition-colors"
              >
                <span>{section.label}</span>
                <ChevronDown
                  size={10}
                  className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                />
              </button>
              {!isCollapsed && (
                <div className="space-y-px">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.href}
                      icon={item.icon}
                      label={item.label}
                      href={item.href}
                      active={item.segments.includes(currentSegment)}
                      beta={item.beta}
                    />
                  ))}
                </div>
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
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  href: string;
  active?: boolean;
  beta?: boolean;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
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
      {beta && (
        <span className="text-[9px] uppercase tracking-wider bg-white/[0.08] text-zinc-300 px-1.5 py-0.5 rounded font-semibold">
          Beta
        </span>
      )}
    </button>
  );
}
