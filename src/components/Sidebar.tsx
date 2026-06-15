'use client';

import {
  LayoutDashboard,
  FileText,
  Clock,
  Edit3,
  Target,
  Code,
  Book,
  Building2,
  Wallet,
  Boxes,
  Plane,
  Receipt,
  Archive,
  Users,
  Tag,
  Link2,
  Settings,
  Calendar,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Repeat,
  History,
  Send,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  Briefcase,
  CreditCard,
} from 'lucide-react';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Company = {
  id: string;
  name: string;
  ico: string | null;
  dic: string | null;
  ic_dph: string | null;
  is_vat_payer: boolean | null;
};

export default function Sidebar({ companies, userEmail }: { companies: Company[]; userEmail: string }) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const [currentFirmId, setCurrentFirmId] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('zolo_firm') || '' : ''
  );

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

  return (
    <aside className="bg-slate-950 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-white/5">
      <div className="p-3.5 pb-3 border-b border-white/5 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-blue-500/40">
            Z
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-white text-sm">ZOLO</div>
            <div className="text-[10px] text-slate-500">Tax & Accounting</div>
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-2 space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            <span>Firma</span>
          </div>
          <select
            value={currentFirmId}
            onChange={(e) => selectFirm(e.target.value)}
            className="w-full bg-transparent text-slate-100 text-sm font-medium border-none outline-none cursor-pointer appearance-none"
          >
            <option value="" className="bg-slate-900">Všetky firmy ({companies.length})</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          className="w-full bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg px-2.5 py-2 flex items-center gap-2 text-slate-400 text-xs"
          onClick={() => router.push('/dashboard/search')}
        >
          <Search size={13} />
          <span className="flex-1 text-left">Hľadať…</span>
          <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded font-mono">⌘K</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 [&_a]:block [&_a]:text-current">
        <Section label="Prehľad & fakturácia" />
        <NavItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" active={!segment} />
        <NavItem icon={FileText} label="Fakturácia" href="/dashboard/invoices" active={segment === 'invoices'} />
        <NavItem icon={FileText} label="Cenové ponuky" href="/dashboard/quotes" active={segment === 'quotes'} />
        <NavItem icon={Clock} label="Schvaľovanie" href="/dashboard/approvals" active={segment === 'approvals'} />
        <NavItem icon={Clock} label="Pohľadávky" href="/dashboard/receivables" active={segment === 'receivables'} />
        <NavItem icon={TrendingUp} label="Cash flow 90d" href="/dashboard/cashflow" active={segment === 'cashflow'} />
        <NavItem icon={BarChart3} label="Reporty" href="/dashboard/reports" active={segment === 'reports'} />
        <NavItem icon={Link2} label="Prepojenia" href="/dashboard/links" active={segment === 'links'} />

        <Section label="DPH" />
        <NavItem icon={Edit3} label="Zadávanie DPH" href="/dashboard/vat" active={segment === 'vat'} />
        <NavItem icon={Target} label="Optimalizácia" href="/dashboard/optimize" active={segment === 'optimize'} />
        <NavItem icon={Code} label="DP DPH — priznanie" href="/dashboard/vat-return" active={segment === 'vat-return'} />
        <NavItem icon={Code} label="Kontrolný výkaz (KV)" href="/dashboard/control-statement" active={segment === 'control-statement'} />
        <NavItem icon={Code} label="Súhrnný výkaz (SV)" href="/dashboard/summary-statement" active={segment === 'summary-statement'} />
        <NavItem icon={History} label="História podaní" href="/dashboard/tax-returns" active={segment === 'tax-returns'} />

        <Section label="Podanie" />
        <NavItem icon={Send} label="eDane" href="/dashboard/edane" active={segment === 'edane'} />
        <NavItem icon={ShoppingBag} label="eKasa" href="/dashboard/ekasa" active={segment === 'ekasa'} />
        <NavItem icon={Calendar} label="Daňový kalendár" href="/dashboard/calendar" active={segment === 'calendar'} />

        <Section label="Denné účtovníctvo" />
        <NavItem icon={Book} label="Denník & hlavná kniha" href="/dashboard/journal" active={segment === 'journal'} />
        <NavItem icon={Book} label="Účtová osnova" href="/dashboard/chart-of-accounts" active={segment === 'chart-of-accounts'} />
        <NavItem icon={Wallet} label="Pokladnica" href="/dashboard/cash-book" active={segment === 'cash-book'} />
        <NavItem icon={CreditCard} label="Bankové účty" href="/dashboard/bank-accounts" active={segment === 'bank-accounts'} />
        <NavItem icon={Briefcase} label="Projekty" href="/dashboard/projects" active={segment === 'projects'} />
        <NavItem icon={Target} label="Nákladové strediská" href="/dashboard/cost-centers" active={segment === 'cost-centers'} />
        <NavItem icon={Building2} label="Majetok" href="/dashboard/assets" active={segment === 'assets'} />
        <NavItem icon={Wallet} label="Mzdy" href="/dashboard/payroll" active={segment === 'payroll'} beta />
        <NavItem icon={Boxes} label="Sklady" href="/dashboard/stock" active={segment === 'stock'} />
        <NavItem icon={Boxes} label="Skladové pohyby" href="/dashboard/stock-movements" active={segment === 'stock-movements'} />
        <NavItem icon={Plane} label="Cestovné príkazy" href="/dashboard/travel" active={segment === 'travel'} />

        <Section label="Koncoročné" />
        <NavItem icon={Receipt} label="Daň z príjmov" href="/dashboard/income-tax" active={segment === 'income-tax'} />
        <NavItem icon={Archive} label="Závierka & podanie" href="/dashboard/closing" active={segment === 'closing'} />

        <Section label="Číselníky" />
        <NavItem icon={Users} label="Zákazníci" href="/dashboard/customers" active={segment === 'customers'} />
        <NavItem icon={Tag} label="Cenník" href="/dashboard/products" active={segment === 'products'} />

        <Section label="Import & nástroje" />
        <NavItem icon={Sparkles} label="AI Vision import" href="/dashboard/import" active={segment === 'import'} />
        <NavItem icon={Wallet} label="Bankový výpis" href="/dashboard/bank" active={segment === 'bank'} />
        <NavItem icon={Repeat} label="Recurring faktúry" href="/dashboard/recurring" active={segment === 'recurring'} />

        <Section label="Systém" />
        <NavItem icon={Users} label="Tím & pozvánky" href="/dashboard/team" active={segment === 'team'} />
        <NavItem icon={History} label="Audit log" href="/dashboard/audit" active={segment === 'audit'} />
        <NavItem icon={Settings} label="Nastavenia" href="/dashboard/settings" active={segment === 'settings'} />
      </nav>

      <div className="border-t border-white/5 bg-black/15 p-2 space-y-1.5">
        <button
          onClick={() => router.push('/dashboard/invoices/new')}
          className="w-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 hover:text-white font-semibold rounded-md py-2 flex items-center justify-center gap-2 text-xs"
        >
          <Plus size={14} /> Nový doklad
        </button>
        <div className="flex items-center gap-2 px-2 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
            {(userEmail[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-xs text-slate-200 font-medium truncate">{userEmail}</div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> Cloud · synced
            </div>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-white p-1.5 rounded" title="Odhlásiť">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Section({ label }: { label: string }) {
  return (
    <div className="px-2.5 pt-3 pb-1 text-[10px] uppercase tracking-wider text-slate-600 font-semibold first:pt-1">
      {label}
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  active,
  beta,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  href: string;
  active?: boolean;
  beta?: boolean;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
        active
          ? 'bg-blue-500/20 text-white font-semibold shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]'
          : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
      }`}
    >
      <Icon size={15} className={active ? 'opacity-100 text-blue-400' : 'opacity-70'} />
      <span className="flex-1 text-left">{label}</span>
      {beta && (
        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">BETA</span>
      )}
    </button>
  );
}
